import express from "express";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { fail, transaction } from "./db.js";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const formats = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};
export async function validateImage(bytes, mime) {
  if (!formats[mime]) fail("Use a JPEG, PNG or WebP image.", 415);
  if (!Buffer.isBuffer(bytes) || !bytes.length) fail("Choose an image file.");
  if (bytes.length > MAX_IMAGE_BYTES)
    fail("The image must be 2 MB or smaller.", 413);
  try {
    const source = sharp(bytes, {
      limitInputPixels: 16777216,
      failOn: "warning",
    });
    const info = await source.metadata();
    if (info.format !== formats[mime])
      fail("The image contents do not match its file type.");
    if ((info.pages || 1) > 1) fail("Animated images are not supported.");
    if (
      !info.width ||
      !info.height ||
      info.width < 32 ||
      info.height < 32 ||
      info.width > 4096 ||
      info.height > 4096
    )
      fail("Image dimensions must be between 32 and 4096 pixels.");
    // Re-encoding strips EXIF and any appended content. No SVG or original bytes are served.
    const result = await source
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: result.data,
      width: result.info.width,
      height: result.info.height,
    };
  } catch (e) {
    if (e.status) throw e;
    fail(
      "This image is damaged or unsupported. Choose a valid JPEG, PNG or WebP file.",
    );
  }
}
export function registerImageRoutes(app, db, allow, rate) {
  const product = (req) => {
    const p = db
      .prepare("SELECT id FROM products WHERE id=? AND pharmacy_id=?")
      .get(req.params.id, req.user.pharmacy_id);
    if (!p) fail("Medicine not found.", 404);
    return p;
  };
  app.get("/api/products/:id/image", (req, res) => {
    product(req);
    const row = db
      .prepare(
        "SELECT bytes FROM product_images WHERE product_id=? AND pharmacy_id=?",
      )
      .get(req.params.id, req.user.pharmacy_id);
    if (!row) fail("No verified image has been added.", 404);
    res
      .set("Content-Disposition", 'inline; filename="medicine.webp"')
      .type("image/webp")
      .send(Buffer.from(row.bytes));
  });
  app.post(
    "/api/products/:id/image",
    allow("owner", "inventory"),
    express.raw({ type: Object.keys(formats), limit: MAX_IMAGE_BYTES }),
    async (req, res) => {
      product(req);
      rate("image:" + req.user.pharmacy_id + ":" + req.user.id, 30);
      if (req.headers["x-image-verified"] !== "true")
        fail(
          "Confirm that the image matches the medicine and is approved for use.",
        );
      const mime = (req.headers["content-type"] || "")
        .split(";")[0]
        .toLowerCase();
      const image = await validateImage(req.body, mime);
      const version = randomBytes(12).toString("hex");
      transaction(db, () => {
        db.prepare(
          `INSERT INTO product_images(product_id,pharmacy_id,bytes,width,height,version,verified_by) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(product_id) DO UPDATE SET bytes=excluded.bytes,width=excluded.width,height=excluded.height,version=excluded.version,verified_by=excluded.verified_by,updated=CURRENT_TIMESTAMP`,
        ).run(
          req.params.id,
          req.user.pharmacy_id,
          image.bytes,
          image.width,
          image.height,
          version,
          req.user.id,
        );
        db.prepare(
          "INSERT INTO audit(pharmacy_id,user_id,action,detail) VALUES(?,?,'product image uploaded',?)",
        ).run(
          req.user.pharmacy_id,
          req.user.id,
          JSON.stringify({ productId: Number(req.params.id), version }),
        );
      });
      res.json({ version, width: image.width, height: image.height });
    },
  );
  app.delete(
    "/api/products/:id/image",
    allow("owner", "inventory"),
    (req, res) => {
      product(req);
      transaction(db, () => {
        const result = db
          .prepare(
            "DELETE FROM product_images WHERE product_id=? AND pharmacy_id=?",
          )
          .run(req.params.id, req.user.pharmacy_id);
        if (!result.changes) fail("No image to remove.", 404);
        db.prepare(
          "INSERT INTO audit(pharmacy_id,user_id,action,detail) VALUES(?,?,'product image removed',?)",
        ).run(
          req.user.pharmacy_id,
          req.user.id,
          JSON.stringify({ productId: Number(req.params.id) }),
        );
      });
      res.json({ ok: true });
    },
  );
}
