# Bridal / Groom Bookings — PRD and implementation plan

Source of truth for event bookings in Meerub Salon Software. Follow existing Express/Prisma,
salonService, branch scope, cash custody, invoice, audit and commission patterns.

## Product flow

Bookings → New Booking → Bridal / Groom → Client/event → Services/pricing → Save with or
without advance → Installments/ledger → Open in POS → Final invoice → Completed.

## Requirements and decisions

- Explicit BRIDAL / GROOM selection, independent of client profile.
- Existing branch client or new name/mobile; reuse normalized-phone client lookup.
- Required branch, event date and service time; optional notes and special requirements.
- **Staff is optional** on booking, lines and package components. Unassigned booking can be
  saved, paid and checked out. No implicit assignment to a real employee.
- Optional lead staff defaults onto lines; explicit component/line assignments override it.
- Unassigned completed services belong to House / Salon and earn no staff commission.
- Assigned staff must be active in branch, within shift, not on leave and not overlapping
  appointments or bookings. Unassigned lines reserve no staff capacity.
- Mixed catalog SERVICE / PACKAGE and booking-only CUSTOM_SERVICE lines are supported.
- Custom service: name, optional description, price, duration and quantity. No automatic catalog
  insertion; promotion uses the existing explicit admin catalog creation flow.
- Snapshot catalog price, tax treatment, package components and allocation percentages.
  Later catalog edits must not silently change the agreed booking.
- Server computes subtotal minus discount plus applicable line tax. Decimal arithmetic only.
- Price/service changes require reason and preserve before/after snapshots and balance history.
- Save without advance; collect installments or full payment later. Store receipt, amount,
  business date, method, reference, notes, collecting user, drawer/account and booking number.
- Cash uses collecting user's eligible drawer, preserving getActiveDrawer auto-open behavior;
  locked/settled drawers reject movement. postCashMovement requires holderId, not drawerId.
- Online payment uses selected active branch-accessible account.
- Net payments = receipts minus refunds. Remaining = current charges minus valid net payments.
- Initially reject overpayments and price reduction below net received; refund excess first.
- Individual booking ledger includes charges, installments, refunds, pricing adjustments,
  cancellation adjustment and invoice transfer. Client profile groups multiple bookings separately.
- Separate pending booking commitments and advances from invoiced dues to avoid double counting.
- Status: CONFIRMED → IN_PROGRESS → COMPLETED, plus CANCELLED / NO_SHOW. Payment status is
  independently UNPAID / PARTIALLY_PAID / FULLY_PAID.
- Complete only via POS invoice. Partial/unpaid final invoices remain supported, consistent with
  existing POS; subsequent dues collection goes through invoice payments.
- Admin cancellation/no-show requires reason, approved retained fee and refund allocation that
  exactly reconciles held advances. Use an eligible current drawer/account for refund; preserve
  original receipt. No separate booking refund after invoicing.

## Architecture and financial safety

1. Separate Booking aggregate, BookingItem snapshots, BookingPayment and append-only history.
   Preserve appointments' existing required-staff behavior.
2. Global existing sequence format: BKG-0001 / BPR-0001; register sequence.js sources.
3. Admins manage bookings; accountants can list/read, collect and open POS. STAFF denied.
   Enforce roles/branch/active branch server-side, independent of menu visibility.
4. Financial writes use idempotency + paymentPosting so responses and writes commit together.
   Lock booking before payments, edits, cancellation or conversion.
5. Both scheduling modules use the same branch/day advisory lock and check each other's
   reservations. Exclude cancelled/no-show and the record currently being edited.
6. Use existing Decimal helpers and proportional discount rounding; snapshot line tax rates.
7. BOOKING_ADVANCE posts custody IN, not sales revenue or commission. BOOKING_REFUND posts OUT.
   Movement source identifies individual receipt for reconciliation.
8. Advance is a settlement allocation, never a discount/new receipt. Invoice advanceAdjusted
   records applied advance; amountPaid includes advance plus new receipts; amountDue subtracts
   advance and new bill allocations. Tips stay separate.
9. Invoice bookingId is unique. Checkout loads authoritative booking/client/branch/advance under
   lock. Never trust browser advance amount or arbitrary catalog/custom price overrides.
10. POS revisions require reason and optimistic revision check; persist final services/pricing
    and history atomically with invoice. Failed checkout leaves the booking unchanged.
11. Create invoice, apply advance once, record new payments, accrue commission and complete
    booking in one transaction. Fully prepaid checkout posts no new custody movement.
12. Reuse package component commission allocation. Custom service is a service with zero COGS;
    only explicitly assigned eligible staff earn commission, on final completed service invoice.
13. Invoice refund/void must handle previously applied advances within its own cash-out rules;
    preserve original payments and reversal history. No double refund via booking endpoints.
14. Cash reports include deposits; service sales only come from final invoices. Cancellation fee
    is separate income. Pending booking charges are commitments, not another sales ledger.

## Persistence

Booking: number, branch/client snapshots, type, date/start/end/duration, optional lead staff,
notes/requirements, status, revision, totals/discount snapshots, cancellation fee/reason,
creator/updater and timestamps. Invoice owns unique nullable bookingId relation.

BookingItem: stable lineInstanceId, order, SERVICE/PACKAGE/CUSTOM_SERVICE, nullable itemId,
name/code/description, quantity, duration, unit price, tax rate/treatment, optional staff,
component snapshots including duration, allocation percentage and optional staff.

BookingPayment: unique receipt, direction RECEIPT/REFUND, amount/date/time/method, drawer/account
and movement links, reference/notes, actor and timestamps. No hard deletion.

BookingHistory: event type, before/after JSON, reason, actor and timestamp. Preserve price,
service, scheduling, status, cancellation and invoice transfer events.

Derive net receipts, balance and payment status from payments (and invoice after conversion).
Do not keep several independently writable copies of those balances.

Schema changes also include booking movement enums, CUSTOM_SERVICE LineType, nullable
InvoiceLine.itemId, invoice advanceAdjusted, complete relation pairs and indexes.

## API and frontend

**Open in POS uses the existing `POSBillingPage` and its normal cart/payment/receipt UI.**
There is no separate booking checkout page. `/pos?bookingId=...` loads the booking branch,
client, catalog/custom snapshots, component staff, notes, event details and discount into POS.
Prior advance is shown separately and deducted from the amount to collect. Changed services,
staff or pricing require a reason and are revised atomically in the existing invoice endpoint.
Retail items added in POS remain on the final invoice and are included in its booking ledger.

For SUPER_ADMIN, New Reservation requires an explicit branch selection inside the modal,
matching the appointment form. The selected branch controls client, catalog, staff, tax and
payment-account loading and is sent as `branchId` on creation. Changing branch clears
branch-specific selections and advance inputs. ADMIN stays on their assigned branch;
existing bookings retain their original branch. After creation, the list shows the saved branch.

New Reservation includes an optional **Collect advance now** section with amount, business
date, Cash / Online method, branch payment account, reference and notes. It submits
`advancePayment` with the booking in the existing atomic create request, shows the remaining
balance, and opens payment receipts after a successful save. Leave it unchecked to save
without payment. Existing bookings use the installment action for subsequent payments.

Module: backend/src/modules/bookings/{bookings.schema,bookings.mapper,bookings.service,
bookings.controller,bookings.routes}.js; mount /api/v1/bookings.

| Method | Path | Purpose |
|---|---|---|
| GET | /bookings | Filter branch/type/status/date/client/search; summaries |
| GET | /bookings/collections | Receipt/refund report filtered by collection date |
| POST | /bookings | Atomic/idempotent create, optional initial advance |
| GET | /bookings/:id | Items/payments/history/invoice |
| PUT | /bookings/:id | Revision-checked edit, mandatory change reason |
| PATCH | /bookings/:id/status | Start service, no direct completion |
| POST | /bookings/:id/payments | Idempotent installment |
| POST | /bookings/:id/refunds | Admin refund of unapplied advance |
| POST | /bookings/:id/cancel | Cancel/no-show, fee/refund reconciliation |
| GET | /bookings/:id/ledger | Chronological commitment statement |
| GET | /bookings/:id/pos-handoff | Authoritative cart, advance and revision |

Extend frontend services/salonService.ts and http/httpSalonService.ts with types. Mock must
support equivalent behavior or explicitly require live API; never silently save booking money
only in browser storage. Add navigation/AppRouter, booking list/detail/form, installment/refund,
printable receipt/ledger and POS handoff. Use existing branch context and shared controls.
Staff defaults to Unassigned. UI shows Bridal/Groom, total, received, remaining and both statuses.

## Ordered implementation and verification

- [x] Step 0: Review existing flows and redesign this plan against the PRD.
- [x] Step 1: Schema/migration, sequences, validation and money calculations. Verify optional
  staff, custom services, explicit type, discount/tax boundaries.
- [x] Step 2: Booking CRUD/history and scheduling. Verify snapshots, revision conflict,
  optional staff and cross-module conflict/leave/shift checks.
- [x] Step 3: Installments/refunds/cancellation/ledger. Verify idempotency, concurrent payment,
  drawer/account reconciliation, price reduction and full prepayment.
- [x] Step 4: POS snapshots/custom services, prior advance, invoice link and refund/void.
  Verify partial/fully prepaid checkout, duplicate invoice rejection, commission and tips.
- [x] Step 5: Frontend contract, booking UI, receipts, route and POS handoff. Typecheck/build;
  browser flow verification when browser tools are available.
- [x] Step 6: Client profile and reports: booking commitments, deposit cash flow, cancellation
  fees, sales revenue, outstanding balances and custody reconciliation. CSV/print output.
- [x] Step 7: Isolated lifecycle/regression tests and deployment notes.

Acceptance: 30,000 booking → 5,000 cash → 10,000 bank → 15,000 remaining → checkout receives
15,000 → invoice paid 30,000, due zero → completed. Checkout cash increases only 15,000;
original deposits retain original dates; commission is earned exactly once at invoicing.

Prepare SQL migration without resetting data. Deploy using the repository migration workflow.
Do not apply unrelated schema drift or run database reset.

## Implementation verification (2026-10-25)

- Booking feature implemented through schema, API, optional staff scheduling, payments,
  cancellation/refunds, POS advance settlement, UI, client profile, printing and reports.
- 68/68 tests passed across appointments, cash, inventory, POS and bookings (15 booking
  lifecycle tests plus 4 POS handoff tests).
- TypeScript check and production frontend build passed.
- Local database migration 20261025120000_event_bookings applied without resetting records.
- Existing seed branch upsert repaired; regression expectations updated to current global
  reference format and payment-account options endpoint.
- Booking screen includes event-date outstanding report and collection-date advance/refund
  report. Custom catalog promotion remains an explicit action through Services & Packages.
- Browser smoke test passed for the existing POS: non-default branch and client loaded,
  custom service preserved, prior 15,000 advance deducted from a 30,000 bill, and the normal
  checkout submitted only the remaining 15,000. API fixtures were intercepted to avoid
  creating any real salon transactions. Screenshot: artifacts/booking-in-existing-pos.png.
- Prisma DLL lock resolved by restarting the verified project backend. Prisma Client
  generation succeeded; migration status is up to date; API/database health and Booking
  model read checks passed.

Re-run backend verification: `node scripts/run-isolated-tests.js --config vitest.bookings-regression.config.js`.
This creates/drops its own isolated test database; never resets the working salon database.

Completion: all seven implementation steps are complete. Backend, frontend build and
existing-POS browser smoke checks passed. The former separate BookingCheckout component and
router interception have been removed. Browser runner: frontend/scripts/verify-booking-pos.cjs
(pass a local playwright-core module path).

## Read-only live-data audit — 2026-10-25

Actual database/API/browser checks passed: 4 bookings, 4 clients, 4 advance receipts and
3 linked invoices. PKR 14,000 matched booking payments, cash custody and Income & Expense
cash receipts, with zero advance recognized as service revenue. All four actual client
ledgers and the actual report were opened in the browser without mocked data or writes.

The audit fixed booking-scoped advance credits, cancellation/refund/void client ledger
entries, business-date handling, invoice refund DTOs, report reversal accounting and cash
display/export signs. Unapplied advances appear as client credit separately from invoice
dues. Current UI uses Calendar / Bookings Table; receipt-date collections remain available
through `/bookings/collections` and Income & Expense cash-flow rows.

79/79 isolated regression tests, TypeScript and production build passed. The working
database has no bank booking receipts/refunds; those cases were tested in isolation.
Evidence: `artifacts/booking-audit-report.md` and `artifacts/booking-data-audit.json`.
