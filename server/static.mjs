import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

const contentTypes = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  webmanifest: "application/manifest+json",
  woff2: "font/woff2",
  txt: "text/plain; charset=utf-8",
};

export function serveBuild(directory) {
  const root = resolve(directory);
  return async (req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) return false;
    const pathname = req.url.split("?", 1)[0];
    if (pathname.startsWith("/api/")) return false;
    const file = resolve(root, pathname === "/" ? "index.html" : "." + pathname);
    if (!file.startsWith(root + sep)) return false;
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) return false;
    res.writeHead(200, {
      "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      "Content-Type": contentTypes[file.split(".").pop()] ?? "application/octet-stream",
      "Content-Length": info.size,
      "Content-Security-Policy": "frame-ancestors 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else {
      const stream = createReadStream(file);
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
    }
    return true;
  };
}
