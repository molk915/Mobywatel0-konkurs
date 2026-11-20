import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const source = await readFile(
  new URL("../dist/sw.js", import.meta.url),
  "utf8",
);
function worker() {
  const handlers = {},
    cache = new Map();
  let claimed = false;
  const caches = {
    open: async () => ({
      addAll: async (paths) =>
        paths.forEach((path) =>
          cache.set(path, new Response("cached:" + path)),
        ),
    }),
    keys: async () => [],
    delete: async () => true,
    match: async (request) =>
      cache
        .get(
          typeof request === "string" ? request : new URL(request.url).pathname,
        )
        ?.clone(),
  };
  const self = {
    location: { origin: "http://localhost:4173" },
    addEventListener: (name, fn) => (handlers[name] = fn),
    skipWaiting: async () => {},
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
  };
  vm.runInNewContext(source, {
    self,
    caches,
    Response,
    URL,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  return { handlers, cache, claimed: () => claimed };
}
test("service worker precaches the built app and activates", async () => {
  const w = worker();
  let promise;
  w.handlers.install({ waitUntil: (p) => (promise = p) });
  await promise;
  assert.ok(w.cache.has("/"));
  assert.ok(w.cache.has("/index.html"));
  assert.ok(w.cache.has("/manifest.webmanifest"));
  assert.ok(w.cache.has("/icon-512.png"));
  w.handlers.activate({ waitUntil: (p) => (promise = p) });
  await promise;
  assert.equal(w.claimed(), true);
});
test("cached navigation resolves with no network; unknown navigation gets app shell", async () => {
  const w = worker();
  let promise;
  w.handlers.install({ waitUntil: (p) => (promise = p) });
  await promise;
  for (const path of ["/", "/unknown"]) {
    w.handlers.fetch({
      request: {
        method: "GET",
        url: "http://localhost:4173" + path,
        mode: "navigate",
      },
      respondWith: (p) => (promise = p),
    });
    const response = await promise;
    assert.match(await response.text(), /cached:\/(index.html)?/);
  }
});
test("service worker never caches or intercepts AI API requests", () => {
  const w = worker();
  let intercepted = false;
  w.handlers.fetch({
    request: {
      method: "GET",
      url: "http://localhost:4173/api/assistant",
      mode: "cors",
    },
    respondWith: () => (intercepted = true),
  });
  assert.equal(intercepted, false);
});
