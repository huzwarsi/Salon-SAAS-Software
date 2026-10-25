import type { Booking } from '../../types/booking';
import type { Invoice } from '../../types/salon';

export interface ClientLedgerEntry {
  id: string; date: string; time: string; type: 'INVOICE' | 'PAYMENT';
  reference: string; description: string; debit: number; credit: number; balance: number;
  status: string; method?: string; processedBy?: string; rawInvoice?: Invoice;
}
const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const localStamp = (stamp?: string) => {
  const date = stamp ? new Date(stamp) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: '', time: '' };
  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date),
    time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false }).format(date),
  };
};
const minutes = (time: string) => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hour = Number(match[1]);
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
};

/** Unapplied deposits are customer credits. Booking commitments stay separate from invoice dues. */
export function buildClientLedger(details: { invoices: Invoice[]; bookings?: Booking[] }): ClientLedgerEntry[] {
  const rows: ClientLedgerEntry[] = [];
  const recordedNet = new Map<string, number>();
  const invoiceBooking = new Map<string, string>();
  const push = (row: Omit<ClientLedgerEntry, 'balance'>) => rows.push({ ...row, balance: 0 });
  for (const b of details.bookings || []) {
    if (b.linkedInvoiceId) invoiceBooking.set(b.linkedInvoiceId, b.id);
    for (const p of b.payments || []) {
      recordedNet.set(b.id, round((recordedNet.get(b.id) || 0) + (p.isRefund ? -p.amount : p.amount)));
      push({ id: `booking-pay-${p.id}`, date: p.date, time: p.time || '00:00', type: p.isRefund ? 'INVOICE' : 'PAYMENT',
        reference: p.receiptNumber || b.bookingNumber,
        description: `${p.isRefund ? 'Booking advance refund' : 'Booking advance payment'} (${b.bookingNumber} · ${p.method})`,
        debit: p.isRefund ? p.amount : 0, credit: p.isRefund ? 0 : p.amount, status: p.isRefund ? 'REFUNDED' : 'CLEARED', method: p.method, processedBy: p.processedByName });
    }
    if (['CANCELLED', 'NO_SHOW'].includes(b.status) && b.cancellationCharge > 0) {
      const event = b.history?.find(h => h.type === 'BOOKING_CANCELLED');
      const stamp = localStamp(event?.createdAt || b.updatedAt || b.createdAt);
      push({ id: `booking-fee-${b.id}`, date: typeof event?.after?.date === 'string' ? event.after.date : stamp.date || b.eventDate, time: stamp.time || '00:00', type: 'INVOICE', reference: b.bookingNumber,
        description: `Approved booking cancellation charge (${event?.reason || b.cancellationReason || b.status})`,
        debit: b.cancellationCharge, credit: 0, status: 'PAID', processedBy: event?.userName });
    }
  }
  for (const inv of details.invoices) {
    push({ id: `inv-${inv.id}`, date: inv.date, time: inv.time || '00:00', type: 'INVOICE', reference: inv.invoiceNumber,
      description: `Sales bill (${inv.lineItems?.length || inv.lines?.length || 1} items; tips separate)`, debit: round(inv.total - (inv.tip || 0)), credit: 0,
      status: inv.lifecycle === 'VOIDED' ? 'VOIDED' : inv.status, processedBy: inv.processedByName, rawInvoice: inv });
    if (inv.advanceAdjusted) {
      const bookingId = inv.bookingId || invoiceBooking.get(inv.id);
      const alreadyRecorded = bookingId ? recordedNet.get(bookingId) || 0 : 0;
      push({ id: `advance-${inv.id}`, date: inv.date, time: inv.time || '00:00', type: 'PAYMENT', reference: inv.invoiceNumber,
        description: 'Prior booking advance applied to this invoice', debit: 0, credit: round(Math.max(0, inv.advanceAdjusted - alreadyRecorded)), status: 'APPLIED', rawInvoice: inv });
    }
    for (const p of inv.payments || []) {
      const billAmount = p.billAmountAllocated ?? round(p.amount - (p.tipAmountAllocated || 0));
      push({ id: `pay-${p.id}`, date: p.date, time: p.time || '00:00', type: 'PAYMENT', reference: p.receiptNumber || inv.invoiceNumber,
        description: `${p.kind === 'DUES_COLLECTION' ? 'Dues collection' : 'POS payment'} (${p.method})`, debit: 0, credit: billAmount,
        status: p.reversedAt ? 'REVERSED' : 'CLEARED', method: p.method, processedBy: p.processedByName, rawInvoice: inv });
      if (p.reversedAt) {
        const stamp = localStamp(p.reversedAt);
        push({ id: `rev-${p.id}`, date: p.reversalDate || stamp.date, time: stamp.time, type: 'INVOICE', reference: p.receiptNumber || inv.invoiceNumber,
          description: `Collection reversed: ${p.reversalReason || ''}`, debit: billAmount, credit: 0, status: 'REVERSED', processedBy: p.reversedByName, rawInvoice: inv });
      }
    }
    for (const refund of inv.refunds || []) {
      const stamp = localStamp(refund.createdAt);
      push({ id: `refund-charge-${refund.id}`, date: refund.refundDate, time: stamp.time, type: 'PAYMENT', reference: refund.refundNumber,
        description: `${refund.type === 'VOID' ? 'Invoice void' : 'Service refund'}: charges reversed (${refund.reason})`, debit: 0,
        credit: round(refund.netReversed + refund.taxReversed), status: refund.type === 'VOID' ? 'VOIDED' : 'REFUNDED', processedBy: refund.byName, rawInvoice: inv });
      const billCashOut = round(refund.cashOut - (refund.tipReversed || 0));
      if (billCashOut > 0) push({ id: `refund-cash-${refund.id}`, date: refund.refundDate, time: stamp.time, type: 'INVOICE', reference: refund.refundNumber,
        description: `Refund paid to client (${refund.method || 'CASH'})`, debit: billCashOut, credit: 0, status: 'REFUNDED', method: refund.method, processedBy: refund.byName, rawInvoice: inv });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));
  let balance = 0;
  for (const row of rows) { balance = round(balance + row.debit - row.credit); row.balance = balance; }
  return rows.reverse();
}
