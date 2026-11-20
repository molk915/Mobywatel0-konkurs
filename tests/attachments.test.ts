import test from "node:test";
import assert from "node:assert/strict";
import { saveAttachment } from "../src/attachments.ts";
test("attachments reject oversized files before touching persistent storage", async () => {
  await assert.rejects(
    saveAttachment(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf"),
    ),
    /5 MB/,
  );
});
test("attachments reject executable and HTML files", async () => {
  await assert.rejects(
    saveAttachment(new File(["demo"], "unsafe.html")),
    /PDF, TXT, JPG lub PNG/,
  );
});
