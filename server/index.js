import express from "express";
import { registerImageRoutes } from "./images.js";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import {
  openDB,
  seed,
  hash,
  transaction,
  postSale,
  returnLine,
  fail,
  integer,
} from "./db.js";
mkdirSync("data", { recursive: true });
const db = openDB(process.env.DATABASE_PATH || "data/smartmed.sqlite");
if (process.env.DEMO_MODE !== "false") seed(db);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== `${req.protocol}://${req.headers.host}`
  )
    return res.status(403).json({ error: "Cross-origin request rejected" });
  next();
});
const limits = new Map();
function rate(key, max) {
  const now = Date.now();
  const a = (limits.get(key) || []).filter((x) => x > now - 900000);
  if (a.length >= max) fail("Too many attempts. Try again in 15 minutes.", 429);
  a.push(now);
  limits.set(key, a);
}
app.get("/api/health", (_, res) =>
  res.json({ ok: true, demo: process.env.DEMO_MODE !== "false" }),
);
app.post("/api/login", (req, res) => {
  rate(req.ip, 20);
  const { email, password } = req.body;
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(String(email));
  const candidate = hash(
    String(password),
    u?.password.split(":")[0] || "missing",
  );
  if (!u || !timingSafeEqual(Buffer.from(candidate), Buffer.from(u.password)))
    fail("Email or password is incorrect", 401);
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    token,
    u.id,
    Date.now() + 8 * 3600000,
  );
  res.cookie("smartmed", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 8 * 3600000,
  });
  res.json({ ok: true });
});
app.post("/api/contact", (req, res) => {
  rate("lead:" + req.ip, 5);
  const { name, phone, message, website, kind } = req.body;
  if (website) fail("Unable to submit");
  if (
    !name?.trim() ||
    !/^03\d{9}$/.test(phone) ||
    !message?.trim() ||
    message.length > 2000
  )
    fail(
      "Enter your name, a Pakistani mobile number (03XXXXXXXXX), and a message",
    );
  db.prepare("INSERT INTO leads(name,phone,message,kind) VALUES(?,?,?,?)").run(
    name.trim().slice(0, 100),
    phone,
    message,
    kind || "contact",
  );
  res.json({ ok: true });
});
app.use("/api", (req, res, next) => {
  const token = req.headers.cookie?.match(/(?:^|; )smartmed=([^;]+)/)?.[1];
  const u = db
    .prepare(
      "SELECT u.id,u.pharmacy_id,u.name,u.email,u.role,p.name pharmacy FROM users u JOIN sessions s ON s.user_id=u.id JOIN pharmacies p ON p.id=u.pharmacy_id WHERE s.token=? AND s.expires>?",
    )
    .get(token || "", Date.now());
  if (!u) return res.status(401).json({ error: "Please sign in" });
  req.user = u;
  next();
});
const allow =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res
          .status(403)
          .json({ error: "Your role does not permit this action" });
registerImageRoutes(app, db, allow, rate);
app.get("/api/me", (req, res) =>
  res.json({
    ...req.user,
    demo: process.env.DEMO_MODE !== "false",
    branch: "Main branch · Lahore",
  }),
);
app.post("/api/logout", (req, res) => {
  db.prepare("DELETE FROM sessions WHERE token=?").run(
    req.headers.cookie?.match(/smartmed=([^;]+)/)?.[1] || "",
  );
  res.clearCookie("smartmed");
  res.json({ ok: true });
});
app.get("/api/products", (req, res) => {
  const q = "%" + String(req.query.q || "").slice(0, 100) + "%";
  res.json(
    db
      .prepare(
        `SELECT p.*,im.version image_version,COALESCE(sum(CASE WHEN b.status='available' AND b.expiry>=date('now','+5 hours') THEN b.quantity ELSE 0 END),0) stock,min(CASE WHEN b.status='available' AND b.expiry>=date('now','+5 hours') AND b.quantity>0 THEN b.price END) price,min(CASE WHEN b.status='available' AND b.quantity>0 THEN b.expiry END) expiry FROM products p LEFT JOIN batches b ON b.product_id=p.id LEFT JOIN product_images im ON im.product_id=p.id AND im.pharmacy_id=p.pharmacy_id WHERE p.pharmacy_id=? AND (p.name LIKE ? OR p.generic LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.strength LIKE ?) GROUP BY p.id ORDER BY p.name LIMIT 100`,
      )
      .all(req.user.pharmacy_id, q, q, q, q, q),
  );
});
app.get(
  "/api/batches",
  allow("owner", "inventory", "pharmacist", "accountant"),
  (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT b.*,p.name,p.strength,im.version image_version FROM batches b JOIN products p ON p.id=b.product_id LEFT JOIN product_images im ON im.product_id=p.id AND im.pharmacy_id=b.pharmacy_id WHERE b.pharmacy_id=? ORDER BY b.expiry,b.id LIMIT 500",
        )
        .all(req.user.pharmacy_id),
    ),
);
app.get(
  "/api/customers",
  allow("owner", "cashier", "pharmacist", "accountant"),
  (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT * FROM customers WHERE pharmacy_id=? ORDER BY name LIMIT 100",
        )
        .all(req.user.pharmacy_id),
    ),
);
app.post("/api/customers", allow("owner", "cashier"), (req, res) => {
  const { name, phone, credit_limit = 500000 } = req.body;
  if (!name?.trim() || !/^03\d{9}$/.test(phone))
    fail("A name and valid Pakistani mobile number are required");
  integer(credit_limit);
  const id = db
    .prepare(
      "INSERT INTO customers(pharmacy_id,name,phone,credit_limit) VALUES(?,?,?,?)",
    )
    .run(
      req.user.pharmacy_id,
      name.trim(),
      phone,
      credit_limit,
    ).lastInsertRowid;
  res.json({ id: Number(id) });
});
app.post("/api/repayments", allow("owner", "cashier"), (req, res) =>
  res.json(
    transaction(db, () => {
      const c = db
        .prepare("SELECT * FROM customers WHERE id=? AND pharmacy_id=?")
        .get(req.body.customerId, req.user.pharmacy_id);
      if (!c) fail("Customer not found");
      const amount = integer(req.body.amount, 1);
      if (amount > c.balance) fail("Repayment exceeds outstanding balance");
      db.prepare("UPDATE customers SET balance=balance-? WHERE id=?").run(
        amount,
        c.id,
      );
      let remaining = amount;
      const outstanding = db
        .prepare(
          "SELECT i.*,COALESCE((SELECT sum(credit_amount) FROM refunds WHERE invoice_id=i.id),0) reversed FROM invoices i WHERE i.customer_id=? AND i.pharmacy_id=? ORDER BY i.id",
        )
        .all(c.id, req.user.pharmacy_id);
      for (const i of outstanding) {
        const applied = Math.min(remaining, i.total - i.paid - i.reversed);
        if (applied <= 0) continue;
        db.prepare("UPDATE invoices SET paid=paid+? WHERE id=?").run(
          applied,
          i.id,
        );
        db.prepare(
          "INSERT INTO payments(pharmacy_id,customer_id,invoice_id,amount,method) VALUES(?,?,?,?,'credit repayment')",
        ).run(req.user.pharmacy_id, c.id, i.id, applied);
        remaining -= applied;
        if (!remaining) break;
      }
      if (remaining) fail("Ledger reconciliation required");
      return { ok: true };
    }),
  ),
);
app.post("/api/quote", allow("owner", "cashier", "pharmacist"), (req, res) =>
  res.json(
    postSale(
      db,
      req.user,
      { ...req.body, requestId: randomBytes(16).toString("hex") },
      true,
    ),
  ),
);
app.post("/api/sales", allow("owner", "cashier", "pharmacist"), (req, res) =>
  res.json(postSale(db, req.user, req.body)),
);
app.post("/api/returns", allow("owner"), (req, res) =>
  res.json(returnLine(db, req.user, req.body)),
);
app.get(
  "/api/invoices",
  allow("owner", "cashier", "pharmacist", "accountant"),
  (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT i.*,c.name customer FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id WHERE i.pharmacy_id=? ORDER BY i.id DESC LIMIT 100",
        )
        .all(req.user.pharmacy_id),
    ),
);
app.get("/api/invoices/:id", (req, res) => {
  const i = db
    .prepare("SELECT * FROM invoices WHERE id=? AND pharmacy_id=?")
    .get(req.params.id, req.user.pharmacy_id);
  if (!i) fail("Invoice not found", 404);
  res.json({
    ...i,
    pharmacy: req.user.pharmacy,
    lines: db
      .prepare(
        "SELECT l.*,p.name,p.strength,b.number batch FROM lines l JOIN products p ON p.id=l.product_id JOIN batches b ON b.id=l.batch_id WHERE l.invoice_id=?",
      )
      .all(i.id),
  });
});
app.post("/api/receive", allow("owner", "inventory"), (req, res) =>
  res.json(
    transaction(db, () => {
      const u = req.user;
      const {
        productId,
        number,
        expiry,
        quantity,
        cost,
        price,
        supplier,
        reference,
        paid = 0,
      } = req.body;
      if (
        !number?.trim() ||
        !supplier?.trim() ||
        !reference?.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
        !Number.isFinite(Date.parse(expiry))
      )
        fail(
          "Batch, valid expiry, supplier and invoice reference are required",
        );
      if (
        !db
          .prepare("SELECT id FROM products WHERE id=? AND pharmacy_id=?")
          .get(productId, u.pharmacy_id)
      )
        fail("Product not found");
      integer(quantity, 1);
      integer(cost);
      integer(price);
      integer(paid);
      const total = quantity * cost;
      integer(total);
      if (paid > total) fail("Payment exceeds purchase value");
      if (
        db
          .prepare(
            "SELECT id FROM purchases WHERE pharmacy_id=? AND supplier=? AND reference=?",
          )
          .get(u.pharmacy_id, supplier, reference)
      )
        fail("Duplicate supplier invoice");
      const id = Number(
        db
          .prepare(
            "INSERT INTO batches(pharmacy_id,product_id,number,expiry,quantity,cost,price,status,supplier) VALUES(?,?,?,?,?,?,?,'available',?)",
          )
          .run(
            u.pharmacy_id,
            productId,
            number,
            expiry,
            quantity,
            cost,
            price,
            supplier,
          ).lastInsertRowid,
      );
      db.prepare(
        "INSERT INTO movements(pharmacy_id,batch_id,quantity,kind,reference) VALUES(?,?,?,'purchase',?)",
      ).run(u.pharmacy_id, id, quantity, reference);
      db.prepare(
        "INSERT INTO purchases(pharmacy_id,supplier,reference,total,paid) VALUES(?,?,?,?,?)",
      ).run(u.pharmacy_id, supplier, reference, total, paid);
      db.prepare(
        "INSERT INTO audit(pharmacy_id,user_id,action,detail) VALUES(?,?,'receive',?)",
      ).run(u.pharmacy_id, u.id, String(id));
      return { id };
    }),
  ),
);
app.patch("/api/batches/:id", allow("owner", "pharmacist"), (req, res) => {
  if (!["available", "recalled", "quarantine"].includes(req.body.status))
    fail("Invalid status");
  res.json(
    transaction(db, () => {
      const result = db
        .prepare("UPDATE batches SET status=? WHERE id=? AND pharmacy_id=?")
        .run(req.body.status, req.params.id, req.user.pharmacy_id);
      if (!result.changes) fail("Batch not found", 404);
      db.prepare(
        "INSERT INTO audit(pharmacy_id,user_id,action,detail) VALUES(?,?,'batch status',?)",
      ).run(
        req.user.pharmacy_id,
        req.user.id,
        JSON.stringify({ id: req.params.id, ...req.body }),
      );
      return { ok: true };
    }),
  );
});
app.post("/api/expenses", allow("owner", "accountant"), (req, res) => {
  integer(req.body.amount, 1);
  if (!req.body.category?.trim()) fail("Category is required");
  db.prepare(
    "INSERT INTO expenses(pharmacy_id,category,amount) VALUES(?,?,?)",
  ).run(req.user.pharmacy_id, req.body.category, req.body.amount);
  res.json({ ok: true });
});
app.get(
  "/api/purchases",
  allow("owner", "inventory", "accountant"),
  (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT * FROM purchases WHERE pharmacy_id=? ORDER BY id DESC LIMIT 100",
        )
        .all(req.user.pharmacy_id),
    ),
);
app.get("/api/movements", (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT m.*,p.name,b.number FROM movements m JOIN batches b ON b.id=m.batch_id JOIN products p ON p.id=b.product_id WHERE m.pharmacy_id=? ORDER BY m.id DESC LIMIT 100",
      )
      .all(req.user.pharmacy_id),
  ),
);
app.get("/api/dashboard", allow("owner", "accountant"), (req, res) => {
  const pid = req.user.pharmacy_id;
  const from = String(req.query.from || "2000-01-01"),
    to = String(req.query.to || "2100-01-01");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    from > to
  )
    fail("Invalid report dates");
  const sales = db
    .prepare(
      "SELECT COALESCE(sum(total+discount),0) gross,COALESCE(sum(discount),0) discounts,COALESCE(sum(total),0) sales,count(*) count FROM invoices WHERE pharmacy_id=? AND date(created,'+5 hours') BETWEEN ? AND ?",
    )
    .get(pid, from, to);
  const refunds = db
    .prepare(
      "SELECT COALESCE(sum(amount),0) n FROM refunds WHERE pharmacy_id=? AND date(created,'+5 hours') BETWEEN ? AND ?",
    )
    .get(pid, from, to).n;
  const cogs =
    db
      .prepare(
        "SELECT COALESCE(sum(l.quantity*l.cost),0) n FROM lines l JOIN invoices i ON i.id=l.invoice_id WHERE i.pharmacy_id=? AND date(i.created,'+5 hours') BETWEEN ? AND ?",
      )
      .get(pid, from, to).n -
    db
      .prepare(
        "SELECT COALESCE(sum(r.quantity*l.cost),0) n FROM refunds r JOIN lines l ON l.id=r.line_id WHERE r.pharmacy_id=? AND date(r.created,'+5 hours') BETWEEN ? AND ?",
      )
      .get(pid, from, to).n;
  const expenses = db
    .prepare(
      "SELECT COALESCE(sum(amount),0) n FROM expenses WHERE pharmacy_id=? AND date(created,'+5 hours') BETWEEN ? AND ?",
    )
    .get(pid, from, to).n;
  const stock = db
    .prepare(
      "SELECT COALESCE(sum(quantity*cost),0) value,COALESCE(sum(CASE WHEN expiry BETWEEN date('now','+5 hours') AND date('now','+30 days') THEN quantity*cost ELSE 0 END),0) near FROM batches WHERE pharmacy_id=? AND status='available'",
    )
    .get(pid);
  const trend = db
    .prepare(
      "SELECT date(created,'+5 hours') day,sum(total) total FROM invoices WHERE pharmacy_id=? AND date(created,'+5 hours') BETWEEN ? AND ? GROUP BY day ORDER BY day DESC LIMIT 14",
    )
    .all(pid, from, to)
    .reverse();
  const top = db
    .prepare(
      "SELECT p.name,sum(l.quantity-l.returned) units,sum((l.quantity-l.returned)*l.price) revenue FROM lines l JOIN invoices i ON i.id=l.invoice_id JOIN products p ON p.id=l.product_id WHERE i.pharmacy_id=? AND date(i.created,'+5 hours') BETWEEN ? AND ? GROUP BY p.id ORDER BY units DESC LIMIT 5",
    )
    .all(pid, from, to);
  res.json({
    ...sales,
    refunds,
    net: sales.sales - refunds,
    cogs,
    expenses,
    profit: sales.sales - refunds - cogs - expenses,
    stock,
    trend,
    top,
    credit: db
      .prepare(
        "SELECT COALESCE(sum(balance),0) n FROM customers WHERE pharmacy_id=?",
      )
      .get(pid).n,
    payables: db
      .prepare(
        "SELECT COALESCE(sum(total-paid),0) n FROM purchases WHERE pharmacy_id=?",
      )
      .get(pid).n,
    payments: db
      .prepare(
        "SELECT method,sum(amount) amount FROM payments WHERE pharmacy_id=? AND date(created,'+5 hours') BETWEEN ? AND ? GROUP BY method",
      )
      .all(pid, from, to),
    activity: db
      .prepare(
        "SELECT a.*,u.name FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE a.pharmacy_id=? ORDER BY a.id DESC LIMIT 8",
      )
      .all(pid),
  });
});
app.get("/api/export", allow("owner", "accountant"), (req, res) => {
  const rows = db
    .prepare(
      "SELECT id,created,total,discount,paid,method FROM invoices WHERE pharmacy_id=? ORDER BY id",
    )
    .all(req.user.pharmacy_id);
  res
    .type("text/csv")
    .attachment("smartmed-sales.csv")
    .send(
      "Invoice,Date,Net (paisa),Discount (paisa),Paid (paisa),Method\n" +
        rows.map((r) => Object.values(r).join(",")).join("\n"),
    );
});
app.use((err, req, res, next) => {
  if (!err.status) console.error(err.message);
  res.status(err.status || 500).json({
    error: err.status
      ? err.message
      : "Operation failed. No partial changes were saved.",
  });
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
  app.get("/{*path}", (_, res) => res.sendFile("index.html", { root: "dist" }));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`SmartMed running on port ${port}`),
);
