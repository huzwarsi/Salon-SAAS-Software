import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { salonService } from '@/services';
import {
  Invoice,
  PaymentAccount,
  RefundInvoiceInput,
  RefundLineInput,
  RefundInvoiceResult,
} from '@/types/salon';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/context/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  AlertTriangle,
  RotateCcw,
  Ban,
  CheckCircle2,
  DollarSign,
  Package,
  Scissors,
  Layers,
  Wallet,
  Building,
  Loader2,
  Info,
} from 'lucide-react';

interface RefundVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: (result: RefundInvoiceResult) => void;
}

const QUICK_REASONS = [
  'Customer Request',
  'Dissatisfied with Service',
  'Billing / Pricing Error',
  'Product Return / Exchange',
  'Duplicate Invoice',
  'Customer Cancelled Appointment',
];

export const RefundVoidModal: React.FC<RefundVoidModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [actionType, setActionType] = useState<'VOID' | 'REFUND'>('VOID');
  const [reason, setReason] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'ONLINE_ACCOUNT'>('CASH');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Line selections for REFUND mode: lineId -> { selected, quantity, restock }
  const [lineSelections, setLineSelections] = useState<
    Record<
      string,
      {
        selected: boolean;
        quantity: number;
        restock: 'RESALABLE' | 'DAMAGED' | 'NONE';
      }
    >
  >({});

  // Reset & initialize state when invoice changes or modal opens
  useEffect(() => {
    if (!isOpen || !invoice) {
      setReason('');
      setActionType('VOID');
      setLineSelections({});
      return;
    }

    const lines = invoice.lines || invoice.lineItems || [];
    const initial: Record<
      string,
      {
        selected: boolean;
        quantity: number;
        restock: 'RESALABLE' | 'DAMAGED' | 'NONE';
      }
    > = {};

    lines.forEach((l) => {
      // Calculate remaining quantity if refunds already exist
      const alreadyRefunded = (invoice.refunds || [])
        .flatMap((r) => r.lines || [])
        .filter((rl) => rl.lineId === l.id)
        .reduce((sum, rl) => sum + Number(rl.quantity || 0), 0);
      const remaining = Math.max(0, l.quantity - alreadyRefunded);

      initial[l.id] = {
        selected: remaining > 0,
        quantity: remaining,
        restock: l.type === 'PRODUCT' ? 'RESALABLE' : 'NONE',
      };
    });

    setLineSelections(initial);

    // Default refund method to match how the customer paid if online account was used
    if (invoice.paymentMethod === 'ONLINE_ACCOUNT' || invoice.paymentAccountId) {
      setRefundMethod('ONLINE_ACCOUNT');
      if (invoice.paymentAccountId) setSelectedAccountId(invoice.paymentAccountId);
    } else {
      setRefundMethod('CASH');
    }

    // Load available online/payment accounts for the branch
    if (invoice.branchId) {
      setIsLoadingAccounts(true);
      salonService
        .getPaymentAccounts(invoice.branchId)
        .then((accounts) => {
          setPaymentAccounts(accounts.filter((a) => a.isActive));
          if (!selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
          }
        })
        .catch((err) => console.error('Failed to load payment accounts:', err))
        .finally(() => setIsLoadingAccounts(false));
    }
  }, [isOpen, invoice]);

  const lines = useMemo(() => {
    if (!invoice) return [];
    return invoice.lines || invoice.lineItems || [];
  }, [invoice]);

  // Already refunded quantities map
  const alreadyRefundedMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!invoice || !invoice.refunds) return map;
    for (const r of invoice.refunds) {
      for (const l of r.lines || []) {
        map.set(l.lineId, (map.get(l.lineId) || 0) + Number(l.quantity || 0));
      }
    }
    return map;
  }, [invoice]);

  // Reactive financial calculations for preview
  const calculations = useMemo(() => {
    if (!invoice) {
      return {
        netReversed: 0,
        taxReversed: 0,
        totalReversed: 0,
        cashOut: 0,
        receivableCancelled: 0,
        canSubmit: false,
      };
    }

    const isVoid = actionType === 'VOID';

    let netReversed = 0;
    let taxReversed = 0;
    let selectedLineCount = 0;

    for (const line of lines) {
      const already = alreadyRefundedMap.get(line.id) || 0;
      const remaining = Math.max(0, line.quantity - already);
      if (remaining <= 0) continue;

      let refundQty = 0;
      if (isVoid) {
        refundQty = remaining;
        selectedLineCount++;
      } else {
        const sel = lineSelections[line.id];
        if (sel && sel.selected && sel.quantity > 0) {
          refundQty = Math.min(sel.quantity, remaining);
          selectedLineCount++;
        }
      }

      if (refundQty > 0) {
        const ratio = refundQty / (line.quantity || 1);
        const lineNet = line.quantity > 0 ? (line.netSales || 0) * ratio : 0;
        const lineTax = line.quantity > 0 ? (line.tax || 0) * ratio : 0;
        netReversed += lineNet;
        taxReversed += lineTax;
      }
    }

    const totalReversed = netReversed + taxReversed;

    // Money received vs effective bill
    const prevPaid = Number(invoice.amountPaid || 0);
    const prevDue = Number(invoice.amountDue || 0);

    // Cash out cannot exceed what was actually paid
    const cashOut = Math.min(prevPaid, totalReversed);
    const receivableCancelled = Math.min(prevDue, Math.max(0, totalReversed - cashOut));

    const canSubmit =
      (isVoid || selectedLineCount > 0) &&
      reason.trim().length >= 3 &&
      (cashOut <= 0 || refundMethod === 'CASH' || (refundMethod === 'ONLINE_ACCOUNT' && !!selectedAccountId));

    return {
      netReversed: Math.round(netReversed * 100) / 100,
      taxReversed: Math.round(taxReversed * 100) / 100,
      totalReversed: Math.round(totalReversed * 100) / 100,
      cashOut: Math.round(cashOut * 100) / 100,
      receivableCancelled: Math.round(receivableCancelled * 100) / 100,
      canSubmit,
    };
  }, [invoice, lines, actionType, lineSelections, alreadyRefundedMap, reason, refundMethod, selectedAccountId]);

  const handleSubmit = async () => {
    if (!invoice || !calculations.canSubmit) return;

    setIsSubmitting(true);
    try {
      let payloadLines: RefundLineInput[] | undefined = undefined;

      if (actionType === 'REFUND') {
        payloadLines = [];
        for (const line of lines) {
          const sel = lineSelections[line.id];
          if (sel && sel.selected && sel.quantity > 0) {
            payloadLines.push({
              lineId: line.id,
              quantity: sel.quantity,
              restock: line.type === 'PRODUCT' ? sel.restock : 'NONE',
            });
          }
        }
      }

      const payload: RefundInvoiceInput = {
        type: actionType,
        reason: reason.trim(),
        refundMethod: calculations.cashOut > 0 ? refundMethod : undefined,
        paymentAccountId:
          calculations.cashOut > 0 && refundMethod === 'ONLINE_ACCOUNT'
            ? selectedAccountId
            : undefined,
        lines: payloadLines,
      };

      const result = await salonService.refundInvoice(invoice.id, payload, user || undefined);

      toast.success(
        actionType === 'VOID'
          ? `Invoice ${invoice.invoiceNumber} has been VOIDED successfully.`
          : `Refund of ${formatCurrency(calculations.totalReversed)} processed successfully.`
      );

      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Refund / Void execution failed:', err);
      toast.error(err.message || 'Failed to process refund. Please check permissions and cash drawer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto font-sans p-6">
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  actionType === 'VOID'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {actionType === 'VOID' ? <Ban className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  {actionType === 'VOID'
                    ? 'Void Invoice'
                    : 'Issue Sale Refund'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-[#9D2558]">{invoice.invoiceNumber}</span>
                  <span>•</span>
                  <span>{invoice.clientName || 'Walk-in'}</span>
                  <span>•</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold ${
                      invoice.lifecycle === 'VOIDED'
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : invoice.lifecycle === 'REFUNDED'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : invoice.lifecycle === 'PARTIALLY_REFUNDED'
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {invoice.lifecycle || 'ACTIVE'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Action Type Selector Cards - Simple & Clean */}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <button
            type="button"
            onClick={() => setActionType('VOID')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              actionType === 'VOID'
                ? 'border-rose-500 bg-rose-50/70 shadow-xs ring-1 ring-rose-500 text-rose-900'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <span className="text-xs font-bold flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>Full Void</span>
            </span>
            {actionType === 'VOID' && <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => setActionType('REFUND')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              actionType === 'REFUND'
                ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-500 text-amber-900'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <span className="text-xs font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Line-Item Refund</span>
            </span>
            {actionType === 'REFUND' && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
          </button>
        </div>

        {/* Line Items Table */}
        <div className="mt-3.5 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Items ({lines.length})</span>
            <span className="text-[11px] text-slate-500 font-medium">Bill Total: {formatCurrency(invoice.total)}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {lines.map((line) => {
              const already = alreadyRefundedMap.get(line.id) || 0;
              const remaining = Math.max(0, line.quantity - already);
              const sel = lineSelections[line.id] || { selected: false, quantity: 0, restock: 'NONE' };
              const isFullyRefunded = remaining <= 0;

              return (
                <div
                  key={line.id}
                  className={`p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isFullyRefunded
                      ? 'bg-slate-50/70 opacity-60'
                      : sel.selected && actionType === 'REFUND'
                      ? 'bg-amber-50/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {actionType === 'REFUND' && (
                      <input
                        type="checkbox"
                        disabled={isFullyRefunded}
                        checked={sel.selected}
                        onChange={(e) => {
                          setLineSelections((prev) => ({
                            ...prev,
                            [line.id]: {
                              ...prev[line.id],
                              selected: e.target.checked,
                              quantity: e.target.checked ? (prev[line.id]?.quantity || remaining) : 0,
                            },
                          }));
                        }}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900">{line.name}</span>
                        {already > 0 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-medium">
                            {already} refunded
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {line.quantity} × {formatCurrency(line.unitPrice || 0)} = {formatCurrency(line.total || 0)}
                        {line.staffName && <span className="font-sans text-slate-400"> ({line.staffName})</span>}
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Restock Controls (if in REFUND mode) */}
                  {actionType === 'REFUND' && !isFullyRefunded && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={remaining}
                          disabled={!sel.selected}
                          value={sel.quantity || 1}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1));
                            setLineSelections((prev) => ({
                              ...prev,
                              [line.id]: { ...prev[line.id], quantity: val },
                            }));
                          }}
                          className="w-12 text-center text-xs border border-slate-300 rounded px-1 py-0.5 bg-white font-mono disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <span className="text-[11px] text-slate-400">/ {remaining}</span>
                      </div>

                      {line.type === 'PRODUCT' && (
                        <select
                          disabled={!sel.selected}
                          value={sel.restock}
                          onChange={(e) => {
                            setLineSelections((prev) => ({
                              ...prev,
                              [line.id]: {
                                ...prev[line.id],
                                restock: e.target.value as 'RESALABLE' | 'DAMAGED' | 'NONE',
                              },
                            }));
                          }}
                          className="text-[11px] border border-slate-300 rounded px-2 py-0.5 bg-white disabled:bg-slate-100"
                        >
                          <option value="RESALABLE">Restock</option>
                          <option value="DAMAGED">Damaged</option>
                          <option value="NONE">No Restock</option>
                        </select>
                      )}
                    </div>
                  )}

                  {/* Void mode display */}
                  {actionType === 'VOID' && (
                    <div className="text-right text-[11px] font-semibold text-rose-600">
                      Void all {remaining}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Refund Payment Source Section (If money has been paid) */}
        {calculations.cashOut > 0 && (
          <div className="mt-3.5 p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Return Payout:</span>
                <span className="font-mono text-emerald-700 text-sm font-bold">{formatCurrency(calculations.cashOut)}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                  refundMethod === 'CASH'
                    ? 'border-[#9D2558] bg-[#FDF2F5] text-[#9D2558] font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="refundMethod"
                  value="CASH"
                  checked={refundMethod === 'CASH'}
                  onChange={() => setRefundMethod('CASH')}
                  className="text-[#9D2558]"
                />
                <Wallet className="w-4 h-4" />
                <span>Cash Drawer</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                  refundMethod === 'ONLINE_ACCOUNT'
                    ? 'border-[#9D2558] bg-[#FDF2F5] text-[#9D2558] font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="refundMethod"
                  value="ONLINE_ACCOUNT"
                  checked={refundMethod === 'ONLINE_ACCOUNT'}
                  onChange={() => setRefundMethod('ONLINE_ACCOUNT')}
                  className="text-[#9D2558]"
                />
                <Building className="w-4 h-4" />
                <span>Bank / Online</span>
              </label>
            </div>

            {refundMethod === 'ONLINE_ACCOUNT' && (
              <div className="pt-1">
                {isLoadingAccounts ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading accounts...
                  </div>
                ) : (
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger className="w-full text-xs h-8.5 bg-white border border-slate-300 rounded-lg">
                      <SelectValue placeholder="Select Bank / Account" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {paymentAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.name} ({acc.accountType}) — Bal: {formatCurrency(acc.currentBalance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reason Section (Required) */}
        <div className="mt-3.5 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Reason <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => setReason(qr)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  reason === qr
                    ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {qr}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason or notes..."
            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-1 focus:ring-[#9D2558] focus:border-[#9D2558]"
          />
        </div>

        {/* Financial Summary */}
        <div className="mt-3.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="block text-[10px] text-slate-500 font-medium">Reversed Net</span>
              <span className="font-bold text-rose-600 text-xs font-mono">
                -{formatCurrency(calculations.netReversed)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="block text-[10px] text-slate-500 font-medium">Reversed Tax</span>
              <span className="font-bold text-rose-600 text-xs font-mono">
                -{formatCurrency(calculations.taxReversed)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="block text-[10px] text-slate-500 font-medium">Customer Payout</span>
              <span className="font-bold text-emerald-600 text-xs font-mono">
                {formatCurrency(calculations.cashOut)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="block text-[10px] text-slate-500 font-medium">Cancelled Due</span>
              <span className="font-bold text-slate-700 text-xs font-mono">
                {formatCurrency(calculations.receivableCancelled)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!calculations.canSubmit || isSubmitting}
            className={`text-white text-xs gap-1.5 ${
              actionType === 'VOID'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
              </>
            ) : actionType === 'VOID' ? (
              <>
                <Ban className="w-3.5 h-3.5" /> Confirm Void Invoice
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" /> Process Sale Refund
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
