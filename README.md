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
npm start
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
npm test              # 9 business-rule tests + 5 image/migration tests
npm run build         # TypeScript and optimized frontend build
npm run test:http     # requires running demo server; mutates synthetic data
npm run test:browser  # requires server and Playwright Chromium
```

Install the browser once with `npx playwright install chromium`. Browser tests default to Playwright's managed Chromium on Windows, macOS and Linux. If using an existing browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to its executable path. `PLAYWRIGHT_NO_SANDBOX=true` is an explicit option for restricted container environments; it is not required for normal Windows testing. HTTP and browser tests deliberately create synthetic transactions; do not run against real data. They should run serially, because the HTTP concurrency test temporarily quarantines demo Panadol batches and restores their original available status in a finally block.

## Backup and recovery

```sh
node server/backup.js backup data/smartmed.sqlite /tmp/smartmed-backup.sqlite
node server/backup.js restore /tmp/smartmed-backup.sqlite /tmp/smartmed-restored.sqlite
node server/backup.js check /tmp/smartmed-restored.sqlite
```

Use fresh destination paths. To switch to restored data, stop the application, set `DATABASE_PATH` to the restored file, and restart. SQLite's backup API handles a live source consistently. Backups contain all pharmacies in this instance; only trusted system operators should access them. Automated scheduling, encryption, remote storage and retention are **not configured**. Keep copies outside the machine before it is destroyed.

## Interface upgrade

The public website and dashboard now share a motion system and a collapsible floating quick-action shelf. The shelf occupies a reserved area and hides while forms, on-screen keyboards or dialogs need the space. Its actions respect each account's role; the header button restores it after dismissal. A back-to-top action appears on long pages.

The startup splash follows real server/session initialization. It adds no fixed waiting time, does not replay during in-app navigation, and offers a retry when connection fails. Reduced-motion preferences disable animated effects throughout the interface.

Use **Show medicine pictures** in Inventory, POS or Settings. This is a browser preference scoped to the signed-in pharmacy and account; hiding pictures removes their containers and keeps product details and billing available. No branded product photography is included: unverified or missing pictures use neutral placeholders.

Owners and inventory operators can use **Add picture / Edit picture** in Inventory. They must confirm the medicine and strength match and that the image is approved for use. The server validates JPEG/PNG/WebP contents, a 2 MB limit, 32–4096 pixel source dimensions and static images. It resizes to at most 1600 pixels, re-encodes to WebP, strips metadata and saves an audit entry. Authenticated pharmacy-scoped image routes serve the pictures; no public upload directory is exposed. Migration 003 adds a separate image table without changing historical invoices or stock. Images are included in database backups. Prescription uploads remain unimplemented and must never be sent as product pictures.

## Floating medicine gallery

A dedicated **Medicine gallery** now appears across the authenticated pharmacy workspace. On desktop screens at least 1280 px wide it occupies a reserved right-side rail and stays visible when the page scrolls. On narrower screens it becomes a collapsible panel above the bottom safe area, with the workspace content scrolling in the space above it. It minimizes during mobile form entry so search and checkout remain usable. The header's **Show medicine gallery** button reopens it after dismissal. Display mode is remembered separately for each pharmacy/account in this browser.

Cards show the brand, generic name, strength, dosage form, eligible unit availability and the actual minimum eligible batch price, labelled **From** per individual unit. Only products with a stored price show a price. Click a verified photo to open the existing enlarged-image preview. Products without a staff-verified picture use a labelled neutral placeholder and authorized image managers can open Inventory to add pictures. No medicine photographs are fabricated or bundled.

Use previous/next buttons, Arrow keys, Home/End, or horizontal swipes to browse. RTL layouts mirror directional navigation and isolate medicine strengths from surrounding RTL text. Autoplay is **off by default**; the play button enables a slow 6.5-second interval. It pauses while hovered, focused, any dialog is open, the tab is hidden, or data is refreshing, and is disabled when reduced motion is preferred. The reusable component accepts `autoplayInterval` (minimum 5 seconds).

The gallery uses the existing authenticated catalog and image routes, loads up to the catalog endpoint's existing 100-product limit, refreshes after recorded operations and once a minute while the tab is visible, and handles loading, missing images, empty catalogs and request failures. It is excluded from receipts and print layouts. The catalog's **Show medicine pictures** preference controls in-table/POS thumbnails; the independent gallery has its own minimize and close controls. Public website visitors do not receive a pharmacy's private catalog. No new storefront or public medicine feed is introduced.

## Windows PowerShell

Extract the full ZIP. Double-click **Start-SmartMed.cmd** to launch from the correct folder; it checks the installed dependency versions and entry files, then reinstalls the locked dependencies if anything is missing or incomplete. Alternatively open PowerShell in the folder containing `package.json` and `package-lock.json`, then run each command in order:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Open `http://localhost:3000/app` on your own PC after the server starts. Keep the terminal open. Stop with Ctrl+C. This launcher is for local evaluation and does not configure a Windows service.

To run browser tests, keep the server running and use a second PowerShell window in the same project folder:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:http
npm.cmd run test:browser
```

Windows command syntax has been reviewed, but this session's actual executions took place on Linux; Windows runtime behavior remains to be verified on your PC.

See [HANDOVER.md](HANDOVER.md) for acceptance coverage, limitations and remaining phases.

If Vite reports `lucide-react` or another import cannot be resolved, stop the server with Ctrl+C. From the folder containing `package.json` and `package-lock.json`, run `npm.cmd ci --include=dev` and then `npm.cmd run dev`. The clean installation also refreshes Vite's dependency cache. Do not delete the database to repair a dependency installation. The Windows launcher now runs `scripts/check-dependencies.mjs` before startup, including checking ESM entry files, and repairs incomplete installations through the lockfile. The server prints the actual active port and browser URL after binding.
