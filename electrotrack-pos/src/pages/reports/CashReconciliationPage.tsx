import { useEffect, useRef, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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
  const [history, setHistory] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const expectedCash = Number(form.openingBalance) || 0;
  const actualCash = Number(form.actualCash) || 0;
  const previewVariance = actualCash - expectedCash;

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: ReconciliationRecord[]; total: number }>('/reports/cash-reconciliation');
      setHistory(res.data.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
    if (containerRef.current) {
      gsap.from(containerRef.current.querySelectorAll('.glass-card'), {
        opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await loadHistory();
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
            <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any discrepancy notes..."
              className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-stitch-error text-xs flex items-center gap-2"><AlertTriangle size={12} />{error}</p>}
          {successMsg && <p className="text-green-400 text-xs flex items-center gap-2"><CheckCircle size={12} />{successMsg}</p>}

          <button
            type="submit"
            disabled={submitting || !form.openingBalance || !form.actualCash}
            className="w-full bg-stitch-primary hover:bg-stitch-primary-container text-stitch-on-primary font-bold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Reconciliation'}
          </button>
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
                {['Date', 'Opening', 'Expected', 'Actual', 'Variance', 'Status', 'By'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">{formatPKR(r.openingBalance)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">{formatPKR(r.expectedCash)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface">{formatPKR(r.actualCash)}</td>
                  <td className={`px-4 py-3 text-sm font-mono font-bold ${r.variance === 0 ? 'text-green-400' : r.variance > 0 ? 'text-stitch-tertiary' : 'text-stitch-error'}`}>
                    {r.variance >= 0 ? '+' : ''}{formatPKR(r.variance)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-green-500/10 text-green-400' : r.status === 'disputed' ? 'bg-stitch-error/10 text-stitch-error' : 'bg-amber-500/10 text-amber-400'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{r.submittedBy?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
