import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png"
};

function send(res, status, file, headers = {}) {
  const ext = path.extname(file);
  res.writeHead(status, {
    "Content-Type": types[ext] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const file = path.resolve(root, `.${pathname}`);

  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    send(res, 200, path.join(root, "index.html"), { "Cache-Control": "no-cache" });
    return;
  }

  const immutable = /\.(?:css|js|svg|png)$/.test(file);
  const cacheControl = immutable ? "public, max-age=31536000, immutable" : "no-cache";
  send(res, 200, file, { "Cache-Control": cacheControl });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Spectrum Tokens running at http://127.0.0.1:${port}/`);
});
