import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, RotateCcw, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import type { ReturnItem } from '../../types';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved:  'bg-green-500/10 text-green-400 border-green-500/20',
  rejected:  'bg-stitch-error/10 text-stitch-error border-stitch-error/20',
  completed: 'bg-stitch-primary/10 text-stitch-primary border-stitch-primary/20',
};

const RETURN_TYPES = [
  { value: 'cash_refund', label: 'Cash Refund' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'exchange', label: 'Exchange' },
];

interface SaleItem {
  id: string;
  inventoryUnit: {
    id: string;
    serialNumber: string;
    status: string;
    product: { id: string; name: string; brand: string | null };
  };
}

interface SaleLookup {
  id: string;
  invoiceNumber: string;
  status: string;
  items: SaleItem[];
  customer: { id: string; name: string } | null;
}

function CreateReturnModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [sale, setSale] = useState<SaleLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [returnType, setReturnType] = useState('cash_refund');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors';
  const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

  const lookupInvoice = async () => {
    const num = invoiceNumber.trim();
    if (!num) return;
    setLookupLoading(true);
    setLookupError('');
    setSale(null);
    setSelectedSerials(new Set());
    try {
      const res = await api.get<SaleLookup>(`/sales/by-invoice/${encodeURIComponent(num)}`);
      setSale(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setLookupError(e.response?.data?.message ?? `Invoice "${num}" not found`);
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleSerial = (serial: string) => {
    setSelectedSerials((prev) => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial); else next.add(serial);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || selectedSerials.size === 0) { setSubmitError('Select at least one item to return'); return; }
    if (reason.trim().length < 5) { setSubmitError('Reason must be at least 5 characters'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.post('/returns', {
        saleId: sale.id,
        serialNumbers: [...selectedSerials],
        reason: reason.trim(),
        returnType,
      });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSubmitError(e.response?.data?.message ?? 'Failed to create return');
    } finally {
      setSubmitting(false);
    }
  };

  const returnableItems = sale?.items.filter((i) => i.inventoryUnit.status === 'sold') ?? [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="glass-modal rounded-xl w-full max-w-lg border border-white/10 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-stitch-on-surface font-space">New Return</h2>
          <button onClick={onClose} className="text-stitch-on-surface-variant hover:text-white transition-colors">
            <XCircle size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          <div>
            <label className={labelCls}>Invoice Number</label>
            <div className="flex gap-2">
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void lookupInvoice(); } }}
                placeholder="INV-2024-001"
                className={`${inputCls} font-mono`}
              />
              <button
                type="button"
                onClick={() => void lookupInvoice()}
                disabled={lookupLoading || !invoiceNumber.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 disabled:opacity-50 transition-all shrink-0"
              >
                {lookupLoading
                  ? <span className="w-4 h-4 border-2 border-stitch-on-primary/30 border-t-stitch-on-primary rounded-full animate-spin" />
                  : <Search size={14} />}
                Find
              </button>
            </div>
            {lookupError && (
              <p className="text-xs text-stitch-error mt-1.5 flex items-center gap-1.5">
                <AlertTriangle size={11} />{lookupError}
              </p>
            )}
          </div>

          {sale && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm">
                <p className="font-mono text-stitch-primary font-bold">{sale.invoiceNumber}</p>
                {sale.customer && (
                  <p className="text-stitch-on-surface-variant text-xs mt-0.5">{sale.customer.name}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>
                  Select Items to Return ({selectedSerials.size} selected)
                </label>
                {returnableItems.length === 0 ? (
                  <p className="text-sm text-stitch-on-surface-variant py-3">No returnable items on this invoice.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {returnableItems.map((item) => {
                      const checked = selectedSerials.has(item.inventoryUnit.serialNumber);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-stitch-primary/10 border-stitch-primary/30'
                              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSerial(item.inventoryUnit.serialNumber)}
                            className="accent-stitch-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stitch-on-surface truncate">
                              {item.inventoryUnit.product?.name ?? '—'}
                            </p>
                            <p className="text-xs font-mono text-stitch-tertiary">{item.inventoryUnit.serialNumber}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Return Type</label>
                <select value={returnType} onChange={(e) => setReturnType(e.target.value)} className={inputCls}>
                  {RETURN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  minLength={5}
                  placeholder="Describe the reason for return…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {submitError && (
                <p className="text-xs text-stitch-error flex items-center gap-1.5">
                  <AlertTriangle size={11} />{submitError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedSerials.size === 0}
                  className="flex-1 py-2.5 text-sm bg-stitch-error text-stitch-on-error font-bold rounded-lg hover:bg-stitch-error/80 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {submitting ? 'Submitting…' : `Submit Return (${selectedSerials.size})`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

interface ApproveRejectModalProps {
  returnId: string;
  action: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: () => void;
}

function ApproveRejectModal({ returnId, action, onClose, onSuccess }: ApproveRejectModalProps) {
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors';
  const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.patch(`/returns/${returnId}/${action}`, {
        reviewNotes: notes || undefined,
        ...(action === 'approve' && refundAmount ? { refundAmount: parseFloat(refundAmount) } : {}),
      });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="glass-modal rounded-xl w-full max-w-sm p-6 space-y-4 border border-white/10">
        <h2 className="font-bold text-stitch-on-surface font-space capitalize">{action} Return</h2>
        <p className="text-sm text-stitch-on-surface-variant">
          Please confirm this return request.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {action === 'approve' && (
            <div>
              <label className={labelCls}>Refund Amount (₨)</label>
              <input type="number" min="0" step="0.01" value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>
              Review Notes{action === 'reject' ? ' *' : ' (optional)'}
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              required={action === 'reject'}
              className={`${inputCls} resize-none`} />
          </div>
          {error && <p className="text-xs text-stitch-error flex items-center gap-1.5"><AlertTriangle size={11} />{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-2 text-sm text-stitch-on-primary font-bold rounded-lg disabled:opacity-50 active:scale-95 transition-all ${
                action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-stitch-error hover:bg-stitch-error/80'
              }`}>
              {loading ? '…' : action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ returnId: string; action: 'approve' | 'reject' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    api.get<{ data: ReturnItem[] }>(`/returns?status=${statusFilter}&limit=50`)
      .then((r) => setReturns(r.data.data ?? []))
      .catch(() => setReturns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.return-card');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, [loading, returns]);

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-error/10 flex items-center justify-center">
            <RotateCcw size={20} className="text-stitch-error" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Returns</h1>
            <p className="text-xs text-stitch-on-surface-variant">Return requests and OTP-verified approvals</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95"
          >
            <Plus size={14} /> New Return
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 text-sm text-stitch-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {['pending', 'approved', 'rejected', 'completed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
              statusFilter === s
                ? 'bg-stitch-primary text-stitch-on-primary'
                : 'bg-white/5 text-stitch-on-surface-variant hover:bg-white/10 hover:text-white border border-white/5'
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {returns.length === 0 && !loading && (
          <div className="glass-card rounded-xl py-16 text-center">
            <CheckCircle size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
            <p className="text-sm text-stitch-on-surface-variant">No {statusFilter} returns</p>
          </div>
        )}

        {loading && returns.length === 0 && (
          <div className="flex justify-center py-16">
            <span className="w-8 h-8 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
          </div>
        )}

        {returns.map((r) => (
          <div key={r.id}
            className={`return-card glass-card rounded-xl p-5 space-y-3 ${
              r.suspiciousFlag ? 'border border-amber-500/30' : ''
            }`}
            style={r.suspiciousFlag ? { boxShadow: '0 0 15px rgba(245,158,11,0.08)' } : undefined}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-stitch-on-surface text-sm">
                    {r.inventoryUnit?.product?.name ?? 'Unknown Product'}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                  {r.suspiciousFlag && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle size={9} /> Suspicious
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-stitch-tertiary mt-0.5">{r.inventoryUnit?.serialNumber}</p>
              </div>
              <p className="text-xs text-stitch-on-surface-variant shrink-0 font-mono">
                {format(new Date(r.createdAt), 'dd MMM, h:mm a')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Invoice', value: r.sale?.invoiceNumber ?? '—', mono: true },
                { label: 'Customer', value: r.sale?.customer?.name ?? '—' },
                { label: 'Type', value: r.returnType.replace('_', ' '), capitalize: true },
                { label: 'Requested By', value: r.requestedBy?.name ?? '—' },
              ].map(({ label, value, mono, capitalize }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">{label}</p>
                  <p className={`text-sm text-stitch-on-surface mt-0.5 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>{value}</p>
                </div>
              ))}
            </div>

            {r.refundAmount != null && (
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                Refund: {formatPKR(Number(r.refundAmount))}
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Reason</p>
              <p className="text-sm text-stitch-on-surface mt-0.5">{r.reason}</p>
            </div>

            {r.reviewNotes && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Review Notes</p>
                <p className="text-sm text-stitch-on-surface mt-0.5">{r.reviewNotes}</p>
              </div>
            )}

            {isOwner && r.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal({ returnId: r.id, action: 'approve' })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-all active:scale-95">
                  <CheckCircle size={14} /> Approve
                </button>
                <button onClick={() => setModal({ returnId: r.id, action: 'reject' })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stitch-error text-stitch-on-error text-sm font-bold rounded-lg hover:bg-stitch-error/80 transition-all active:scale-95">
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateReturnModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); setStatusFilter('pending'); load(); }}
        />
      )}

      {modal && (
        <ApproveRejectModal
          returnId={modal.returnId}
          action={modal.action}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
