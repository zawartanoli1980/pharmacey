import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
export function openDB(path = "data/smartmed.sqlite") {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(`CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS pharmacies(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),name TEXT,email TEXT UNIQUE,password TEXT,role TEXT CHECK(role IN ('owner','cashier','pharmacist','inventory','accountant')));
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires INTEGER);
 CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,pharmacy_id INTEGER REFERENCES pharmacies(id),name TEXT,generic TEXT,strength TEXT,form TEXT,sku TEXT,barcode TEXT,strip_units INTEGER,box_units INTEGER,reorder INTEGER DEFAULT 30,rx INTEGER DEFAULT 0,category TEXT);
 CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY,pharmacy_id INTEGER REFERENCES pharmacies(id),product_id INTEGER REFERENCES products(id),number TEXT,expiry TEXT,quantity INTEGER CHECK(quantity>=0),cost INTEGER CHECK(cost>=0),price INTEGER CHECK(price>=0),status TEXT CHECK(status IN ('available','recalled','quarantine')),supplier TEXT);
 CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY,pharmacy_id INTEGER REFERENCES pharmacies(id),name TEXT,phone TEXT,credit_limit INTEGER DEFAULT 500000,balance INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS invoices(id INTEGER PRIMARY KEY,pharmacy_id INTEGER REFERENCES pharmacies(id),user_id INTEGER,customer_id INTEGER REFERENCES customers(id),request_id TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP,total INTEGER,discount INTEGER,paid INTEGER,method TEXT,UNIQUE(pharmacy_id,request_id));
 CREATE TABLE IF NOT EXISTS lines(id INTEGER PRIMARY KEY,invoice_id INTEGER REFERENCES invoices(id),product_id INTEGER,batch_id INTEGER,quantity INTEGER,returned INTEGER DEFAULT 0,price INTEGER,cost INTEGER,discount INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY,pharmacy_id INTEGER,customer_id INTEGER,invoice_id INTEGER,amount INTEGER,method TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS refunds(id INTEGER PRIMARY KEY,pharmacy_id INTEGER,invoice_id INTEGER,line_id INTEGER,quantity INTEGER,amount INTEGER,cash_amount INTEGER,credit_amount INTEGER,reason TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY,pharmacy_id INTEGER,batch_id INTEGER,quantity INTEGER,kind TEXT,reference TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS purchases(id INTEGER PRIMARY KEY,pharmacy_id INTEGER,supplier TEXT,reference TEXT,total INTEGER,paid INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(pharmacy_id,supplier,reference));
 CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY,pharmacy_id INTEGER,category TEXT,amount INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,pharmacy_id INTEGER,user_id INTEGER,action TEXT,detail TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS leads(id INTEGER PRIMARY KEY,name TEXT,phone TEXT,message TEXT,kind TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
 INSERT OR IGNORE INTO migrations VALUES(1);`);
  if (
    !db
      .prepare("PRAGMA table_info(refunds)")
      .all()
      .some((c) => c.name === "cash_amount")
  ) {
    db.exec(
      "ALTER TABLE refunds ADD COLUMN cash_amount INTEGER DEFAULT 0; ALTER TABLE refunds ADD COLUMN credit_amount INTEGER DEFAULT 0; INSERT OR IGNORE INTO migrations VALUES(2);",
    );
  }
  db.exec("INSERT OR IGNORE INTO migrations VALUES(2);");
  return db;
}
export function hash(password, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function seed(db) {
  if (db.prepare("SELECT count(*) n FROM pharmacies").get().n) return;
  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO pharmacies VALUES(1,?),(2,?)").run(
      "Green Care Pharmacy",
      "Isolation Test Pharmacy",
    );
    for (const [id, role] of [
      [1, "owner"],
      [2, "cashier"],
      [3, "pharmacist"],
      [4, "inventory"],
      [5, "accountant"],
    ])
      db.prepare("INSERT INTO users VALUES(?,1,?,?,?,?)").run(
        id,
        role === "owner" ? "Ayesha Khan" : role,
        role + "@demo.smartmed.test",
        hash("DemoPass123!"),
        role,
      );
    db.prepare("INSERT INTO users VALUES(6,2,?,?,?,?)").run(
      "Other Owner",
      "other@demo.smartmed.test",
      hash("DemoPass123!"),
      "owner",
    );
    const products = [
      [
        "Panadol",
        "Paracetamol",
        "500 mg",
        "Tablet",
        "GSK",
        10,
        100,
        0,
        "Pain relief",
        3.2,
        4.5,
        1240,
      ],
      [
        "Augmentin",
        "Amoxicillin + clavulanate",
        "625 mg",
        "Tablet",
        "GSK",
        6,
        12,
        1,
        "Antibiotics",
        48,
        62,
        276,
      ],
      [
        "Glucophage",
        "Metformin",
        "500 mg",
        "Tablet",
        "Merck",
        10,
        50,
        1,
        "Diabetes",
        6,
        8.5,
        640,
      ],
      [
        "Brufen",
        "Ibuprofen",
        "400 mg",
        "Tablet",
        "Abbott",
        10,
        100,
        0,
        "Pain relief",
        5,
        7,
        420,
      ],
      [
        "Rigix",
        "Cetirizine",
        "10 mg",
        "Tablet",
        "AGP",
        10,
        30,
        0,
        "Allergy",
        8,
        11,
        24,
      ],
      [
        "Nexum",
        "Esomeprazole",
        "20 mg",
        "Capsule",
        "Getz",
        7,
        14,
        1,
        "Digestive care",
        17,
        22,
        18,
      ],
      [
        "Calpol",
        "Paracetamol",
        "120 mg/5 ml",
        "Syrup",
        "GSK",
        1,
        1,
        0,
        "Pain relief",
        100,
        140,
        56,
      ],
      [
        "Ventolin",
        "Salbutamol",
        "100 mcg",
        "Inhaler",
        "GSK",
        1,
        1,
        1,
        "Respiratory",
        290,
        370,
        32,
      ],
    ];
    products.forEach((p, i) => {
      db.prepare("INSERT INTO products VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?)").run(
        i + 1,
        p[0],
        p[1],
        p[2],
        p[3],
        "SM-" + String(i + 1).padStart(4, "0"),
        "89610000" + i,
        p[5],
        p[6],
        30,
        p[7],
        p[8],
      );
      db.prepare("INSERT INTO batches VALUES(?,1,?,?,?,?,?,?,?,?)").run(
        i + 1,
        i + 1,
        "BT-26" + (104 + i),
        i === 4 ? "2026-12-10" : "2028-06-30",
        p[11],
        Math.round(p[9] * 100),
        Math.round(p[10] * 100),
        "available",
        p[4] + " distributor (demo)",
      );
    });
    db.prepare("INSERT INTO customers VALUES(1,1,?,?,500000,0)").run(
      "Sara Ahmed",
      "03001234567",
    );
    db.prepare("INSERT INTO customers VALUES(2,1,?,?,1000000,0)").run(
      "Ali Raza",
      "03211234567",
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export function integer(v, min = 0) {
  if (!Number.isSafeInteger(v) || v < min)
    fail("Invalid integer amount or quantity");
  return v;
}
export function postSale(db, u, input, quote = false) {
  if (!["owner", "cashier", "pharmacist"].includes(u.role))
    fail("Sales permission required", 403);
  return transaction(db, () => {
    const existing = db
      .prepare("SELECT * FROM invoices WHERE pharmacy_id=? AND request_id=?")
      .get(u.pharmacy_id, input.requestId);
    if (existing) return existing;
    if (
      typeof input.requestId !== "string" ||
      input.requestId.length < 8 ||
      !Array.isArray(input.items) ||
      !input.items.length
    )
      fail("A unique request and at least one item are required");
    const allocations = [];
    let total = 0;
    for (const item of input.items) {
      const p = db
        .prepare("SELECT * FROM products WHERE id=? AND pharmacy_id=?")
        .get(item.productId, u.pharmacy_id);
      if (!p) fail("Product not found");
      if (p.rx && !["owner", "pharmacist"].includes(u.role))
        fail("Pharmacist approval is required for this medicine", 403);
      const factor = { unit: 1, strip: p.strip_units, box: p.box_units }[
        item.unit
      ];
      if (!factor) fail("Invalid sale unit");
      let remaining = integer(item.quantity, 1) * factor;
      integer(remaining, 1);
      const batches = db
        .prepare(
          "SELECT * FROM batches WHERE product_id=? AND pharmacy_id=? AND status='available' AND expiry>=date('now','+5 hours') AND quantity>0 ORDER BY expiry,id",
        )
        .all(p.id, u.pharmacy_id);
      for (const b of batches) {
        const already = allocations
          .filter((a) => a.batch_id === b.id)
          .reduce((s, a) => s + a.quantity, 0);
        const q = Math.min(remaining, b.quantity - already);
        if (q <= 0) continue;
        allocations.push({
          product_id: p.id,
          batch_id: b.id,
          quantity: q,
          price: b.price,
          cost: b.cost,
        });
        remaining -= q;
        total += q * b.price;
        if (!remaining) break;
      }
      if (remaining) fail("Insufficient eligible stock for " + p.name);
    }
    const discount = integer(input.discount || 0);
    if (discount > total) fail("Discount exceeds total");
    if (u.role === "cashier" && discount > Math.floor(total * 0.05))
      fail("Owner approval required for discounts above 5%", 403);
    integer(total);
    total -= discount;
    if (quote) return { total, allocations };
    const paid = integer(input.paid);
    if (paid > total)
      fail("Record applied payment only; return change separately");
    const methods = ["cash", "card", "bank", "JazzCash", "Easypaisa", "credit"];
    if (!methods.includes(input.method)) fail("Invalid payment method");
    const customer = input.customerId
      ? db
          .prepare("SELECT * FROM customers WHERE id=? AND pharmacy_id=?")
          .get(input.customerId, u.pharmacy_id)
      : null;
    if (input.customerId && !customer) fail("Customer not found");
    if (paid < total && !customer) fail("Select a customer for credit");
    if (customer && customer.balance + total - paid > customer.credit_limit)
      fail("Customer credit limit exceeded");
    const id = Number(
      db
        .prepare(
          "INSERT INTO invoices(pharmacy_id,user_id,customer_id,request_id,total,discount,paid,method) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          u.pharmacy_id,
          u.id,
          customer?.id || null,
          input.requestId,
          total,
          discount,
          paid,
          input.method,
        ).lastInsertRowid,
    );
    let assigned = 0;
    allocations.forEach((a, i) => {
      const d =
        i === allocations.length - 1
          ? discount - assigned
          : Math.floor((discount * a.quantity * a.price) / (total + discount));
      assigned += d;
      db.prepare(
        "INSERT INTO lines(invoice_id,product_id,batch_id,quantity,price,cost,discount) VALUES(?,?,?,?,?,?,?)",
      ).run(id, a.product_id, a.batch_id, a.quantity, a.price, a.cost, d);
      db.prepare("UPDATE batches SET quantity=quantity-? WHERE id=?").run(
        a.quantity,
        a.batch_id,
      );
      db.prepare(
        "INSERT INTO movements(pharmacy_id,batch_id,quantity,kind,reference) VALUES(?,?,?,'sale',?)",
      ).run(u.pharmacy_id, a.batch_id, -a.quantity, String(id));
    });
    db.prepare(
      "INSERT INTO payments(pharmacy_id,customer_id,invoice_id,amount,method) VALUES(?,?,?,?,?)",
    ).run(u.pharmacy_id, customer?.id || null, id, paid, input.method);
    if (customer)
      db.prepare("UPDATE customers SET balance=balance+? WHERE id=?").run(
        total - paid,
        customer.id,
      );
    db.prepare(
      "INSERT INTO audit(pharmacy_id,user_id,action,detail) VALUES(?,?,?,?)",
    ).run(u.pharmacy_id, u.id, "sale", String(id));
    return db.prepare("SELECT * FROM invoices WHERE id=?").get(id);
  });
}
export function returnLine(db, u, input) {
  if (u.role !== "owner") fail("Owner approval is required for refunds", 403);
  return transaction(db, () => {
    const line = db
      .prepare(
        "SELECT l.*,i.paid,i.total,i.customer_id FROM lines l JOIN invoices i ON i.id=l.invoice_id WHERE l.id=? AND i.pharmacy_id=?",
      )
      .get(input.lineId, u.pharmacy_id);
    if (!line) fail("Invoice line not found");
    const q = integer(input.quantity, 1);
    if (q > line.quantity - line.returned)
      fail("Return quantity exceeds sold quantity");
    if (!input.reason?.trim()) fail("Return reason is required");
    const amount =
      Math.floor(
        ((line.price * line.quantity - line.discount) * (line.returned + q)) /
          line.quantity,
      ) -
      Math.floor(
        ((line.price * line.quantity - line.discount) * line.returned) /
          line.quantity,
      );
    const previous = db
      .prepare(
        "SELECT COALESCE(sum(cash_amount),0) n FROM refunds WHERE invoice_id=?",
      )
      .get(line.invoice_id).n;
    const refunded = Math.min(amount, Math.max(0, line.paid - previous));
    const credit = amount - refunded;
    db.prepare("UPDATE lines SET returned=returned+? WHERE id=?").run(
      q,
      line.id,
    );
    db.prepare(
      "INSERT INTO refunds(pharmacy_id,invoice_id,line_id,quantity,amount,cash_amount,credit_amount,reason) VALUES(?,?,?,?,?,?,?,?)",
    ).run(
      u.pharmacy_id,
      line.invoice_id,
      line.id,
      q,
      amount,
      refunded,
      credit,
      input.reason,
    );
    const b = db.prepare("SELECT * FROM batches WHERE id=?").get(line.batch_id);
    const quarantine = Number(
      db
        .prepare(
          "INSERT INTO batches(pharmacy_id,product_id,number,expiry,quantity,cost,price,status,supplier) VALUES(?,?,?,?,?,?,?,'quarantine',?)",
        )
        .run(
          u.pharmacy_id,
          line.product_id,
          b.number + "-RETURN",
          b.expiry,
          q,
          line.cost,
          line.price,
          b.supplier,
        ).lastInsertRowid,
    );
    db.prepare(
      "INSERT INTO movements(pharmacy_id,batch_id,quantity,kind,reference) VALUES(?,?,?,'return quarantine',?)",
    ).run(u.pharmacy_id, quarantine, q, String(line.invoice_id));
    if (credit && line.customer_id)
      db.prepare("UPDATE customers SET balance=balance-? WHERE id=?").run(
        credit,
        line.customer_id,
      );
    db.prepare(
      "INSERT INTO payments(pharmacy_id,customer_id,invoice_id,amount,method) VALUES(?,?,?,?,'refund')",
    ).run(u.pharmacy_id, line.customer_id, line.invoice_id, -refunded);
    db.prepare(
      "INSERT INTO audit(pharmacy_id,user_id,action,detail) VALUES(?,?,'refund',?)",
    ).run(u.pharmacy_id, u.id, JSON.stringify(input));
    return { amount, refunded, credit, quarantine };
  });
}
