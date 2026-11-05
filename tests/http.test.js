import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://127.0.0.1:3000";
async function login(role) {
  const r = await fetch(base + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: role + "@demo.smartmed.test",
      password: "DemoPass123!",
    }),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
async function req(path, cookie, body) {
  return fetch(base + "/api" + path, {
    method: body ? "POST" : "GET",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
test("HTTP authorization, tenant isolation, concurrent sales and accounting", async () => {
  const owner = await login("owner"),
    cashier = await login("cashier"),
    other = await login("other");
  assert.equal((await req("/dashboard", cashier)).status, 403);
  assert.equal(
    (await req("/returns", cashier, { lineId: 1, quantity: 1, reason: "test" }))
      .status,
    403,
  );
  assert.equal((await req("/products", other)).status, 200);
  assert.equal((await (await req("/products", other)).json()).length, 0);
  assert.equal((await req("/products", "")).status, 401);
  const reference = "HTTP-" + crypto.randomUUID();
  let r = await req("/receive", owner, {
    productId: 1,
    number: reference,
    expiry: "2026-11-30",
    quantity: 3,
    cost: 100,
    price: 100,
    supplier: "Synthetic HTTP",
    reference,
    paid: 300,
  });
  assert.equal(r.status, 200);
  const batch = (await r.json()).id;
  // Isolate a product's sellable stock to make two competing requests exhaust the same batch.
  const batches = await (await req("/batches", owner)).json();
  const changed = [];
  for (const b of batches.filter(
    (b) => b.product_id === 1 && b.id !== batch && b.status === "available",
  )) {
    await fetch(base + "/api/batches/" + b.id, {
      method: "PATCH",
      headers: { Cookie: owner, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "quarantine" }),
    });
    changed.push(b.id);
  }
  try {
    const request = {
      items: [{ productId: 1, quantity: 2, unit: "unit" }],
      paid: 200,
      method: "cash",
    };
    const responses = await Promise.all([
      req("/sales", owner, { ...request, requestId: crypto.randomUUID() }),
      req("/sales", owner, { ...request, requestId: crypto.randomUUID() }),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
    const posted = await responses.find((r) => r.status === 200).json();
    assert.equal((await req("/invoices/" + posted.id, other)).status, 404);
    assert.equal(
      (await (await req("/batches", owner)).json()).find((b) => b.id === batch)
        .quantity,
      1,
    );
    const id = crypto.randomUUID();
    const same = {
      requestId: id,
      items: [{ productId: 1, quantity: 1, unit: "unit" }],
      paid: 0,
      customerId: 2,
      method: "credit",
    };
    const invoice = await (await req("/sales", owner, same)).json();
    assert.equal(
      (await (await req("/sales", owner, same)).json()).id,
      invoice.id,
    );
    assert.equal(
      (await req("/repayments", owner, { customerId: 2, amount: 100 })).status,
      200,
    );
    const details = await (await req("/invoices/" + invoice.id, owner)).json();
    assert.equal(details.paid, 100);
    const refund = await (
      await req("/returns", owner, {
        lineId: details.lines[0].id,
        quantity: 1,
        reason: "HTTP test inspection",
      })
    ).json();
    assert.equal(refund.refunded, 100);
    assert.equal(refund.credit, 0);
    const report = await (await req("/dashboard", owner)).json();
    assert.ok(Number.isSafeInteger(report.profit));
  } finally {
    for (const id of changed)
      await fetch(base + "/api/batches/" + id, {
        method: "PATCH",
        headers: { Cookie: owner, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "available" }),
      });
  }
});

test("medicine images validate contents, enforce roles and isolate pharmacies", async () => {
  const { default: sharp } = await import("sharp");
  const owner = await login("owner"),
    cashier = await login("cashier"),
    inventory = await login("inventory"),
    other = await login("other");
  const image = await sharp({
    create: { width: 96, height: 72, channels: 3, background: "#dcece2" },
  })
    .png()
    .toBuffer();
  const upload = (
    cookie,
    body = image,
    mime = "image/png",
    verified = "true",
  ) =>
    fetch(base + "/api/products/1/image", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": mime,
        "X-Image-Verified": verified,
      },
      body,
    });
  assert.equal((await upload(cashier)).status, 403);
  assert.equal((await upload(other)).status, 404);
  assert.equal((await upload(owner, image, "image/png", "false")).status, 400);
  assert.equal((await upload(owner, image, "image/jpeg")).status, 400);
  assert.equal(
    (await upload(owner, Buffer.from("<svg/>"), "image/svg+xml")).status,
    415,
  );
  assert.equal(
    (await upload(owner, Buffer.alloc(2 * 1024 * 1024 + 1))).status,
    413,
  );
  const saved = await upload(inventory);
  assert.equal(saved.status, 200);
  const { version } = await saved.json();
  assert.ok(version);
  const served = await req("/products/1/image", cashier);
  assert.equal(served.status, 200);
  assert.match(served.headers.get("content-type"), /image\/webp/);
  const meta = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
  assert.equal(meta.width, 96);
  assert.equal(meta.exif, undefined);
  assert.equal((await req("/products/1/image", other)).status, 404);
  assert.equal((await req("/products/1/image", "")).status, 401);
  const products = await (await req("/products", owner)).json();
  assert.equal(products.find((p) => p.id === 1).image_version, version);
  const deleted = await fetch(base + "/api/products/1/image", {
    method: "DELETE",
    headers: { Cookie: owner },
  });
  assert.equal(deleted.status, 200);
  assert.equal((await req("/products/1/image", owner)).status, 404);
});
