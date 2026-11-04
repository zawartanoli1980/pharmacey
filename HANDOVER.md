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
