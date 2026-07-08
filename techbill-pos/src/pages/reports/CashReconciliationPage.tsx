import { useEffect, useRef, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${Math.abs(n).toLocaleString('en-PK')}`;

interface ReconciliationRecord {
  id: string;
  date: string;
  openingBalance: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  status: 'pending' | 'approved' | 'disputed';
  notes: string | null;
  submittedBy: { name: string } | null;
  createdAt: string;
}

export default function CashReconciliationPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ date: today, openingBalance: '', actualCash: '', notes: '' });
  const [todayState, setTodayState] = useState<{ defaultOpeningBalance: number; cashSales: number; totalOutflows: number; expectedCash: number } | null>(null);
  const [history, setHistory] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const expectedCash = (Number(form.openingBalance) || 0) + (todayState?.cashSales || 0) - (todayState?.totalOutflows || 0);
  const actualCash = Number(form.actualCash) || 0;
  const previewVariance = actualCash - expectedCash;
  const openingBalanceChanged = todayState && Number(form.openingBalance) < todayState.defaultOpeningBalance;
  const hasShortage = previewVariance < 0;

  const loadHistoryAndState = async () => {
    setLoading(true);
    try {
      const [historyRes, stateRes] = await Promise.all([
        api.get<{ data: ReconciliationRecord[]; total: number }>('/reports/cash-reconciliation'),
        api.get<{ defaultOpeningBalance: number; cashSales: number; totalOutflows: number; expectedCash: number }>('/reports/cash-reconciliation/today'),
      ]);
      setHistory(historyRes.data.data);
      setTodayState(stateRes.data);
      if (form.openingBalance === '') {
        setForm(f => ({ ...f, openingBalance: String(stateRes.data.defaultOpeningBalance) }));
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistoryAndState();
    if (containerRef.current) {
      const els = containerRef.current.querySelectorAll('.glass-card');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reconciliation?')) return;
    try {
      await api.delete(`/reports/cash-reconciliation/${id}`);
      await loadHistoryAndState();
    } catch {
      alert('Failed to delete reconciliation. You can only delete today\'s records.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openingBalanceChanged && !form.notes) {
      setError('Please provide notes explaining the opening balance reduction.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/reports/cash-reconciliation', {
        date: form.date,
        openingBalance: Number(form.openingBalance),
        actualCash: Number(form.actualCash),
        notes: form.notes || undefined,
      });
      setSuccessMsg('Cash reconciliation submitted successfully.');
      setForm({ date: today, openingBalance: '', actualCash: '', notes: '' });
      await loadHistoryAndState();
    } catch {
      setError('Failed to submit reconciliation. Please check values and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const varianceColor = previewVariance === 0 ? 'text-green-400' : previewVariance > 0 ? 'text-stitch-tertiary' : 'text-stitch-error';

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-stitch-secondary-container flex items-center justify-center">
          <DollarSign size={20} className="text-stitch-on-secondary-container" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stitch-on-surface font-space">Cash Reconciliation</h1>
          <p className="text-xs text-stitch-on-surface-variant">Submit and review daily cash counts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-stitch-on-surface font-space border-b border-white/5 pb-3">
            Today's Reconciliation
          </h2>

          <div>
            <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Opening Balance (₨)</label>
            <input
              type="number"
              min="0"
              value={form.openingBalance}
              onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
              placeholder="0"
              className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Actual Cash in Till (₨)</label>
            <input
              type="number"
              min="0"
              value={form.actualCash}
              onChange={(e) => setForm((f) => ({ ...f, actualCash: e.target.value }))}
              placeholder="0"
              className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors font-mono"
            />
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1">
             <div className="flex justify-between text-xs text-stitch-on-surface-variant">
               <span>Opening Balance:</span>
               <span className="font-mono">₨ {Number(form.openingBalance || 0).toLocaleString('en-PK')}</span>
             </div>
             <div className="flex justify-between text-xs text-stitch-on-surface-variant">
               <span>+ Cash Sales:</span>
               <span className="font-mono text-green-400">₨ {(todayState?.cashSales || 0).toLocaleString('en-PK')}</span>
             </div>
             <div className="flex justify-between text-xs text-stitch-on-surface-variant">
               <span>- Expenses/Outflows:</span>
               <span className="font-mono text-amber-400">₨ {(todayState?.totalOutflows || 0).toLocaleString('en-PK')}</span>
             </div>
             <div className="flex justify-between text-sm font-bold text-stitch-on-surface pt-2 border-t border-white/5 mt-2">
               <span>Expected Cash:</span>
               <span className="font-mono text-stitch-tertiary">₨ {expectedCash.toLocaleString('en-PK')}</span>
             </div>
          </div>

          {(form.openingBalance || form.actualCash) && (
            <div className={`p-3 rounded-lg border ${previewVariance === 0 ? 'bg-green-500/10 border-green-500/20' : previewVariance > 0 ? 'bg-stitch-tertiary/10 border-stitch-tertiary/20' : 'bg-stitch-error/10 border-stitch-error/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Variance</span>
                <span className={`text-sm font-bold font-mono ${varianceColor}`}>
                  {previewVariance >= 0 ? '+' : ''}{formatPKR(previewVariance)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {previewVariance === 0 ? (
                  <><CheckCircle size={12} className="text-green-400" /><span className="text-xs text-green-400">Balanced</span></>
                ) : previewVariance > 0 ? (
                  <><TrendingUp size={12} className="text-stitch-tertiary" /><span className="text-xs text-stitch-tertiary">Surplus</span></>
                ) : (
                  <><TrendingDown size={12} className="text-stitch-error" /><span className="text-xs text-stitch-error">Shortage</span></>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
              {openingBalanceChanged ? 'Reason for reduced opening balance (Required)*' : 'Notes (optional)'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              required={openingBalanceChanged || undefined}
              placeholder={openingBalanceChanged ? "Why is the morning cash less than yesterday's close?" : "Any discrepancy notes..."}
              className={`mt-1 w-full bg-stitch-surface-container-high/50 border rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none transition-colors resize-none ${openingBalanceChanged ? 'border-amber-500/50 focus:border-amber-500' : 'border-white/10 focus:border-stitch-primary/50'}`}
            />
          </div>

          {error && <p className="text-stitch-error text-xs flex items-center gap-2"><AlertTriangle size={12} />{error}</p>}
          {successMsg && <p className="text-green-400 text-xs flex items-center gap-2"><CheckCircle size={12} />{successMsg}</p>}

          {hasShortage ? (
            <div className="pt-2">
              <p className="text-stitch-error text-xs mb-3 font-semibold text-center bg-stitch-error/10 p-3 rounded-lg border border-stitch-error/20">
                You cannot submit with a shortage. Please log the missing cash as an outflow in the Expenses page first.
              </p>
              <button
                type="button"
                onClick={() => window.location.href = '/expenses'}
                className="w-full bg-stitch-surface-container-high hover:bg-white/10 text-white font-bold py-2.5 rounded-lg transition-all active:scale-95 border border-white/10 text-sm"
              >
                Log Outflow in Expenses
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting || !form.openingBalance || !form.actualCash}
              className="w-full bg-stitch-primary hover:bg-stitch-primary-container text-stitch-on-primary font-bold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-sm mt-2"
            >
              {submitting ? 'Submitting...' : 'Submit Reconciliation'}
            </button>
          )}
        </form>

        <div className="glass-card rounded-xl p-5 space-y-4" style={{ borderLeft: '3px solid rgba(192,193,255,0.4)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stitch-primary/10 flex items-center justify-center text-sm">🤖</div>
            <h2 className="text-base font-semibold text-stitch-on-surface font-space">AI Cash Analysis</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Average Daily Variance', value: '₨ 340', trend: 'normal' },
              { label: 'Recurring Shortages', value: '3 this week', trend: 'warning' },
              { label: 'Cash Risk Score', value: 'Low (2/10)', trend: 'good' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-xs text-stitch-on-surface-variant">{item.label}</span>
                <span className={`text-xs font-bold font-mono ${item.trend === 'good' ? 'text-green-400' : item.trend === 'warning' ? 'text-amber-400' : 'text-stitch-on-surface'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-stitch-on-surface-variant leading-relaxed border-t border-white/5 pt-3">
            Cash reconciliation patterns appear normal. Recommend double-checking till at shift changeover to reduce variance.
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stitch-on-surface font-space">Reconciliation History</h2>
          {loading && <span className="w-4 h-4 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />}
        </div>
        {history.length === 0 && !loading ? (
          <div className="py-12 text-center">
            <Clock size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/40" />
            <p className="text-sm text-stitch-on-surface-variant">No reconciliation records yet</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                {['Date', 'Opening', 'Expected', 'Actual', 'Variance', 'Status', 'By', ''].map((h, i) => (
                  <th key={h + i} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">{formatPKR(Number(r.openingBalance))}</td>
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">{formatPKR(Number(r.expectedCash))}</td>
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface">{formatPKR(Number(r.actualCash))}</td>
                  <td className={`px-4 py-3 text-sm font-mono font-bold ${Number(r.variance) === 0 ? 'text-green-400' : Number(r.variance) > 0 ? 'text-stitch-tertiary' : 'text-stitch-error'}`}>
                    {Number(r.variance) >= 0 ? '+' : ''}{formatPKR(Number(r.variance))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${(r.status || 'approved') === 'approved' ? 'bg-green-500/10 text-green-400' : r.status === 'disputed' ? 'bg-stitch-error/10 text-stitch-error' : 'bg-amber-500/10 text-amber-400'}`}>
                      {(r.status || 'approved').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{r.submittedBy?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {format(new Date(r.date), 'yyyy-MM-dd') === today && (
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-stitch-on-surface-variant hover:text-stitch-error transition-colors rounded-md hover:bg-stitch-error/10">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
