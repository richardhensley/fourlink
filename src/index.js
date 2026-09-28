import { EmailMessage } from "cloudflare:email";

const FROM = "feedback@fourlink.org";
const TO = "rhensley99@msn.com";
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// UTF-8 text as base64, wrapped at 76 columns for MIME.
function b64(text) {
  let s = "";
  for (const byte of new TextEncoder().encode(text)) s += String.fromCharCode(byte);
  return btoa(s).replace(/.{76}/g, "$&\r\n");
}

async function feedback(request, env) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const { email = "", message = "", yaml = "", website = "" } = await request.json().catch(() => ({}));
  // Honeypot: hidden field only bots fill in. Pretend success.
  if (website) return new Response(null, { status: 204 });
  if (!EMAIL_RE.test(email) || email.length > 200 || !message.trim() || message.length > 10000 || yaml.length > 100000)
    return new Response("Invalid feedback", { status: 400 });
  const boundary = crypto.randomUUID();
  const parts = [
    `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(`From: ${email}\r\n\r\n${message}`)}`,
    yaml && `--${boundary}\r\nContent-Type: text/yaml; charset=utf-8; name="fourlink.yaml"\r\nContent-Disposition: attachment; filename="fourlink.yaml"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(yaml)}`,
  ].filter(Boolean);
  const raw = [
    `From: fourlink feedback <${FROM}>`,
    `To: ${TO}`,
    `Reply-To: ${email}`,
    `Subject: fourlink feedback from ${email}`,
    `Message-ID: <${crypto.randomUUID()}@fourlink.org>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    ...parts,
    `--${boundary}--`,
    "",
  ].join("\r\n");
  await env.FEEDBACK.send(new EmailMessage(FROM, TO, raw));
  return new Response(null, { status: 204 });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/feedback") return feedback(request, env);
    if (path !== "/api/hit") return env.ASSETS.fetch(request);
    const cf = request.cf ?? {};
    const body = await request.text();
    let hit;
    try { hit = JSON.parse(body); } catch { hit = { ref: body }; }
    const last = Number(hit?.last);
    console.log({
      returning: last > 0,
      daysSinceLast: last > 0 ? Math.floor((Date.now() - last) / 86400000) : null,
      country: cf.country,
      city: cf.city,
      region: cf.region,
      regionCode: cf.regionCode,
      timezone: cf.timezone,
      referrer: String(hit?.ref ?? "").slice(0, 500) || null,
      userAgent: request.headers.get("user-agent"),
    });
    return new Response(null, { status: 204 });
  },
};
