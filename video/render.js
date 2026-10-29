// Renderiza la escena cuadro a cuadro en Chromium headless y codifica con ffmpeg.
//   node render.js                      -> build/video_silent.mp4 (todos los cuadros)
//   node render.js --stills 1.5,6,10    -> build/stills/*.jpg (cuadros sueltos para revisar)
//   node render.js --from 9 --to 11     -> solo un tramo (build/video_9-11.mp4)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright viene preinstalado globalmente en el entorno (NODE_PATH); si no, instálalo con npm.
const { chromium } = createRequire(import.meta.url)('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BUILD = path.join(HERE, 'build');
const TL = JSON.parse(fs.readFileSync(path.join(HERE, 'timeline.json'), 'utf8'));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) =>
  a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : acc, []));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.otf': 'font/otf', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: TL.width, height: TL.height } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${base}/video/scene/index.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
const stage = await page.$('#stage');

async function frame(t) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  return stage.screenshot({ type: 'jpeg', quality: 94 });
}

fs.mkdirSync(BUILD, { recursive: true });
if (args.stills) {
  const dir = path.join(BUILD, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of String(args.stills).split(',').map(Number)) {
    // precalienta 6 cuadros para que las estelas se vean como en el render final
    for (let k = 6; k > 0; k--) await page.evaluate((tt) => window.renderFrame(tt), s - k / TL.fps);
    fs.writeFileSync(path.join(dir, `${s.toFixed(2).padStart(5, '0')}.jpg`), await frame(s));
    console.log('still', s);
  }
} else {
  const from = Number(args.from ?? 0), to = Number(args.to ?? TL.duration);
  const out = path.join(BUILD, args.from || args.to ? `video_${from}-${to}.mp4` : 'video_silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * TL.fps), n1 = Math.round(to * TL.fps);
  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    const buf = await frame(n / TL.fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (n % 30 === 0) console.log(`frame ${n}/${n1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('ok', out);
}
await browser.close();
server.close();
