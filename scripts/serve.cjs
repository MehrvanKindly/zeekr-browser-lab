"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../site");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const target = path.resolve(root, "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname));
  if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(target, (error, data) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (error) { res.writeHead(404); res.end("Not found"); return; }
    res.setHeader("Content-Type", types[path.extname(target)] || "application/octet-stream");
    res.writeHead(200); res.end(data);
  });
}).listen(4173, "127.0.0.1", () => console.log("Browser Lab preview: http://127.0.0.1:4173"));

