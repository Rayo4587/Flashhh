import "server-only";
import nodemailer from "nodemailer";
import { POLICIES, SITE_NAME, siteUrl } from "./config";
import { formatCOP, formatDateTime } from "./format";
import type { Booking } from "./types";

function transporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(booking: Booking, durationMinutes: number) {
  const start = new Date(booking.starts_at);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ATC Wellness at the Club//Reservas//ES",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@wellnessattheclub.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(`${booking.class_name} · ATC`)}`,
    booking.location ? `LOCATION:${esc(booking.location)}` : "",
    `URL:${siteUrl()}/reserva/${booking.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export async function sendBookingConfirmation(opts: {
  to: string;
  name: string | null;
  phone: string | null;
  booking: Booking;
  durationMinutes: number;
}) {
  const t = transporter();
  if (!t) {
    console.warn("[email] SMTP no configurado: no se envió la confirmación de", opts.booking.id);
    return false;
  }

  const { booking } = opts;
  const when = formatDateTime(booking.starts_at);
  const price = formatCOP(booking.price_cop);
  const detailUrl = `${siteUrl()}/reserva/${booking.id}`;
  const hello = opts.name ? `Hola ${escapeHtml(opts.name.split(" ")[0])},` : "Hola,";

  const policiesHtml = POLICIES.map(
    (p) => `<li style="margin:0 0 8px"><strong>${escapeHtml(p.title)}:</strong> ${escapeHtml(p.text)}</li>`,
  ).join("");
  const policiesText = POLICIES.map((p) => `- ${p.title}: ${p.text}`).join("\n");

  const payButton = booking.payment_url
    ? `<p style="margin:24px 0"><a href="${escapeHtml(booking.payment_url)}" style="background:#3f4a3c;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Pagar con Mercado Pago</a></p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f6f2ec;font-family:Helvetica,Arial,sans-serif;color:#2b2a27">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="letter-spacing:.2em;font-size:12px;color:#7a6f5f;margin:0 0 4px">ATC</p>
    <h1 style="font-size:22px;margin:0 0 24px">Wellness at the Club</h1>
    <div style="background:#fff;border-radius:16px;padding:24px">
      <p style="margin:0 0 12px">${hello}</p>
      <p style="margin:0 0 16px">Tu cupo está reservado. Estos son los detalles de tu sesión:</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <tr><td style="padding:6px 0;color:#7a6f5f">Clase</td><td style="padding:6px 0;font-weight:600">${escapeHtml(booking.class_name)}</td></tr>
        <tr><td style="padding:6px 0;color:#7a6f5f">Fecha</td><td style="padding:6px 0;font-weight:600">${escapeHtml(when)}</td></tr>
        ${booking.location ? `<tr><td style="padding:6px 0;color:#7a6f5f">Lugar</td><td style="padding:6px 0">${escapeHtml(booking.location)}</td></tr>` : ""}
        ${price ? `<tr><td style="padding:6px 0;color:#7a6f5f">Valor</td><td style="padding:6px 0">${price}</td></tr>` : ""}
      </table>
      ${payButton}
      <p style="margin:0 0 4px;font-size:14px">Puedes ver o cancelar tu reserva aquí: <a href="${detailUrl}" style="color:#3f4a3c">${detailUrl}</a></p>
    </div>
    <h2 style="font-size:16px;margin:28px 0 12px">Políticas de ATC</h2>
    <ul style="padding-left:18px;font-size:14px;line-height:1.5;margin:0">${policiesHtml}</ul>
    <p style="font-size:12px;color:#7a6f5f;margin-top:28px">${escapeHtml(SITE_NAME)} · wellnessattheclub.com</p>
  </div></body></html>`;

  const text = `${opts.name ? `Hola ${opts.name},` : "Hola,"}

Tu cupo está reservado.
Clase: ${booking.class_name}
Fecha: ${when}
${booking.location ? `Lugar: ${booking.location}\n` : ""}${price ? `Valor: ${price}\n` : ""}${booking.payment_url ? `Pagar: ${booking.payment_url}\n` : ""}
Ver o cancelar: ${detailUrl}

Políticas de ATC
${policiesText}

${SITE_NAME}`;

  const from = process.env.EMAIL_FROM || `${SITE_NAME} <${process.env.SMTP_USER}>`;
  const admins = (process.env.ADMIN_NOTIFY_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await t.sendMail({
      from,
      to: opts.to,
      replyTo: admins[0],
      subject: `Reserva confirmada: ${booking.class_name} · ${when}`,
      text,
      html,
      icalEvent: { filename: "clase-atc.ics", method: "PUBLISH", content: buildIcs(booking, opts.durationMinutes) },
    });

    if (admins.length) {
      await t.sendMail({
        from,
        to: admins,
        subject: `Nueva reserva: ${booking.class_name} · ${when}`,
        text: `${opts.name ?? "(sin nombre)"} · ${opts.to}${opts.phone ? ` · ${opts.phone}` : ""}\n${booking.class_name}\n${when}\n${booking.location ?? ""}\n\nPanel: ${siteUrl()}/admin`,
      });
    }
    return true;
  } catch (err) {
    console.error("[email] Error enviando confirmación", err);
    return false;
  }
}
