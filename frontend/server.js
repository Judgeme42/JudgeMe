const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const ROOT = __dirname;
const backendHost = new URL(BACKEND_URL).host;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Proxy /api/* al backend
  if (url.pathname.startsWith("/api/")) {
    const proxyReq = http.request(
      BACKEND_URL + url.pathname + url.search,
      {
        method: req.method,
        headers: { ...req.headers, host: backendHost },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Backend no disponible" }));
    });
    req.pipe(proxyReq);
    return;
  }

  // Archivos estáticos
  let filePath = path.join(ROOT, decodeURIComponent(url.pathname));
  if (url.pathname === "/") filePath = path.join(ROOT, "index.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend en http://localhost:${PORT} (API -> ${BACKEND_URL})`);
});
