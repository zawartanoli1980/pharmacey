import test from "node:test";
import assert from "node:assert/strict";
import { openDB, seed, postSale, returnLine } from "../server/db.js";
const owner = { id: 1, pharmacy_id: 1, role: "owner" };
function setup() {
  const d = openDB(":memory:");
  seed(d);
  return d;
}
function sale(
  d,
  items = [{ productId: 1, quantity: 1, unit: "unit" }],
  overrides = {},
) {
  return postSale(d, owner, {
    requestId: crypto.randomUUID(),
    items,
    paid: 450,
    method: "cash",
    ...overrides,
  });
}
test("box, strip and unit conversion preserve historical costs and stock", () => {
  const d = setup();
  const i = sale(
    d,
    [
      { productId: 1, quantity: 1, unit: "box" },
      { productId: 1, quantity: 2, unit: "strip" },
      { productId: 1, quantity: 3, unit: "unit" },
    ],
    { paid: 123 * 450 },
  );
  assert.equal(i.total, 55350);
  assert.equal(
    d.prepare("SELECT quantity FROM batches WHERE id=1").get().quantity,
    1117,
  );
  assert.equal(
    d.prepare("SELECT sum(quantity*cost) cost FROM lines").get().cost,
    123 * 320,
  );
  d.prepare("UPDATE batches SET cost=999 WHERE id=1").run();
  assert.equal(
    d.prepare("SELECT sum(quantity*cost) cost FROM lines").get().cost,
    123 * 320,
  );
  d.close();
});
test("FEFO uses earliest eligible batch and distinct batch selling prices", () => {
  const d = setup();
  d.prepare(
    "INSERT INTO batches VALUES(99,1,1,'EARLY','2027-01-01',2,100,200,'available','Demo')",
  ).run();
  const i = sale(d, [{ productId: 1, quantity: 3, unit: "unit" }], {
    paid: 850,
  });
  assert.equal(i.total, 850);
  assert.equal(
    d
      .prepare("SELECT batch_id FROM lines WHERE invoice_id=? ORDER BY id")
      .get(i.id).batch_id,
    99,
  );
  d.close();
});
test("expired, recalled and quarantined stock cannot be sold", () => {
  for (const state of ["expired", "recalled", "quarantine"]) {
    const d = setup();
    if (state === "expired")
      d.prepare("UPDATE batches SET expiry='2020-01-01' WHERE id=1").run();
    else d.prepare("UPDATE batches SET status=? WHERE id=1").run(state);
    assert.throws(() => sale(d), /Insufficient/);
    assert.equal(d.prepare("SELECT count(*) n FROM invoices").get().n, 0);
    d.close();
  }
});
test("duplicate submission posts one invoice and one stock deduction", () => {
  const d = setup();
  const requestId = crypto.randomUUID();
  const i = sale(d, undefined, { requestId });
  assert.equal(sale(d, undefined, { requestId }).id, i.id);
  assert.equal(
    d.prepare("SELECT quantity FROM batches WHERE id=1").get().quantity,
    1239,
  );
  d.close();
});
test("overselling and duplicate product lines roll back all writes", () => {
  const d = setup();
  assert.throws(
    () =>
      sale(d, [
        { productId: 1, quantity: 1000, unit: "unit" },
        { productId: 1, quantity: 241, unit: "unit" },
      ]),
    /Insufficient/,
  );
  assert.equal(
    d.prepare("SELECT quantity FROM batches WHERE id=1").get().quantity,
    1240,
  );
  assert.equal(d.prepare("SELECT count(*) n FROM invoices").get().n, 0);
  d.close();
});
test("credit sale enforces customer ownership and limit", () => {
  const d = setup();
  const i = sale(d, undefined, { paid: 100, customerId: 1 });
  assert.equal(i.total, 450);
  assert.equal(
    d.prepare("SELECT balance FROM customers WHERE id=1").get().balance,
    350,
  );
  d.prepare("UPDATE customers SET credit_limit=350 WHERE id=1").run();
  assert.throws(() => sale(d, undefined, { paid: 0, customerId: 1 }), /limit/);
  assert.throws(
    () =>
      postSale(
        d,
        { ...owner, pharmacy_id: 2 },
        {
          requestId: crypto.randomUUID(),
          items: [{ productId: 1, quantity: 1, unit: "unit" }],
          paid: 450,
          method: "cash",
        },
      ),
    /Product not found/,
  );
  d.close();
});
test("partial returns cap cash refund, reverse unpaid credit, quarantine units", () => {
  const d = setup();
  const i = sale(d, [{ productId: 1, quantity: 4, unit: "unit" }], {
    paid: 500,
    customerId: 1,
    discount: 101,
  });
  const l = d.prepare("SELECT * FROM lines WHERE invoice_id=?").get(i.id);
  const r = returnLine(d, owner, {
    lineId: l.id,
    quantity: 2,
    reason: "Damaged packaging",
  });
  assert.equal(r.refunded, 500);
  assert.equal(r.credit, 349);
  const r2 = returnLine(d, owner, {
    lineId: l.id,
    quantity: 2,
    reason: "Damaged packaging",
  });
  assert.equal(r2.refunded, 0);
  assert.equal(r.amount + r2.amount, i.total);
  assert.equal(
    d.prepare("SELECT balance FROM customers WHERE id=1").get().balance,
    0,
  );
  assert.equal(
    d
      .prepare("SELECT sum(quantity) q FROM batches WHERE status='quarantine'")
      .get().q,
    4,
  );
  assert.equal(
    d.prepare("SELECT quantity FROM batches WHERE id=1").get().quantity,
    1236,
  );
  assert.throws(
    () => returnLine(d, owner, { lineId: l.id, quantity: 1, reason: "Again" }),
    /exceeds/,
  );
  d.close();
});
test("cashier cannot refund, sell Rx or exceed discount permission", () => {
  const d = setup();
  const cashier = { ...owner, role: "cashier" };
  assert.throws(() => returnLine(d, cashier, {}), /Owner/);
  assert.throws(
    () =>
      postSale(d, cashier, {
        requestId: crypto.randomUUID(),
        items: [{ productId: 2, quantity: 1, unit: "unit" }],
        paid: 6200,
        method: "cash",
      }),
    /Pharmacist/,
  );
  assert.throws(
    () =>
      postSale(d, cashier, {
        requestId: crypto.randomUUID(),
        items: [{ productId: 1, quantity: 1, unit: "unit" }],
        discount: 100,
        paid: 350,
        method: "cash",
      }),
    /approval/,
  );
  d.close();
});
test("pharmacy isolation applies to return lookup", () => {
  const d = setup();
  const i = sale(d);
  const l = d.prepare("SELECT id FROM lines WHERE invoice_id=?").get(i.id);
  assert.throws(
    () =>
      returnLine(
        d,
        { ...owner, pharmacy_id: 2 },
        { lineId: l.id, quantity: 1, reason: "test" },
      ),
    /not found/,
  );
  d.close();
});
