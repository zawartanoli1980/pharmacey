# SmartMed POS

A working **synthetic demo**, built from an empty repository. React + TypeScript frontend, Express backend, SQLite relational storage using Node's built-in SQLite API. This is an early core implementation, **not a production-ready pharmacy system**.

## Start

Requires Node **24.22 or newer** and npm 11. From this checkout:

```sh
npm ci
npm run dev
```

The server uses port 3000 (override `PORT`). `/` is the software website; `/app` is the management workspace. There is no separate storefront yet. SQLite data lives in `data/smartmed.sqlite`, outside source control. Migrations apply at startup and demo data is seeded only into an empty database. `.env.example` documents variables; to load a local file explicitly, run `node --env-file=.env server/index.js`.

Production asset smoke test:

```sh
npm run build
NODE_ENV=production npm start
```

Here “production” means serving compiled assets, not a declaration of security or business readiness. Keep `DEMO_MODE=true` for evaluation. Setting it false prevents seeding but does not provision real pharmacies or enable real integrations. **Never use the shared demo database or published passwords for patient information.**

## Demo accounts

All passwords: `DemoPass123!` (published synthetic accounts only).

| Email                         | Role                                                    |
| ----------------------------- | ------------------------------------------------------- |
| owner@demo.smartmed.test      | Owner                                                   |
| cashier@demo.smartmed.test    | Cashier                                                 |
| pharmacist@demo.smartmed.test | Pharmacist                                              |
| inventory@demo.smartmed.test  | Inventory operator                                      |
| accountant@demo.smartmed.test | Accountant                                              |
| other@demo.smartmed.test      | Owner of a separate, empty pharmacy for isolation tests |

## Working flows

- Public home, features, draft pricing, about, support/FAQs, privacy, terms and trial conditions. Contact/demo/trial requests validate Pakistani phone numbers, use a honeypot and rate limit, and persist locally. No outbound email or SMS is configured.
- Session login, scrypt password hashes, 8-hour expiry, HTTP-only SameSite cookies, login limits, same-origin write checks, server role checks and pharmacy-scoped reads/writes.
- Dashboard and report totals derive from invoices, line costs, returns, payments, expenses, customer balances and purchases. Empty sales displays are intentional, not fabricated activity.
- Medicine search by brand, generic, strength, SKU and barcode; F2 search focus; keyboard-emulating barcode input.
- Batch receiving in individual units with purchase costs, supplier invoice duplicate checks, payment/balance records and stock movement history. One batch per receipt reference currently.
- FEFO allocation, batch prices, box/strip/unit conversion, server-generated quotes, expired/recalled/quarantined stock blocks, no-negative-stock constraints and transactional posting.
- Integer **paisa** amounts, historical invoice costs and prices, allocated discounts, cashier 5% discount limit, Rx counter sale restriction to owner/pharmacist, sale request idempotency.
- Cash/card/bank/JazzCash/Easypaisa **recording**, change calculation, partial credit, credit limits, customer creation and FIFO repayment allocation.
- One held bill per staff account/browser (local storage); invoices, 58/80 mm browser receipts and browser Save as PDF.
- Owner-authorized partial/full returns, bounded cash refunds, credit reversal, return reasons, stock quarantine and audit records.
- Inventory status control, low/near-expiry filters, ledger, sales CSV export, expenses and period reports using Asia/Karachi business dates.
- Responsive public and management layouts, dark mode and an **incomplete Urdu translation with RTL layout**.
- Manual SQLite backup/restore utility with integrity checks and refusal to overwrite existing files.

## Verification

```sh
npm test              # 9 business-rule tests, fresh in-memory databases
npm run build         # TypeScript and optimized frontend build
npm run test:http     # requires running demo server; mutates synthetic data
npm run test:browser  # requires server and /usr/bin/chromium; synthetic UI workflows
```

Browser tests use an installed Chromium via `playwright.config.ts`. Change its executable path for another environment. HTTP and browser tests deliberately create synthetic transactions; do not run against real data. They should run serially, because the HTTP concurrency test temporarily quarantines demo Panadol batches and restores their original available status in a finally block.

## Backup and recovery

```sh
node server/backup.js backup data/smartmed.sqlite /tmp/smartmed-backup.sqlite
node server/backup.js restore /tmp/smartmed-backup.sqlite /tmp/smartmed-restored.sqlite
node server/backup.js check /tmp/smartmed-restored.sqlite
```

Use fresh destination paths. To switch to restored data, stop the application, set `DATABASE_PATH` to the restored file, and restart. SQLite's backup API handles a live source consistently. Backups contain all pharmacies in this instance; only trusted system operators should access them. Automated scheduling, encryption, remote storage and retention are **not configured**. Keep copies outside the machine before it is destroyed.

See [HANDOVER.md](HANDOVER.md) for acceptance coverage, limitations and remaining phases.
