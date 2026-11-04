import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Minus,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Sun,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  X,
  Printer,
  Globe,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Pill,
  Wallet,
} from "lucide-react";
import "./style.css";
type Row = Record<string, any>;
const money = (n: number = 0) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(n / 100);
const number = (n: number = 0) => new Intl.NumberFormat("en-PK").format(n);
async function api(path: string, body?: any, method?: string) {
  const r = await fetch("/api" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
const nav = [
  ["Overview", LayoutDashboard],
  ["Point of sale", ShoppingCart],
  ["Inventory", Boxes],
  ["Purchases", Truck],
  ["Customers", Users],
  ["Sales & returns", ClipboardList],
  ["Reports", BarChart3],
] as const;
function App() {
  const [mode, setMode] = useState(
    location.pathname.startsWith("/app") ? "app" : "public",
  );
  const [user, setUser] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("Overview");
  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");
  const [urdu, setUrdu] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState("");
  const [mobile, setMobile] = useState(false);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const check = () =>
      api("/health")
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, []);
  const refresh = () => setVersion((x) => x + 1);
  const notify = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 5000);
  };
  const go = (s: string) => {
    setPage(s);
    setMobile(false);
    setError("");
  };
  useEffect(() => {
    api("/me")
      .then((u) => {
        setUser(u);
        setPage(
          ["owner", "accountant"].includes(u.role)
            ? "Overview"
            : u.role === "inventory"
              ? "Inventory"
              : "Point of sale",
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = urdu ? "ur" : "en";
    document.documentElement.dir = urdu ? "rtl" : "ltr";
  }, [urdu]);
  const enter = () => {
    history.pushState({}, "", "/app");
    setMode("app");
  };
  if (mode === "public")
    return (
      <Public
        onEnter={enter}
        onDemo={() => {
          enter();
        }}
      />
    );
  if (loading) return <div className="loading">Preparing your workspace…</div>;
  if (!user)
    return (
      <Login
        onLogin={async () => {
          const u = await api("/me");
          setUser(u);
          setPage(
            ["owner", "accountant"].includes(u.role)
              ? "Overview"
              : u.role === "inventory"
                ? "Inventory"
                : "Point of sale",
          );
        }}
        back={() => {
          setMode("public");
          history.pushState({}, "", "/");
        }}
      />
    );
  const canFinance = ["owner", "accountant"].includes(user.role);
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMode("public");
          }}
        >
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          <span>
            SmartMed<span className="brand-pos"> POS</span>
            <small>PHARMACY MANAGEMENT</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">GC</div>
          <div>
            <strong>{user.pharmacy}</strong>
            <small>Main branch · Lahore</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav
            .filter(
              ([n]) =>
                (!["Overview", "Reports"].includes(n) || canFinance) &&
                (!(n === "Inventory") || user.role !== "cashier") &&
                (!(n === "Customers" || n === "Sales & returns") ||
                  user.role !== "inventory") &&
                (!(n === "Point of sale") ||
                  ["owner", "cashier", "pharmacist"].includes(user.role)) &&
                (!(n === "Purchases") ||
                  ["owner", "inventory", "accountant"].includes(user.role)),
            )
            .map(([name, Icon]) => (
              <button
                key={name}
                className={page === name ? "active" : ""}
                onClick={() => go(name)}
              >
                <Icon size={19} />
                <span>
                  {urdu
                    ? (
                        {
                          Overview: "جائزہ",
                          "Point of sale": "فروخت",
                          Inventory: "اسٹاک",
                          Purchases: "خریداری",
                          Customers: "گاہک",
                          "Sales & returns": "فروخت اور واپسی",
                          Reports: "رپورٹس",
                        } as Row
                      )[name]
                    : name}
                </span>
                {name === "Point of sale" && <kbd>F2</kbd>}
              </button>
            ))}
        </nav>
        <div className="nav-label tools-label">MANAGE</div>
        <nav>
          <button
            onClick={() => go("Settings")}
            className={page === "Settings" ? "active" : ""}
          >
            <Settings size={19} />
            Settings
          </button>
          <button onClick={() => setModal("help")}>
            <HelpCircle size={19} />
            Help & support
            <ArrowUpRight size={14} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan">
            <span className="plan-symbol">
              <ShieldCheck size={19} />
            </span>
            <strong>Demo workspace</strong>
            <p>Synthetic data. Explore with confidence.</p>
            <button onClick={() => setModal("demo")}>
              About this demo <ArrowRight size={14} />
            </button>
          </div>
          <button
            className="profile"
            onClick={async () => {
              await api("/logout", {});
              setUser(null);
            }}
          >
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role} · Sign out</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="live">
              <i />
              {connected ? "Server connected" : "Connection unavailable"}
            </span>
            <button
              className="icon-button"
              aria-label="Change language"
              onClick={() => setUrdu(!urdu)}
            >
              <Globe size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button notification"
              aria-label="View stock alerts"
              onClick={() => go("Inventory")}
            >
              <Bell size={19} />
              <b />
            </button>
            <span className="avatar small">{user.name[0]}</span>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <span>
              <ShieldCheck size={15} />
              Demo environment <b>·</b> All records are synthetic. No live
              payments or patient data.
            </span>
            <button onClick={() => setModal("demo")}>
              Learn more <ArrowUpRight size={13} />
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {page === "Overview" && (
            <Dashboard key={version} go={go} fail={setError} />
          )}
          {page === "Point of sale" && (
            <POS
              key={version}
              user={user}
              refresh={refresh}
              notify={notify}
              fail={setError}
            />
          )}
          {page === "Inventory" && (
            <Inventory
              key={version}
              user={user}
              refresh={refresh}
              fail={setError}
              receive={() => go("Purchases")}
            />
          )}
          {page === "Purchases" && (
            <Purchases
              key={version}
              user={user}
              refresh={refresh}
              notify={notify}
              fail={setError}
            />
          )}
          {page === "Customers" && (
            <Customers
              key={version}
              user={user}
              refresh={refresh}
              notify={notify}
              fail={setError}
            />
          )}
          {page === "Sales & returns" && (
            <Sales
              key={version}
              user={user}
              refresh={refresh}
              notify={notify}
              fail={setError}
            />
          )}
          {page === "Reports" && (
            <Reports
              key={version}
              refresh={refresh}
              notify={notify}
              fail={setError}
            />
          )}
          {page === "Settings" && (
            <SettingsPage
              user={user}
              dark={dark}
              setDark={setDark}
              urdu={urdu}
              setUrdu={setUrdu}
            />
          )}
          <footer className="app-footer">
            <span>
              SmartMed POS <b>·</b> A healthier way to manage your pharmacy.
            </span>
            <span>
              Asia/Karachi <b>·</b> v0.1 demo
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {notice}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "help" ? "Help & support" : "A safe space to explore"
          }
          close={() => setModal("")}
        >
          <p>
            This is an isolated, synthetic demonstration of SmartMed POS. Sales,
            stock, purchases and customer balances persist in this environment.
          </p>
          <p>
            Payment methods record collections only. No gateway is connected.
            Prescription uploads, online orders and offline sales are not
            enabled.
          </p>
          <p>
            For getting started, receive a batch in Purchases, open Point of
            sale, then review your invoice in Sales & returns.
          </p>
          <button className="primary" onClick={() => setModal("")}>
            Got it
          </button>
        </Modal>
      )}
    </div>
  );
}
function useData(path: string, fail: (s: string) => void) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    api(path)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => fail(e.message));
    return () => {
      alive = false;
    };
  }, [path]);
  return data;
}
function Title({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Dashboard({
  go,
  fail,
}: {
  go: (s: string) => void;
  fail: (s: string) => void;
}) {
  const [range, setRange] = useState("All time");
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
  });
  const path =
    range === "Today" ? `/dashboard?from=${today}&to=${today}` : "/dashboard";
  const d = useData(path, fail);
  const products: Row[] = useData("/products", fail) || [];
  const low = products.filter((p) => p.stock <= p.reorder);
  const near = products.filter(
    (p) =>
      p.expiry && new Date(p.expiry).getTime() - Date.now() < 30 * 86400000,
  );
  if (!d) return <div className="loading">Loading your overview…</div>;
  const cards = [
    ["Net sales", money(d.net), `${d.count} invoices posted`, Wallet, "mint"],
    [
      "Estimated net profit",
      money(d.profit),
      "After cost of goods & expenses",
      TrendingUp,
      "blue",
    ],
    [
      "Inventory value",
      money(d.stock.value),
      `${products.length} medicines in catalog`,
      Package,
      "purple",
    ],
    [
      "Customer credit",
      money(d.credit),
      "Outstanding receivables",
      CreditCard,
      "amber",
    ],
  ];
  return (
    <>
      <Title
        eyebrow="YOUR PHARMACY AT A GLANCE"
        title="A clearer view. A healthier business."
        sub={`Here's what's happening at your pharmacy today.`}
      >
        <select aria-label="Branch">
          <option>Main branch · Lahore</option>
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Report period"
        >
          <option>All time</option>
          <option>Today</option>
        </select>
        <button className="primary" onClick={() => go("Point of sale")}>
          <Plus size={17} />
          New sale
        </button>
      </Title>
      <div className="welcome-strip">
        <div className="welcome-graphic">
          <Stethoscope size={28} />
        </div>
        <div>
          <strong>Your day, under control.</strong>
          <p>
            Keep your shelves stocked, your billing fast, and your customers
            cared for.
          </p>
        </div>
        <span className="date-chip">
          <Clock size={14} />
          {new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Karachi",
          })}
        </span>
      </div>
      <div className="stats">
        {cards.map(([label, value, caption, Icon, color]: any) => (
          <article className="stat" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={"stat-icon " + color}>
                <Icon size={18} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{caption}</small>
            <div className="stat-line" />
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel sales-chart">
          <div className="panel-heading">
            <div>
              <h2>Sales overview</h2>
              <p>Your sales performance, in perspective</p>
            </div>
            <span className="legend">
              <i />
              Net sales
            </span>
          </div>
          <div className="chart-summary">
            <strong>{money(d.net)}</strong>
            <span>
              Recorded net sales{" "}
              <span className="muted">· {range.toLowerCase()}</span>
            </span>
          </div>
          {d.trend.length ? (
            <div className="chart">
              <div className="chart-grid">
                {[100, 75, 50, 25, 0].map((v) => (
                  <div key={v}>
                    <span>
                      {money(
                        (Math.max(...d.trend.map((t: Row) => t.total)) * v) /
                          100,
                      )}
                    </span>
                    <i />
                  </div>
                ))}
              </div>
              <div className="chart-bars">
                {d.trend.map((t: Row) => (
                  <div key={t.day} title={money(t.total)}>
                    <i
                      style={{
                        height:
                          Math.max(
                            3,
                            (t.total /
                              Math.max(...d.trend.map((x: Row) => x.total))) *
                              160,
                          ) + "px",
                      }}
                    />
                    <span>{t.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chart-empty">
              <div className="empty-chart-lines" />
              <div>
                <BarChart3 size={28} />
                <strong>Your next chapter starts with a sale</strong>
                <p>Posted transactions will appear here. No made-up numbers.</p>
                <button
                  className="text-button"
                  onClick={() => go("Point of sale")}
                >
                  Create your first sale <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
          <div className="chart-bottom">
            <span>
              Gross sales <b>{money(d.gross)}</b>
            </span>
            <span>
              Discounts <b>{money(d.discounts)}</b>
            </span>
            <span>
              Refunds <b>{money(d.refunds)}</b>
            </span>
          </div>
        </section>
        <section className="panel attention">
          <div className="panel-heading">
            <div>
              <h2>Needs your attention</h2>
              <p>A little action goes a long way</p>
            </div>
            <span className="count-pill">{low.length + near.length}</span>
          </div>
          <button className="attention-row" onClick={() => go("Inventory")}>
            <span className="attention-icon amber">
              <Package size={19} />
            </span>
            <span>
              <strong>Low-stock medicines</strong>
              <small>Restock before they run out</small>
            </span>
            <b>{low.length}</b>
            <ChevronRight size={16} />
          </button>
          <button className="attention-row" onClick={() => go("Inventory")}>
            <span className="attention-icon rose">
              <Clock size={19} />
            </span>
            <span>
              <strong>Expiring in 30 days</strong>
              <small>{money(d.stock.near)} of stock to review</small>
            </span>
            <b>{near.length}</b>
            <ChevronRight size={16} />
          </button>
          <button className="attention-row" onClick={() => go("Purchases")}>
            <span className="attention-icon blue">
              <Truck size={19} />
            </span>
            <span>
              <strong>Supplier balances</strong>
              <small>Keep your accounts up to date</small>
            </span>
            <b>{money(d.payables)}</b>
            <ChevronRight size={16} />
          </button>
          <div className="safety-note">
            <ShieldCheck size={18} />
            <p>
              Expiry-aware by design.
              <br />
              <strong>
                Expired & restricted stock is blocked at checkout.
              </strong>
            </p>
          </div>
        </section>
        <section className="panel top-medicines">
          <div className="panel-heading">
            <div>
              <h2>Top-selling medicines</h2>
              <p>The products your community relies on</p>
            </div>
            <button className="text-button" onClick={() => go("Reports")}>
              View report <ArrowRight size={14} />
            </button>
          </div>
          {d.top.length ? (
            <table>
              <thead>
                <tr>
                  <th>MEDICINE</th>
                  <th>UNITS SOLD</th>
                  <th>LINE VALUE*</th>
                </tr>
              </thead>
              <tbody>
                {d.top.map((p: Row, i: number) => (
                  <tr key={p.name}>
                    <td>
                      <span className="rank">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.units}</td>
                    <td>{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              icon={Pill}
              title="Your bestsellers will find their place here"
              text="Complete a sale to see medicine performance."
            />
          )}
          <small className="table-note">
            *Before allocated invoice discounts. Returned units excluded.
          </small>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>A pulse on your pharmacy</p>
            </div>
            <span className="live-dot" />
          </div>
          {d.activity.length ? (
            <div className="activity-list">
              {d.activity.map((a: Row) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-dot">
                    <Check size={13} />
                  </span>
                  <div>
                    <strong>
                      {a.action === "sale"
                        ? "Invoice posted"
                        : a.action === "receive"
                          ? "Stock received"
                          : a.action === "refund"
                            ? "Return processed"
                            : "Batch status updated"}
                    </strong>
                    <p>
                      {a.name} ·{" "}
                      {a.action === "sale"
                        ? `Invoice SM-${String(a.detail).padStart(6, "0")}`
                        : a.action === "receive"
                          ? "Batch received into inventory"
                          : a.action === "refund"
                            ? "Returned stock sent to inspection"
                            : "Inventory restriction updated"}
                    </p>
                  </div>
                  <small>
                    {new Date(a.created + "Z").toLocaleTimeString("en-PK", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Karachi",
                    })}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Activity}
              title="A fresh start"
              text="Stock receipts, sales and returns will appear here."
            />
          )}
          <button
            className="panel-footer-button"
            onClick={() => go("Sales & returns")}
          >
            View sales history <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <div className="quick-links">
        <div>
          <span className="stat-icon mint">
            <ShoppingCart size={21} />
          </span>
          <span>
            <strong>Ready for your next customer?</strong>
            <small>A smoother checkout starts here.</small>
          </span>
        </div>
        <button className="primary" onClick={() => go("Point of sale")}>
          Open point of sale <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <Icon size={26} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = dialog.current;
    const selectors =
      'button:not(:disabled),a[href],input:not([tabindex="-1"]),select,textarea,[tabindex="0"]';
    const nodes = () =>
      Array.from(root?.querySelectorAll<HTMLElement>(selectors) || []).filter(
        (el) => el.offsetParent !== null,
      );
    nodes()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose.current();
      }
      if (e.key === "Tab") {
        const list = nodes(),
          first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Login({
  onLogin,
  back,
}: {
  onLogin: () => Promise<void>;
  back: () => void;
}) {
  const [email, setEmail] = useState("owner@demo.smartmed.test");
  const [password, setPassword] = useState("DemoPass123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Activity />
          </span>
          SmartMed POS
        </a>
        <div>
          <span className="eyebrow">BUILT FOR THE CARE YOU GIVE</span>
          <h1>
            Your pharmacy.
            <br />
            Working beautifully.
          </h1>
          <p>
            Less time managing stock.
            <br />
            More time caring for your community.
          </p>
          <div className="login-pills">
            <span>
              <CheckCircle2 size={17} />
              Expiry-aware billing
            </span>
            <span>
              <CheckCircle2 size={17} />
              Clear, connected records
            </span>
          </div>
        </div>
        <small>Purpose-built for Pakistani pharmacies.</small>
      </div>
      <div className="login-form">
        <button className="text-button" onClick={back}>
          <ChevronLeft size={17} />
          Back to website
        </button>
        <div>
          <span className="badge">SYNTHETIC DEMO</span>
          <h1>Welcome back</h1>
          <p>Sign in to your pharmacy workspace.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/login", { email, password });
                await onLogin();
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="primary full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="demo-credentials">
            <strong>Explore a role</strong>
            <p>
              Demo password: <code>DemoPass123!</code>
            </p>
            <div>
              {[
                "owner",
                "cashier",
                "pharmacist",
                "inventory",
                "accountant",
              ].map((r) => (
                <button
                  key={r}
                  onClick={() => setEmail(r + "@demo.smartmed.test")}
                >
                  {r}
                </button>
              ))}
            </div>
            <small>
              Public demo credentials only. Never use for real pharmacy records.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
function POS({ user, refresh, notify, fail }: any) {
  const [q, setQ] = useState("");
  const products: Row[] =
    useData("/products?q=" + encodeURIComponent(q), fail) || [];
  const customers: Row[] = useData("/customers", fail) || [];
  const [cart, setCart] = useState<Row[]>([]);
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(crypto.randomUUID());
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [quote, setQuote] = useState<Row | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const total = quote?.total ?? 0;
  useEffect(() => {
    let alive = true;
    setQuote(null);
    setQuoteError("");
    if (cart.length)
      api("/quote", {
        items: cart.map((p) => ({
          productId: p.id,
          quantity: p.quantity,
          unit: p.unit,
        })),
        discount: Math.round(Number(discount) * 100),
      })
        .then((d) => {
          if (alive) setQuote(d);
        })
        .catch((e) => {
          if (alive) setQuoteError(e.message);
        });
    return () => {
      alive = false;
    };
  }, [cart, discount]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const add = (p: Row) => {
    if (!p.stock) return;
    setCart((c) =>
      c.some((x) => x.id === p.id)
        ? c.map((x) => (x.id === p.id ? { ...x, quantity: x.quantity + 1 } : x))
        : [...c, { ...p, quantity: 1, unit: "unit" }],
    );
  };
  return (
    <>
      <Title
        eyebrow="FAST, THOUGHTFUL CHECKOUT"
        title="Point of sale"
        sub="Find a medicine. Build a bill. Get back to care."
      />
      <div className="pos-layout">
        <section>
          <div className="search-box">
            <Search size={19} />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search medicine, generic, SKU or scan barcode…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && products.length === 1)
                  add(products[0]);
              }}
            />
            <kbd>F2</kbd>
          </div>
          <div className="section-caption">
            MEDICINE CATALOG <span>{products.length} products</span>
          </div>
          <div className="product-grid">
            {products.map((p) => (
              <button
                className="product-card"
                key={p.id}
                onClick={() => add(p)}
                disabled={!p.stock}
              >
                <div className="product-card-top">
                  <span className="product-icon">
                    <Pill size={24} />
                  </span>
                  {p.rx ? (
                    <span className="rx-badge">Rx</span>
                  ) : (
                    <span className="badge">OTC</span>
                  )}
                </div>
                <h3>
                  {p.name} <small>{p.strength}</small>
                </h3>
                <p>{p.generic}</p>
                <span className="product-form">
                  {p.form} · {p.box_units} units / box
                </span>
                <div className="product-card-bottom">
                  <strong>
                    {money(p.price)}
                    <small>/ unit, from</small>
                  </strong>
                  <span
                    className={p.stock <= p.reorder ? "stock low" : "stock"}
                  >
                    {number(p.stock)} available
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!products.length && (
            <Empty
              icon={Search}
              title="No medicines found"
              text="Try a brand name, generic name or barcode."
            />
          )}
        </section>
        <section className="panel cart">
          <div className="panel-heading">
            <div>
              <h2>Current bill</h2>
              <p>FEFO batch allocation at posting</p>
            </div>
            <span className="count-pill">{cart.length}</span>
          </div>
          <div className="cart-items">
            {!cart.length ? (
              <Empty
                icon={ShoppingBag}
                title="A new bill, a fresh start"
                text="Select a medicine to add it to this bill."
              />
            ) : (
              cart.map((p) => (
                <div className="cart-item" key={p.id}>
                  <div>
                    <strong>
                      {p.name} <small>{p.strength}</small>
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={"Remove " + p.name}
                      onClick={() => setCart(cart.filter((x) => x.id !== p.id))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p>
                    {money(p.price)} per unit{" "}
                    {p.rx && " · Pharmacist role required"}
                  </p>
                  <div>
                    <select
                      aria-label={"Unit for " + p.name}
                      value={p.unit}
                      onChange={(e) =>
                        setCart(
                          cart.map((x) =>
                            x.id === p.id ? { ...x, unit: e.target.value } : x,
                          ),
                        )
                      }
                    >
                      <option value="unit">Unit</option>
                      <option value="strip">Strip ({p.strip_units})</option>
                      <option value="box">Box ({p.box_units})</option>
                    </select>
                    <div className="quantity">
                      <button
                        aria-label="Decrease"
                        onClick={() =>
                          setCart(
                            cart.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    quantity: Math.max(1, x.quantity - 1),
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        aria-label="Quantity"
                        value={p.quantity}
                        onChange={(e) =>
                          setCart(
                            cart.map((x) =>
                              x.id === p.id
                                ? { ...x, quantity: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                      <button
                        aria-label="Increase"
                        onClick={() =>
                          setCart(
                            cart.map((x) =>
                              x.id === p.id
                                ? { ...x, quantity: x.quantity + 1 }
                                : x,
                            ),
                          )
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-details">
            <label>
              Customer
              <select
                aria-label="Customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name} · {money(c.balance)} due
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Discount (PKR)
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </label>
              <label>
                Payment method
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {[
                    "cash",
                    "card",
                    "bank",
                    "JazzCash",
                    "Easypaisa",
                    "credit",
                  ].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Amount tendered (PKR)
              <input
                type="number"
                min="0"
                placeholder={(total / 100).toFixed(2)}
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
              />
            </label>
            <div className="total-line">
              <span>Batch-priced total</span>
              <strong>{money(total)}</strong>
            </div>
            <small className="muted">
              Prices and quantities are checked again when posting.
            </small>
            {quoteError && <div className="error">{quoteError}</div>}
            <div className="balance-line">
              <span>
                Change:{" "}
                {money(
                  Math.max(
                    0,
                    Math.round(Number(paid || total / 100) * 100) - total,
                  ),
                )}
              </span>
              <span>
                Credit:{" "}
                {money(
                  Math.max(
                    0,
                    total - Math.round(Number(paid || total / 100) * 100),
                  ),
                )}
              </span>
            </div>
            <button
              className="primary full"
              disabled={!cart.length || busy || !quote}
              onClick={async () => {
                setBusy(true);
                try {
                  const d = await api("/sales", {
                    requestId,
                    items: cart.map((p) => ({
                      productId: p.id,
                      quantity: p.quantity,
                      unit: p.unit,
                    })),
                    discount: Math.round(Number(discount) * 100),
                    customerId: customer ? Number(customer) : null,
                    paid: Math.min(
                      total,
                      Math.round(
                        Number(paid === "" ? total / 100 : paid) * 100,
                      ),
                    ),
                    method,
                  });
                  setReceipt(await api("/invoices/" + d.id));
                  setCart([]);
                  setRequestId(crypto.randomUUID());
                  notify("Sale posted. Stock and accounts updated.");
                } catch (e: any) {
                  fail(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Posting sale…" : "Complete sale"}
              <ArrowRight size={17} />
            </button>
            <div className="bill-actions">
              <button
                onClick={() => {
                  localStorage.setItem(
                    "held-bill-" + user.id,
                    JSON.stringify({ cart, customer, discount }),
                  );
                  setCart([]);
                  notify("Bill held on this device.");
                }}
                disabled={!cart.length}
              >
                Hold bill
              </button>
              <button
                onClick={() => {
                  try {
                    const h = JSON.parse(
                      localStorage.getItem("held-bill-" + user.id) || "null",
                    );
                    if (!h) return notify("No held bill on this device.");
                    if (cart.length)
                      return fail(
                        "Hold or clear the current bill before resuming.",
                      );
                    setCart(h.cart);
                    setCustomer(h.customer);
                    setDiscount(h.discount);
                    localStorage.removeItem("held-bill-" + user.id);
                  } catch {
                    fail("Unable to resume bill");
                  }
                }}
              >
                Resume bill
              </button>
            </div>
            <p className="secure-note">
              <ShieldCheck size={13} />
              Payments are recorded, not processed.
            </p>
          </div>
        </section>
      </div>
      {receipt && (
        <Receipt
          invoice={receipt}
          close={() => {
            setReceipt(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
function Receipt({ invoice, close }: any) {
  const [width, setWidth] = useState("80");
  return (
    <Modal
      title={`Invoice SM-${String(invoice.id).padStart(6, "0")}`}
      close={close}
    >
      <div className="receipt" style={{ maxWidth: width + "mm" }}>
        <h2>{invoice.pharmacy}</h2>
        <p>SYNTHETIC DEMO · Main branch, Lahore</p>
        <p>
          SM-{String(invoice.id).padStart(6, "0")} ·{" "}
          {new Date(invoice.created + "Z").toLocaleString("en-PK", {
            timeZone: "Asia/Karachi",
          })}
        </p>
        <hr />
        {invoice.lines.map((l: Row) => (
          <div key={l.id}>
            <strong>
              {l.name} {l.strength}
            </strong>
            <p>
              {l.quantity} units × {money(l.price)}{" "}
              <span>{money(l.quantity * l.price - l.discount)}</span>
            </p>
          </div>
        ))}
        <hr />
        <p>
          Discount <span>{money(invoice.discount)}</span>
        </p>
        <h3>
          Total <span>{money(invoice.total)}</span>
        </h3>
        <p>
          Paid · {invoice.method}
          <span>{money(invoice.paid)}</span>
        </p>
        <p>
          Credit <span>{money(invoice.total - invoice.paid)}</span>
        </p>
        <hr />
        <p>Thank you for choosing care.</p>
      </div>
      <div className="form-row no-print">
        <select
          aria-label="Receipt width"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        >
          <option value="80">80 mm receipt</option>
          <option value="58">58 mm receipt</option>
        </select>
        <button className="primary" onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>
      <small className="muted no-print">
        Use your browser's print dialog to save as PDF. Printer hardware is
        unverified.
      </small>
    </Modal>
  );
}
function Inventory({ user, refresh, fail, receive }: any) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All stock");
  const rows: Row[] = useData("/batches", fail) || [];
  const shown = rows.filter(
    (b) =>
      (b.name + " " + b.number).toLowerCase().includes(q.toLowerCase()) &&
      (filter === "All stock" ||
        (filter === "Low stock" && b.quantity < 30) ||
        (filter === "Restricted" && b.status !== "available") ||
        (filter === "Near expiry" &&
          new Date(b.expiry).getTime() - Date.now() < 90 * 86400000)),
  );
  return (
    <>
      <Title
        eyebrow="EVERY BATCH ACCOUNTED FOR"
        title="Inventory"
        sub="Know what you have, where it is, and when it expires."
      >
        <button className="primary" onClick={receive}>
          <Plus size={17} />
          Receive stock
        </button>
      </Title>
      <div className="mini-stats">
        <div>
          <span>Tracked batches</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Units on hand</span>
          <strong>{number(rows.reduce((s, b) => s + b.quantity, 0))}</strong>
        </div>
        <div>
          <span>Restricted batches</span>
          <strong>{rows.filter((b) => b.status !== "available").length}</strong>
        </div>
        <div>
          <span>Stock value at cost</span>
          <strong>
            {money(rows.reduce((s, b) => s + b.quantity * b.cost, 0))}
          </strong>
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div className="tabs">
            {["All stock", "Low stock", "Near expiry", "Restricted"].map(
              (f) => (
                <button
                  className={filter === f ? "selected" : ""}
                  key={f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ),
            )}
          </div>
          <div className="search-box compact">
            <Search size={16} />
            <input
              placeholder="Search medicines or batches"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MEDICINE / BATCH</th>
                <th>EXPIRY</th>
                <th>UNITS</th>
                <th>COST / SELL</th>
                <th>STATUS</th>
                <th>CONTROL</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="medicine-cell">
                      <span className="product-icon">
                        <Pill size={18} />
                      </span>
                      <span>
                        <strong>
                          {b.name} <small>{b.strength}</small>
                        </strong>
                        <small>
                          {b.number} · {b.supplier}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        new Date(b.expiry) < new Date() ? "danger-text" : ""
                      }
                    >
                      {b.expiry}
                    </span>
                  </td>
                  <td>
                    <strong>{number(b.quantity)}</strong>
                    <small>individual units</small>
                  </td>
                  <td>
                    {money(b.cost)}
                    <small>{money(b.price)}</small>
                  </td>
                  <td>
                    <span
                      className={
                        "status " + (b.status === "available" ? "good" : "warn")
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {["owner", "pharmacist"].includes(user.role) ? (
                      <select
                        aria-label={"Status for " + b.number}
                        value={b.status}
                        onChange={async (e) => {
                          try {
                            await api(
                              "/batches/" + b.id,
                              { status: e.target.value },
                              "PATCH",
                            );
                            refresh();
                          } catch (e: any) {
                            fail(e.message);
                          }
                        }}
                      >
                        <option>available</option>
                        <option>quarantine</option>
                        <option>recalled</option>
                      </select>
                    ) : (
                      <span className="muted">Restricted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <Empty
            icon={Package}
            title="No matching batches"
            text="Try another filter or receive stock."
          />
        )}
        <div className="table-note">
          Showing {shown.length} batches · Near expiry: 90 days · Low stock:
          fewer than 30 units · Expired, recalled and quarantined stock cannot
          be sold.
        </div>
      </section>
      <MovementTable fail={fail} />
    </>
  );
}
function MovementTable({ fail }: any) {
  const rows: Row[] = useData("/movements", fail) || [];
  return (
    <section className="panel space-top">
      <div className="panel-heading">
        <div>
          <h2>Stock movement ledger</h2>
          <p>Permanent records of stock entering and leaving your shelves</p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>DATE (KARACHI)</th>
              <th>MEDICINE</th>
              <th>BATCH</th>
              <th>MOVEMENT</th>
              <th>UNITS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {new Date(r.created + "Z").toLocaleString("en-PK", {
                    timeZone: "Asia/Karachi",
                  })}
                </td>
                <td>{r.name}</td>
                <td>{r.number}</td>
                <td>{r.kind}</td>
                <td className={r.quantity > 0 ? "positive" : ""}>
                  {r.quantity > 0 ? "+" : ""}
                  {r.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Empty
          icon={ClipboardList}
          title="The ledger is ready"
          text="Receive stock or post a sale to create a movement."
        />
      )}
    </section>
  );
}
function Purchases({ user, refresh, notify, fail }: any) {
  const products: Row[] = useData("/products", fail) || [];
  const can = ["owner", "inventory", "accountant"].includes(user.role);
  const rows: Row[] = useData(can ? "/purchases" : "/products", fail) || [];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Row>({
    productId: "1",
    number: "",
    expiry: "",
    quantity: "",
    cost: "",
    price: "",
    supplier: "",
    reference: "",
    paid: "0",
  });
  return (
    <>
      <Title
        eyebrow="RECEIVE WITH CONFIDENCE"
        title="Purchases & suppliers"
        sub="Receive batches, preserve costs and keep supplier balances clear."
      >
        {["owner", "inventory"].includes(user.role) && (
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Receive a batch
          </button>
        )}
      </Title>
      <div className="info-banner">
        <ShieldCheck size={19} />
        <span>
          Every receipt creates a stock movement. Supplier invoice references
          are checked for duplicates.
        </span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Purchase receipts</h2>
            <p>Posted purchases and their outstanding balances</p>
          </div>
        </div>
        {can && rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SUPPLIER</th>
                  <th>REFERENCE</th>
                  <th>DATE</th>
                  <th>PURCHASE VALUE</th>
                  <th>PAID</th>
                  <th>BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.supplier}</strong>
                    </td>
                    <td>{r.reference}</td>
                    <td>{r.created?.slice(0, 10)}</td>
                    <td>{money(r.total)}</td>
                    <td>{money(r.paid)}</td>
                    <td>{money(r.total - r.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Truck}
            title={
              can
                ? "Your next delivery starts here"
                : "Purchase records require inventory access"
            }
            text="Batch quantities are entered in individual units. Convert boxes before receiving."
          />
        )}
      </section>
      {open && (
        <Modal title="Receive a batch" close={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/receive", {
                  ...f,
                  productId: Number(f.productId),
                  quantity: Number(f.quantity),
                  cost: Math.round(Number(f.cost) * 100),
                  price: Math.round(Number(f.price) * 100),
                  paid: Math.round(Number(f.paid) * 100),
                });
                notify("Batch received. Stock and supplier balance updated.");
                refresh();
              } catch (e: any) {
                fail(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Medicine
              <select
                aria-label="Medicine"
                value={f.productId}
                onChange={(e) => setF({ ...f, productId: e.target.value })}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.strength}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              {[
                ["number", "Batch number", "text"],
                ["expiry", "Expiry date", "date"],
                ["quantity", "Individual units", "number"],
                ["cost", "Cost per unit (PKR)", "number"],
                ["price", "Sell price per unit (PKR)", "number"],
                ["supplier", "Supplier name", "text"],
                ["reference", "Supplier invoice reference", "text"],
                ["paid", "Paid to supplier (PKR)", "number"],
              ].map(([key, label, type]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    type={type}
                    min={key === "quantity" ? 1 : 0}
                    step={
                      type === "number" && key !== "quantity"
                        ? ".01"
                        : undefined
                    }
                    value={f[key]}
                    onChange={(e) => setF({ ...f, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <p className="muted">
              This core receipt supports one batch per supplier invoice.
              Purchase orders, partial deliveries and tax/freight allocation are
              planned.
            </p>
            <button className="primary full" disabled={busy}>
              {busy ? "Receiving…" : "Post goods receipt"}
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Customers({ user, refresh, notify, fail }: any) {
  const rows: Row[] = useData("/customers", fail) || [];
  const [open, setOpen] = useState(false);
  const [repay, setRepay] = useState<Row | null>(null);
  return (
    <>
      <Title
        eyebrow="RELATIONSHIPS, NOT JUST RECORDS"
        title="Customers & credit"
        sub="Customer balances that stay connected to every transaction."
      >
        {["owner", "cashier"].includes(user.role) && (
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add customer
          </button>
        )}
      </Title>
      <section className="panel">
        <div className="panel-heading">
          <h2>Customer ledger</h2>
          <span>{rows.length} customers</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>PHONE</th>
                <th>CREDIT LIMIT</th>
                <th>OUTSTANDING</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="medicine-cell">
                      <span className="avatar">{c.name[0]}</span>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td>{c.phone}</td>
                  <td>{money(c.credit_limit)}</td>
                  <td>
                    <strong>{money(c.balance)}</strong>
                  </td>
                  <td>
                    <button
                      className="secondary"
                      disabled={
                        c.balance <= 0 ||
                        !["owner", "cashier"].includes(user.role)
                      }
                      onClick={() => setRepay(c)}
                    >
                      Record repayment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <Modal title="Add customer" close={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api("/customers", {
                  name: f.get("name"),
                  phone: f.get("phone"),
                  credit_limit: Math.round(Number(f.get("limit")) * 100),
                });
                notify("Customer added");
                refresh();
              } catch (e: any) {
                fail(e.message);
              }
            }}
          >
            <label>
              Full name
              <input name="name" required />
            </label>
            <label>
              Mobile number
              <input
                name="phone"
                required
                pattern="03[0-9]{9}"
                placeholder="03001234567"
              />
            </label>
            <label>
              Credit limit (PKR)
              <input
                name="limit"
                type="number"
                min="0"
                step=".01"
                defaultValue="5000"
                required
              />
            </label>
            <p className="muted">
              Collect only necessary contact details. No marketing messages are
              enabled.
            </p>
            <button className="primary full">Create customer</button>
          </form>
        </Modal>
      )}
      {repay && (
        <Modal title={"Repayment · " + repay.name} close={() => setRepay(null)}>
          <p>
            Outstanding: <strong>{money(repay.balance)}</strong>
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/repayments", {
                  customerId: repay.id,
                  amount: Math.round(
                    Number(new FormData(e.currentTarget).get("amount")) * 100,
                  ),
                });
                notify("Repayment recorded");
                refresh();
              } catch (e: any) {
                fail(e.message);
              }
            }}
          >
            <label>
              Cash repayment (PKR)
              <input
                name="amount"
                type="number"
                min=".01"
                step=".01"
                max={repay.balance / 100}
                required
              />
            </label>
            <button className="primary full">Record payment</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Sales({ user, refresh, notify, fail }: any) {
  const rows: Row[] = useData("/invoices", fail) || [];
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [ret, setRet] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Title
        eyebrow="A RECORD YOU CAN RELY ON"
        title="Sales & returns"
        sub="Preserved invoices. Traceable returns. Clear customer balances."
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>Invoice history</h2>
          <span>Most recent 100 invoices</span>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>INVOICE</th>
                  <th>CUSTOMER</th>
                  <th>DATE (KARACHI)</th>
                  <th>NET TOTAL</th>
                  <th>PAID</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>SM-{String(i.id).padStart(6, "0")}</strong>
                    </td>
                    <td>{i.customer || "Walk-in customer"}</td>
                    <td>
                      {new Date(i.created + "Z").toLocaleString("en-PK", {
                        timeZone: "Asia/Karachi",
                      })}
                    </td>
                    <td>{money(i.total)}</td>
                    <td>
                      {money(i.paid)}
                      <small>{i.method}</small>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          className="secondary"
                          onClick={async () => {
                            try {
                              setReceipt(await api("/invoices/" + i.id));
                            } catch (e: any) {
                              fail(e.message);
                            }
                          }}
                        >
                          <Printer size={14} />
                          Receipt
                        </button>
                        {user.role === "owner" && (
                          <button
                            className="text-button"
                            onClick={async () => {
                              try {
                                setRet(await api("/invoices/" + i.id));
                              } catch (e: any) {
                                fail(e.message);
                              }
                            }}
                          >
                            Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={ClipboardList}
            title="Your first invoice is waiting"
            text="Post a sale to begin your transaction history."
          />
        )}
      </section>
      {receipt && <Receipt invoice={receipt} close={() => setReceipt(null)} />}
      {ret && (
        <Modal
          title={"Return · SM-" + String(ret.id).padStart(6, "0")}
          close={() => setRet(null)}
        >
          <div className="info-banner">
            <ShieldCheck size={20} />
            Returned units go into quarantine for inspection.
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              try {
                const d = await api("/returns", {
                  lineId: Number(f.get("lineId")),
                  quantity: Number(f.get("quantity")),
                  reason: f.get("reason"),
                });
                notify(
                  `${money(d.refunded)} refunded; ${money(d.credit)} credit reversed. Stock quarantined.`,
                );
                refresh();
              } catch (e: any) {
                fail(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Invoice line
              <select name="lineId">
                {ret.lines
                  .filter((l: Row) => l.returned < l.quantity)
                  .map((l: Row) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.quantity - l.returned} returnable units
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Individual units to return
              <input
                name="quantity"
                type="number"
                required
                min="1"
                defaultValue="1"
              />
            </label>
            <label>
              Reason
              <textarea name="reason" required />
            </label>
            <p className="muted">
              Cash refunds are capped at the amount paid. Unpaid portions reduce
              customer credit.
            </p>
            <button
              className="primary full"
              disabled={
                busy || !ret.lines.some((l: Row) => l.returned < l.quantity)
              }
            >
              {busy ? "Processing…" : "Approve & post return"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Reports({ refresh, notify, fail }: any) {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2030-12-31");
  const d = useData(`/dashboard?from=${from}&to=${to}`, fail);
  return (
    <>
      <Title
        eyebrow="NUMBERS WITH MEANING"
        title="Reports & finances"
        sub="Recorded revenue, collections and profit. Each tells a different story."
      >
        <a className="secondary" href="/api/export" download>
          <Download size={16} />
          Export sales CSV
        </a>
      </Title>
      <div className="report-filters">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Through
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <span>Business dates · Asia/Karachi</span>
      </div>
      {d && (
        <div className="report-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Profit & loss</h2>
            </div>
            <div className="financial-list">
              {[
                ["Gross sales", d.gross],
                ["Discounts", -d.discounts],
                ["Returns", -d.refunds],
                ["Net sales", d.net],
                ["Historical cost of goods", -d.cogs],
                ["Gross profit", d.net - d.cogs],
                ["Expenses", -d.expenses],
                ["Estimated net profit", d.profit],
              ].map(([s, n]: any) => (
                <div key={s}>
                  <span>{s}</span>
                  <strong>{money(n)}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Recorded collections</h2>
                <p>Collection records, not gateway settlements</p>
              </div>
            </div>
            <div className="financial-list">
              {d.payments.map((p: Row) => (
                <div key={p.method}>
                  <span>{p.method}</span>
                  <strong>{money(p.amount)}</strong>
                </div>
              ))}
              {!d.payments.length && (
                <Empty
                  icon={Wallet}
                  title="No collections in this period"
                  text="Payments appear after sales or repayments."
                />
              )}
            </div>
            <div className="financial-list">
              <div>
                <span>Current customer debt · all dates</span>
                <strong>{money(d.credit)}</strong>
              </div>
              <div>
                <span>Current supplier balances · all dates</span>
                <strong>{money(d.payables)}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
      <section className="panel space-top">
        <div className="panel-heading">
          <div>
            <h2>Record an expense</h2>
            <p>Included in estimated net profit</p>
          </div>
        </div>
        <form
          className="expense-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api("/expenses", {
                category: f.get("category"),
                amount: Math.round(Number(f.get("amount")) * 100),
              });
              notify("Expense recorded");
              refresh();
            } catch (e: any) {
              fail(e.message);
            }
          }}
        >
          <label>
            Category
            <input
              name="category"
              placeholder="e.g. Rent, utilities, salaries"
              required
            />
          </label>
          <label>
            Amount (PKR)
            <input name="amount" type="number" min=".01" step=".01" required />
          </label>
          <button className="primary">
            <Plus size={16} />
            Record expense
          </button>
        </form>
      </section>
    </>
  );
}
function SettingsPage({ user, dark, setDark, urdu, setUrdu }: any) {
  return (
    <>
      <Title
        title="Workspace settings"
        sub="A clear view of what's configured and what's still to come."
      />
      <div className="report-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Preferences</h2>
          </div>
          <div className="settings-body">
            <label>
              Appearance
              <select
                value={dark ? "dark" : "light"}
                onChange={(e) => setDark(e.target.value === "dark")}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Language & direction
              <select
                aria-label="Language & direction"
                value={urdu ? "ur" : "en"}
                onChange={(e) => setUrdu(e.target.value === "ur")}
              >
                <option value="en">English · LTR</option>
                <option value="ur">اردو · RTL (partial translation)</option>
              </select>
            </label>
            <p>Currency: PKR · Time zone: Asia/Karachi</p>
            <p>
              Signed in as {user.email} · {user.role}
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Integration readiness</h2>
          </div>
          <div className="settings-body">
            {[
              "Payment gateways",
              "SMS / WhatsApp Business",
              "Online storefront",
              "Prescription uploads",
              "Offline device allocations",
              "Cloud backup scheduling",
              "Tax / FBR integration",
            ].map((s) => (
              <div className="integration" key={s}>
                <span>{s}</span>
                <span className="status warn">Not configured</span>
              </div>
            ))}
            <p className="muted">
              No clinical rules, regulatory certification, delivery coverage or
              live payment capabilities are claimed.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
function Public({ onEnter, onDemo }: any) {
  const [page, setPage] = useState("Home");
  const [form, setForm] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [faq, setFaq] = useState(-1);
  const features = [
    [
      "Fast, accurate billing",
      "Find medicines, sell boxes or individual units, and keep checkout moving.",
      ShoppingCart,
    ],
    [
      "Stock you can trust",
      "Track every batch, block expired stock, and make low-stock decisions earlier.",
      Boxes,
    ],
    [
      "Clarity in every rupee",
      "See recorded sales, historical costs, customer credit and estimated profit.",
      BarChart3,
    ],
    [
      "Access with accountability",
      "Keep pharmacy data separate and enforce staff permissions on the server.",
      ShieldCheck,
    ],
    [
      "Purchasing, connected",
      "Receive batches with supplier invoice checks and a permanent stock ledger.",
      Truck,
    ],
    [
      "Built around your pharmacy",
      "PKR, Karachi business dates, receipt layouts and an Urdu RTL foundation.",
      Stethoscope,
    ],
  ];
  return (
    <div className="public">
      <header className="public-nav">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setPage("Home");
          }}
        >
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          SmartMed<span className="brand-pos">POS</span>
        </a>
        <nav>
          {["Home", "Features", "Pricing", "About", "Support"].map((s) => (
            <button
              className={page === s ? "selected" : ""}
              key={s}
              onClick={() => setPage(s)}
            >
              {s}
            </button>
          ))}
        </nav>
        <div>
          <button className="text-button" onClick={onEnter}>
            Sign in <ArrowRight size={15} />
          </button>
          <button
            className="primary"
            onClick={() => {
              setForm("Book a Demo");
              setStatus("");
            }}
          >
            Book a demo
          </button>
        </div>
      </header>
      {page === "Home" ? (
        <>
          <section className="hero">
            <div className="hero-text">
              <span className="hero-label">
                <i />
                PURPOSE-BUILT FOR PAKISTANI PHARMACIES
              </span>
              <h1>
                Complete pharmacy
                <br />
                management.
                <br />
                <em>Beautifully simplified.</em>
              </h1>
              <p className="hero-accessible">
                SmartMed POS — Complete Pharmacy Management, Simplified.
              </p>
              <p>
                Fast billing. Accurate stock. Fewer expiry surprises.
                <br />
                Bring your pharmacy together in one clear workspace,
                <br />
                and make more room for the care that matters.
              </p>
              <div className="hero-buttons">
                <button
                  className="primary"
                  onClick={() => {
                    setForm("Start 1-Month Trial");
                    setStatus("");
                  }}
                >
                  Start 1-Month Trial <ArrowRight size={17} />
                </button>
                <button className="secondary" onClick={onDemo}>
                  Explore interactive demo <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="hero-checks">
                <span>
                  <Check size={15} />
                  Batch-level control
                </span>
                <span>
                  <Check size={15} />
                  Clear financial records
                </span>
                <span>
                  <Check size={15} />
                  Built for PKR
                </span>
              </div>
            </div>
            <div className="hero-preview">
              <div className="preview-top">
                <span>
                  <Activity size={17} /> SmartMed POS
                </span>
                <span className="badge">DEMO PREVIEW</span>
              </div>
              <div className="preview-content">
                <small>YOUR PHARMACY AT A GLANCE</small>
                <h2>
                  A clearer view.
                  <br />A healthier business.
                </h2>
                <div className="preview-cards">
                  <div>
                    <Wallet size={17} />
                    <small>Net sales</small>
                    <strong>PKR 0</strong>
                    <span>Ready for your first sale</span>
                  </div>
                  <div>
                    <Boxes size={17} />
                    <small>Inventory</small>
                    <strong>8 medicines</strong>
                    <span>Synthetic demo catalog</span>
                  </div>
                </div>
                <div className="preview-stock">
                  <div>
                    <strong>Every batch. Under control.</strong>
                    <ShieldCheck size={18} />
                  </div>
                  {[
                    ["Panadol", "500 mg", "1,240 units"],
                    ["Augmentin", "625 mg", "276 units"],
                    ["Glucophage", "500 mg", "640 units"],
                  ].map((p) => (
                    <div key={p[0]}>
                      <span className="product-icon">
                        <Pill size={16} />
                      </span>
                      <span>
                        <strong>{p[0]}</strong>
                        <small>{p[1]}</small>
                      </span>
                      <span>{p[2]}</span>
                    </div>
                  ))}
                </div>
                <button className="primary full" onClick={onDemo}>
                  Take a look inside <ArrowRight size={16} />
                </button>
              </div>
              <div className="floating-badge">
                <ShieldCheck size={23} />
                <span>
                  <strong>Expiry-aware. Always.</strong>
                  <small>Restricted stock stays off the bill.</small>
                </span>
              </div>
            </div>
          </section>
          <section className="public-strip">
            <span>ONE CONNECTED WORKSPACE</span>
            <strong>From your first delivery to your last receipt.</strong>
            <span>
              <Package size={19} />
              Inventory
            </span>
            <span>
              <ShoppingCart size={19} />
              Point of sale
            </span>
            <span>
              <BarChart3 size={19} />
              Reports
            </span>
          </section>
          <section className="public-section">
            <span className="eyebrow">LESS FRICTION. MORE CLARITY.</span>
            <h2>A better day behind the counter.</h2>
            <p>
              Replace billing errors, inventory confusion and unclear profit
              with connected records.
            </p>
            <div className="feature-grid">
              {features.map(([title, text, Icon]: any) => (
                <article key={title}>
                  <span className="stat-icon mint">
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="public-section steps">
            <span className="eyebrow">A THOUGHTFUL START</span>
            <h2>Four steps to your next chapter.</h2>
            <div>
              {[
                "Create your pharmacy",
                "Import & verify stock",
                "Set up your team",
                "Start billing",
              ].map((s, i) => (
                <article key={s}>
                  <span>0{i + 1}</span>
                  <h3>{s}</h3>
                  <p>
                    {
                      [
                        "Plan your branches, workflow and deployment.",
                        "Verify medicine identities, batches and conversions.",
                        "Assign the right access to the right people.",
                        "Receive stock, record sales and see the difference.",
                      ][i]
                    }
                  </p>
                </article>
              ))}
            </div>
            <p>
              CSV import and pharmacy provisioning are upcoming phases. The
              current demo starts with a synthetic catalog.
            </p>
          </section>
          <section className="public-section why">
            <div>
              <span className="eyebrow">WHY CHOOSE SMARTMED POS?</span>
              <h2>
                Because good care starts
                <br />
                with a well-run pharmacy.
              </h2>
            </div>
            <div>
              <p>
                One stock ledger. Batch-aware billing. Historical cost records.
                Clear permissions. SmartMed brings the essentials into a
                workspace designed for the way Pakistani pharmacies work.
              </p>
              <button className="primary" onClick={onDemo}>
                Explore the working demo <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </>
      ) : page === "Features" ? (
        <section className="public-section">
          <span className="eyebrow">BUILT FOR THE COUNTER</span>
          <h1>Everything starts with the essentials.</h1>
          <div className="feature-grid">
            {features.map(([title, text, Icon]: any) => (
              <article key={title}>
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <h2>Hardware, training & migration</h2>
          <p>
            Keyboard-emulating USB barcode scanners can enter codes into search.
            Browser print layouts support 58 mm and 80 mm formats; physical
            printer compatibility needs testing with your model.
          </p>
          <p>
            Training, stock migration, hosting and support scope must be agreed
            in writing before onboarding. Online storefronts, secure
            prescriptions, transfers and offline allocations are planned phases.
          </p>
        </section>
      ) : page === "Pricing" ? (
        <section className="public-section">
          <span className="eyebrow">OWNER-PROVIDED DRAFT PRICING</span>
          <h1>Choose your next step.</h1>
          <p>
            Indicative software prices only. Medicine prices belong to each
            pharmacy.
          </p>
          <div className="pricing-grid">
            {[
              [
                "One-time license",
                "45,000",
                "A license option for your pharmacy.",
              ],
              [
                "Monthly subscription",
                "5,000",
                "A monthly software subscription.",
              ],
              [
                "Custom package",
                "Let’s talk",
                "A quotation based on your requirements.",
              ],
            ].map(([s, n, t]) => (
              <article className="panel" key={s}>
                <h3>{s}</h3>
                <h2>{n === "Let’s talk" ? n : "PKR " + n}</h2>
                <p>{t}</p>
                <button
                  className="primary"
                  onClick={() => {
                    setForm("Pricing enquiry · " + s);
                    setStatus("");
                  }}
                >
                  Request details <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
          <div className="info-banner">
            <HelpCircle size={22} />
            <span>
              Deployment type, branch and user limits, hosting, backups,
              updates, support and separate service charges are not yet
              specified. Confirm a written quotation before purchase. A
              one-month trial is subject to agreed conditions.
            </span>
          </div>
          <button
            className="text-button"
            onClick={() => setPage("Trial conditions")}
          >
            Read trial conditions <ArrowRight size={16} />
          </button>
        </section>
      ) : page === "Support" ? (
        <section className="public-section narrow">
          <span className="eyebrow">HERE TO HELP YOU GET STARTED</span>
          <h1>Support & frequently asked questions</h1>
          {[
            [
              "Does this demo process payments?",
              "No. Cash, card, bank, JazzCash and Easypaisa are accounting records only. Live gateway integrations need credentials and end-to-end validation.",
            ],
            [
              "Can I use it offline?",
              "Offline billing is not implemented. Sales require a server connection. A cached screen does not provide safe offline stock allocation.",
            ],
            [
              "Is prescription approval available?",
              "Prescription medicine counter sales require an owner or pharmacist role. Uploaded prescription queues and online fulfillment are not implemented.",
            ],
            [
              "How do I get training or migrate stock?",
              "Submit a request so scope and data requirements can be agreed. No delivery timeframe or included support package has been specified.",
            ],
          ].map(([q, a], i) => (
            <div className="faq" key={q}>
              <button onClick={() => setFaq(faq === i ? -1 : i)}>
                {q}
                <Plus size={17} />
              </button>
              {faq === i && <p>{a}</p>}
            </div>
          ))}
          <button
            className="primary"
            onClick={() => {
              setForm("Support request");
              setStatus("");
            }}
          >
            Send a support request
          </button>
        </section>
      ) : page === "About" ? (
        <section className="public-section narrow">
          <span className="eyebrow">CARE, CONNECTED</span>
          <h1>A clearer way to run your pharmacy.</h1>
          <p>
            SmartMed POS is being built for Pakistani pharmacy owners and their
            teams. Our focus is practical: accurate stock, fast billing, expiry
            control and financial records that make sense.
          </p>
          <p>
            This application is an early working demo with synthetic data. No
            customer endorsements, certifications or regulatory approvals are
            claimed.
          </p>
          <button
            className="primary"
            onClick={() => {
              setForm("Contact");
              setStatus("");
            }}
          >
            Contact the team <ArrowRight size={16} />
          </button>
        </section>
      ) : (
        <section className="public-section narrow">
          <h1>{page}</h1>
          {page === "Privacy" ? (
            <>
              <p>
                Demo form submissions store the name, phone and message you
                provide in this environment. Do not submit patient details or
                prescriptions. Demo accounts are shared; never enter real
                pharmacy records.
              </p>
              <p>
                A production privacy policy, data controller contact, retention
                schedule and rights request process must be approved before
                collecting personal or health information.
              </p>
            </>
          ) : page === "Trial conditions" ? (
            <p>
              The proposed trial lasts one month. Eligibility, start date,
              deployment, support, data export, retention, any charges and
              cancellation arrangements require written confirmation. A request
              does not activate a subscription or charge you.
            </p>
          ) : (
            <p>
              This synthetic demo is for evaluation. Production service terms,
              licensing, support commitments, liability, applicable law and
              commercial conditions require owner review before a sale or live
              deployment.
            </p>
          )}
        </section>
      )}
      <section className="public-cta">
        <div>
          <h2>Make more room for better care.</h2>
          <p>See what a connected pharmacy could look like.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setForm("Book a Demo");
            setStatus("");
          }}
        >
          Book a Demo <ArrowRight size={17} />
        </button>
      </section>
      <footer className="public-footer">
        <div>
          <a className="brand" href="/">
            <span className="brand-icon">
              <Activity size={20} />
            </span>
            SmartMed POS
          </a>
          <p>Pharmacy, in sync.</p>
          <small>
            © {new Date().getFullYear()} SmartMed POS · Development demo
          </small>
        </div>
        <div>
          {[
            "Features",
            "Pricing",
            "About",
            "Support",
            "Privacy",
            "Terms",
            "Trial conditions",
          ].map((s) => (
            <button
              key={s}
              onClick={() => {
                setPage(s);
                window.scrollTo(0, 0);
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => {
              setForm("Contact");
              setStatus("");
            }}
          >
            Contact
          </button>
        </div>
      </footer>
      {form && (
        <Modal
          title={form}
          close={() => {
            setForm("");
            setError("");
          }}
        >
          {status ? (
            <div className="empty">
              <CheckCircle2 size={30} />
              <h3>{status}</h3>
              <p>
                Your request is stored in this environment. Email delivery and
                support staffing are not configured.
              </p>
              <button className="primary" onClick={() => setForm("")}>
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                const f = new FormData(e.currentTarget);
                try {
                  await api("/contact", {
                    name: f.get("name"),
                    phone: f.get("phone"),
                    message: f.get("message"),
                    website: f.get("website"),
                    kind: form,
                  });
                  setStatus("Request received");
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              <p>
                Tell us a little about your pharmacy. Please do not include
                patient information.
              </p>
              <label>
                Your name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Pakistani mobile number
                <input
                  name="phone"
                  required
                  pattern="03[0-9]{9}"
                  placeholder="03001234567"
                />
              </label>
              <label>
                How can we help?
                <textarea name="message" required maxLength={2000} />
              </label>
              <label className="honeypot" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="primary full">
                Send request <ArrowRight size={16} />
              </button>
              <p className="muted">
                We store your request locally. Submitting does not activate a
                paid plan.
              </p>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
