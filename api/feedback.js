// Vercel Serverless Function: POST /api/feedback
// Menerima feedback dari aplikasi Nao MD lalu meneruskannya ke channel Discord
// lewat webhook. URL webhook disimpan di Environment Variable Vercel
// (DISCORD_WEBHOOK_URL), jadi tidak pernah ikut ke dalam APK / repo.

const TYPES = {
  feedback: { label: "💬 Feedback", color: 0x5865f2 },
  saran: { label: "💡 Saran", color: 0xfee75c },
  bug: { label: "🐞 Lapor Bug", color: 0xed4245 },
  error: { label: "⚠️ Lapor Error", color: 0xe67e22 },
};

const MAX_MESSAGE = 1500;
const MAX_CONTACT = 100;
const RATE_LIMIT_MS = 30 * 1000; // 1 laporan / 30 detik per IP (best-effort)
const lastSeen = new Map();

function clean(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/@(everyone|here)/gi, "@\u200b$1") // cegah mention massal
    .trim()
    .slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return res.status(500).json({ ok: false, error: "Server belum dikonfigurasi" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  // Honeypot sederhana untuk bot.
  if (body.website) return res.status(200).json({ ok: true });

  const message = clean(body.message, MAX_MESSAGE);
  if (message.length < 5) {
    return res.status(400).json({ ok: false, error: "Pesan terlalu pendek" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  if (now - (lastSeen.get(ip) || 0) < RATE_LIMIT_MS) {
    return res.status(429).json({ ok: false, error: "Terlalu cepat, coba lagi sebentar" });
  }
  lastSeen.set(ip, now);
  if (lastSeen.size > 500) {
    for (const [k, t] of lastSeen) if (now - t > RATE_LIMIT_MS) lastSeen.delete(k);
  }

  const type = TYPES[body.type] ? body.type : "feedback";
  const meta = TYPES[type];
  const contact = clean(body.contact, MAX_CONTACT);
  const appVersion = clean(body.appVersion, 20) || "-";
  const device = clean(body.device, 80) || "-";
  const android = clean(body.android, 30) || "-";

  const payload = {
    username: "Nao MD Feedback",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: meta.label,
        description: message,
        color: meta.color,
        fields: [
          { name: "Versi App", value: appVersion, inline: true },
          { name: "Perangkat", value: device, inline: true },
          { name: "Android", value: android, inline: true },
          { name: "Kontak", value: contact || "-", inline: false },
        ],
        footer: { text: "Dikirim dari aplikasi Nao MD" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("Discord webhook gagal:", r.status);
      return res.status(502).json({ ok: false, error: "Gagal meneruskan ke Discord" });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ ok: false, error: "Gagal menghubungi Discord" });
  }
};
