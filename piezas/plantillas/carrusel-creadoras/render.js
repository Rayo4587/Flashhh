const { chromium } = require('playwright'); const path=require('path');
(async()=>{const sc=+(process.argv[2]||1), out=process.argv[3];const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:sc});
for(let i=1;i<=12;i++){const n=String(i).padStart(2,'0');
 await p.goto('file://'+path.resolve(__dirname,`s${n}.html`));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);
 await p.screenshot({path:path.join(out,`creadoras-${n}.png`)});}
await b.close();})();
