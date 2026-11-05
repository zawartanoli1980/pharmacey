# Implementation handover

## Acceptance status

| Requested workflow                         | Delivered evidence / limits                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receive and sell a batch, stock and profit | Business tests for historical COGS; HTTP and browser receiving/sale paths. Report arithmetic uses transaction records.                                                           |
| Box / strip / unit conversion              | Core test sells 123 units as 1 box, 2 strips and 3 units. Browser exercises strip sale.                                                                                          |
| Block expired, recalled, quarantined       | Core test covers all three; checkout only selects eligible batches.                                                                                                              |
| Partial refund and payment cap             | Core tests cover rounding, full cumulative return, over-return and credit reversal; browser partial-return path.                                                                 |
| Credit and partial repayment               | HTTP checks FIFO allocation then refund; browser credit/repayment path. No advances, due dates or aging yet.                                                                     |
| Simultaneous online and counter orders     | Competing HTTP **counter sales** tested; shared transactional stock prevents negative quantities. No storefront/reservations yet, so this full acceptance item is unimplemented. |
| Owner, cashier, pharmacist permissions     | Core and HTTP permission tests; all endpoints authenticate except health/login/contact. Owner/pharmacist can sell Rx; there is no dedicated signoff queue.                       |
| Prescription orders pending review         | Unimplemented; no uploads or storefront. Do not accept prescription files through public forms.                                                                                  |
| Offline sync without duplicates            | Unimplemented. All sale posting requires server connectivity. Idempotency exists for online retries only.                                                                        |
| Restore a backup                           | Backup API, restore to a new file, integrity check and restored invoice comparison. No automated scheduler/remote retention.                                                     |
| Pharmacy isolation                         | HTTP invoice access denied for second pharmacy; core sale/return ownership tests. No branch model yet.                                                                           |
| Urdu / mobile / receipt printing           | Browser checks RTL and mobile overflow; printable receipt preview. Translation is partial and hardware printing not verified.                                                    |

## Deliberate boundaries

The project is one pharmacy branch per tenant at present. No business contacts, customers, certifications, delivery coverage or support promises are fabricated. All seeded names and sample transactions are synthetic. Draft software pricing is separate from medicine prices. Public legal pages describe evaluation limitations, not approved production contracts.

A payment-method selection only records money already collected. There is no real payment processing, SMS, WhatsApp messaging, e-mail notification, FBR, OCR, clinical data, delivery service or cloud storage integration. All integration settings state “Not configured.”

Product stock prices/costs are integer paisa; stock counts and conversions are integer units. Avoid fractional units. Invoice conversions are captured by allocated individual-unit quantities; named conversion history is not separately stored. Invoice totals represent original posted sales; return reversals appear in separate permanent records and reporting.

The current initial schema is in `server/db.js` with a migration version table. Existing source data must not be destructively reset to apply future migrations. The small compatibility migration adding refund cash/credit columns is for early demo databases only; deployments with old posted refunds require a supervised reconciliation before use.

## Remaining phases

1. Complete core operational features: catalog management and validated CSV/Excel import/export, supplier profiles and payments, multi-batch invoices, purchase orders/partial deliveries, cost allocation, stock adjustments and approvals, stock counts, shelf/storage fields, receipt sharing, split payments/advances, shift reconciliation, void reversals, robust pagination and richer audit views.
2. Multi-branch and staff administration: branch scope on every record and query, managers and custom permission policies, transfers, user invitations, password reset with a real delivery provider, privileged 2FA and support access authorization.
3. Optional storefront: tenant branding, inventory reservations and expiry release, secure private prescription uploads, pharmacist review, delivery policies/areas, customer authentication, order/payment state machines and concurrent counter/order tests.
4. Designed offline operation: device identities and explicit stock allocations, authenticated local queues, deduplication/conflict reconciliation and tested recovery. A PWA alone must not be described as offline billing.
5. Deployment hardening: managed TLS and trusted proxy configuration; secure cookies; production account provisioning; file/data encryption and retention; automated encrypted backups with recovery drills; dependency/security review; external health monitoring and operational logs.
6. Complete human-reviewed Urdu translations, a full accessibility audit, hardware validation, approved commercial/legal text and credential-backed integration adapters. Validate current official tax requirements before implementing them.

No live pharmacy/patient data should be entered until these production prerequisites are resolved. The implementation is suitable for review and core workflow development.

## Interface enhancement delivery

- Added a reusable startup splash with real initialization, timeout/error recovery and retry; authentication still controls entry to management.
- Added a collapsible/dismissible floating quick-action shelf to the public and management experiences. Links are role-aware; the shelf hides during form entry, keyboard use and dialogs. Existing desktop checkout remains sticky.
- Added shared, account/pharmacy-scoped picture preferences for Inventory, POS and Settings, compact picture-free layouts, neutral missing/broken-image placeholders and keyboard-accessible image previews.
- Added owner/inventory image upload/removal with staff verification, real content decoding, size/dimension restrictions, static WebP re-encoding and metadata removal. A separate migration preserves posted financial records. Changes are audited and image reads remain pharmacy-scoped.
- Added shared motion/layer tokens, page/dialog/button transitions and reduced-motion overrides; receipt print styles suppress image controls and floating chrome.
- Replaced shell-specific production startup and hard-coded browser executable paths. Added a Windows `.cmd` launcher that starts in the extracted project folder. Test screenshots use the operating system temporary directory.

No verified medicine photographs were supplied, so neutral placeholders are intentional. Staff attestation confirms the uploaded picture's intended identity; this is not automatic clinical or authenticity verification. Picture preferences remain local to the browser, not synchronized between devices. Full Urdu translation, storefront, prescriptions and offline operation remain outside this upgrade.

Validation for this upgrade: TypeScript/production build passed; all 9 existing business-rule tests and 5 image/migration tests passed; both HTTP integration tests passed; all 6 Chromium browser workflows passed, including picture preference isolation, upload/preview, floating actions, startup recovery, mobile RTL/dark/reduced-motion behavior and receipt print styling. A backup containing images was restored and compared against source image bytes, posted invoices, stock, payments, refunds, balances and audit entries. These executions were on Linux using a system Chromium selected by environment variables. Windows launcher syntax and portable defaults were reviewed; actual Windows execution and physical printer behavior were not tested in this session.

## Floating medicine gallery

Added the reusable `FloatingMedicineGallery` component across authenticated screens, with large verified-image cards, catalog-derived product details and availability/prices, enlarged previews, previous/next and keyboard navigation, touch swipes, position indicators and optional slow autoplay. Photos are never invented; staff upload them through the existing verified image manager.

A reserved desktop rail prevents the fixed panel covering content. Narrow screens use a viewport layout with a dedicated bottom panel and an independently scrolling workspace, so search and checkout controls remain reachable above the gallery. Mobile form entry minimizes it. Header controls reopen the gallery; display preferences are scoped per pharmacy/account. Quick-action back-to-top behavior also supports the narrow workspace scroller. Dark mode, RTL, reduced motion, loading/error/empty states and print exclusion are included.

The gallery uses existing private catalog/image endpoints and preserves the current 100-product catalog response limit. It refreshes after existing application operations and periodically while visible. It is not shown on public website or login pages because no approved public medicine assets/feed exists. Catalog density preferences and gallery visibility are independent. Existing billing and stock transaction logic, database schema and permissions are unchanged.

Gallery validation: production/TypeScript build passed; all 14 business-rule/image/migration tests and both HTTP integration checks passed; all 12 Chromium browser workflows passed, including six dedicated gallery cases. These cover actual catalog values, desktop rail separation/sticky positioning, enlarged-preview focus return, arrows/keyboard, minimize/close/reopen, account isolation, autoplay pause/reduced motion, request retry, broken images, mobile swipe, checkout visibility, dark RTL and print exclusion. Browser fixtures use neutral synthetic image files to test the photo pipeline, not fabricated medicine packaging. Real pharmacy photographs were not supplied and remain staff-uploaded assets. Physical touch devices/printers and this gallery's Windows browser execution were not tested in this Linux session.

## Windows dependency-startup repair

Fixed the launcher assuming an existing `node_modules` directory meant installation was complete. It now verifies every declared development/runtime package against the lockfile, checks package main/ESM/types/bin entry files and the imported font stylesheets, and runs `npm.cmd ci --include=dev` if the check fails. It checks again before starting the server. Startup instructions now print the actual active port instead of an unconditional 3000 URL.

Regression validation used an isolated project copy: a clean locked install passed the checker, removal of `lucide-react` was detected, and a second locked install restored it and passed the production build. Package signature/checksum checks and install-script validation remained enabled. Actual Windows execution of this repaired launcher still requires user-side verification; these executions were on Linux.
