import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function list(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const parts = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? list(dir + "/" + e.name) : [dir + "/" + e.name],
    ),
  );
  return parts.flat();
}
const files = (await list("dist"))
  .filter((f) => !f.endsWith("sw.js"))
  .map((f) => "/" + f.slice(5))
  .sort();
const cacheHash = createHash("sha256");
for (const file of files) {
  const digest = createHash("sha256").update(await readFile("dist" + file)).digest("hex");
  cacheHash.update(file + "\0" + digest);
}
const version = cacheHash.digest("hex").slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE='mobywatel-${version}';const FILES=${JSON.stringify(["/", ...files])};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mobywatel-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.url.includes('/api/'))return;e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('/index.html'):Response.error())))});
`,
);
console.log("PWA service worker: " + files.length + " files, cache " + version);
