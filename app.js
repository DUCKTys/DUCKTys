const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".apk": "application/vnd.android.package-archive",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(PUBLIC, relative);
  if (resolved !== PUBLIC && !resolved.startsWith(PUBLIC + path.sep)) return null;
  return resolved;
}

function send(res, status, body, contentType) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    // Local README endpoint: no browser CORS dependency and no external API.
    if (requestUrl.pathname === "/api/readme") {
      const file = path.join(PUBLIC, "credits", "DUCKTys_README.md");
      const body = fs.readFileSync(file, "utf8");
      return send(res, 200, body, "text/plain; charset=utf-8");
    }

    if (requestUrl.pathname === "/health") {
      return send(res, 200, JSON.stringify({ ok: true, service: "Nao MD website" }), "application/json; charset=utf-8");
    }

    const filePath = safePath(requestUrl.pathname);
    if (!filePath) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");

    let finalPath = filePath;
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
      finalPath = path.join(finalPath, "index.html");
    }

    if (!fs.existsSync(finalPath)) {
      return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }

    const stat = fs.statSync(finalPath);
    if (!stat.isFile()) {
      return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }

    const ext = path.extname(finalPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".apk" ? "public, max-age=3600" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(finalPath).pipe(res);
  } catch (error) {
    console.error(error);
    send(res, 500, "Internal server error", "text/plain; charset=utf-8");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nao MD website running on port ${PORT}`);
});
