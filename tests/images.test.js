import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateImage, MAX_IMAGE_BYTES } from "../server/images.js";
import { openDB, seed, postSale } from "../server/db.js";
const png = (w = 80, h = 60) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#dcece2" } })
    .png()
    .toBuffer();
test("valid product image is re-encoded as static WebP without EXIF", async () => {
  const original = await sharp(await png())
    .withMetadata()
    .png()
    .toBuffer();
  assert.ok((await sharp(original).metadata()).exif);
  const result = await validateImage(original, "image/png");
  const meta = await sharp(result.bytes).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 80);
  assert.equal(meta.height, 60);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
});
test("oversized dimensions, small dimensions and upload byte limit are enforced", async () => {
  await assert.rejects(
    () => validateImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/png"),
    (e) => e.status === 413,
  );
  await assert.rejects(
    async () => validateImage(await png(31, 60), "image/png"),
    /dimensions/,
  );
  await assert.rejects(
    async () => validateImage(await png(4097, 32), "image/png"),
    /dimensions/,
  );
});
test("unsafe MIME, disguised image content and corrupted files are rejected", async () => {
  await assert.rejects(
    () =>
      validateImage(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        "image/svg+xml",
      ),
    (e) => e.status === 415,
  );
  await assert.rejects(
    async () => validateImage(await png(), "image/jpeg"),
    /contents/,
  );
  await assert.rejects(
    () => validateImage(Buffer.from("not an image"), "image/png"),
    /damaged/,
  );
  await assert.rejects(
    () => validateImage(Buffer.alloc(0), "image/png"),
    /Choose/,
  );
});
test("large images shrink safely while preserving their aspect ratio", async () => {
  const out = await validateImage(await png(3200, 1200), "image/png");
  assert.equal(out.width, 1600);
  assert.equal(out.height, 600);
});
test("migration adds images without altering posted invoices, stock or existing users", () => {
  const dir = mkdtempSync(join(tmpdir(), "smartmed-migration-"));
  const file = join(dir, "demo.sqlite");
  let db = openDB(file);
  try {
    seed(db);
    const user = { id: 1, pharmacy_id: 1, role: "owner" };
    postSale(db, user, {
      requestId: crypto.randomUUID(),
      items: [{ productId: 1, quantity: 1, unit: "unit" }],
      paid: 450,
      method: "cash",
    });
    const invoices = db.prepare("SELECT * FROM invoices").all();
    const batches = db.prepare("SELECT * FROM batches").all();
    const users = db.prepare("SELECT id,name,role FROM users").all();
    db.exec(
      "DROP TABLE product_images; DELETE FROM migrations WHERE version=3;",
    );
    db.close();
    db = openDB(file);
    assert.deepEqual(db.prepare("SELECT * FROM invoices").all(), invoices);
    assert.deepEqual(db.prepare("SELECT * FROM batches").all(), batches);
    assert.deepEqual(db.prepare("SELECT id,name,role FROM users").all(), users);
    assert.equal(
      db.prepare("SELECT count(*) n FROM product_images").get().n,
      0,
    );
    assert.equal(
      db.prepare("SELECT version FROM migrations WHERE version=3").get()
        .version,
      3,
    );
    db.close();
    db = openDB(file);
    assert.equal(db.prepare("SELECT count(*) n FROM invoices").get().n, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
