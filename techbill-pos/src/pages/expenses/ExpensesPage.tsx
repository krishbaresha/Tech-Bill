import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Wallet, Plus, Trash2, Calendar, ChevronDown } from 'lucide-react';
import { format, subMonths, subYears } from 'date-fns';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/dashboard.store';
import gsap from 'gsap';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdBy: { name: string };
  createdAt: string;
}

/* ── Fiscal-month helpers ─────────────────────────────────────────── */
const FISCAL_DAY = 10; // shop month starts on the 10th

/** Return the most recent fiscal-month start date (the 10th). */
function getCurrentFiscalStart(): Date {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  // If today >= 10th → fiscal start = 10th of this month
  // If today < 10th  → fiscal start = 10th of last month
  if (today.getDate() >= FISCAL_DAY) {
    return new Date(y, m, FISCAL_DAY);
  }
  // go back one month
  const prev = new Date(y, m - 1, FISCAL_DAY);
  return prev;
}

type RangePreset = 'current' | '1m' | '3m' | '6m' | '1y' | 'custom';

const PRESET_LABELS: Record<RangePreset, string> = {
  current: 'Current Period',
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
  custom: 'Custom',
};

function rangeForPreset(preset: RangePreset): { from: string; to: string } {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  switch (preset) {
    case 'current': {
      const start = getCurrentFiscalStart();
      return { from: format(start, 'yyyy-MM-dd'), to: todayStr };
    }
    case '1m': {
      const start = subMonths(today, 1);
      return { from: format(start, 'yyyy-MM-dd'), to: todayStr };
    }
    case '3m': {
      const start = subMonths(today, 3);
      return { from: format(start, 'yyyy-MM-dd'), to: todayStr };
    }
    case '6m': {
      const start = subMonths(today, 6);
      return { from: format(start, 'yyyy-MM-dd'), to: todayStr };
    }
    case '1y': {
      const start = subYears(today, 1);
      return { from: format(start, 'yyyy-MM-dd'), to: todayStr };
    }
    default:
      return { from: format(getCurrentFiscalStart(), 'yyyy-MM-dd'), to: todayStr };
  }
}

/* ── Component ────────────────────────────────────────────────────── */
export default function ExpensesPage() {
  const defaultRange = useMemo(() => rangeForPreset('current'), []);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [_loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const syncDashboard = useDashboardStore((s) => s.syncDashboard);

  // Date range state
  const [activePreset, setActivePreset] = useState<RangePreset>('current');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    category: 'lunch',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchExpenses = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<Expense[]>('/expenses', { params: { from, to } });
      setExpenses(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when date range changes
  useEffect(() => {
    void fetchExpenses(fromDate, toDate);
  }, [fromDate, toDate, fetchExpenses]);

  // Entrance animation
  useEffect(() => {
    if (containerRef.current) {
      const els = containerRef.current.querySelectorAll('.glass-card');
      gsap.killTweensOf(els);
      gsap.fromTo(els,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power3.out', overwrite: true }
      );
    }
  }, [expenses]);

  const handlePresetClick = (preset: RangePreset) => {
    if (preset === 'custom') {
      setActivePreset('custom');
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    setActivePreset(preset);
    const r = rangeForPreset(preset);
    setFromDate(r.from);
    setToDate(r.to);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempId = `temp-${Date.now()}`;
    const newExpense: Expense = {
      id: tempId,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
      createdBy: { name: 'You' },
      createdAt: new Date().toISOString(),
    };

    const originalExpenses = [...expenses];
    setExpenses((prev) => [newExpense, ...prev]);
    setFormOpen(false);
    const prevForm = { ...form };
    setForm({ amount: '', category: 'lunch', description: '', date: format(new Date(), 'yyyy-MM-dd') });

    try {
      await api.post('/expenses', {
        ...prevForm,
        amount: Number(prevForm.amount),
      });
      void fetchExpenses(fromDate, toDate);
      void syncDashboard();
    } catch {
      setExpenses(originalExpenses);
      setForm(prevForm);
      setFormOpen(true);
      alert('Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    const originalExpenses = [...expenses];
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));

    try {
      await api.delete(`/expenses/${id}`);
      void fetchExpenses(fromDate, toDate);
      void syncDashboard();
    } catch {
      setExpenses(originalExpenses);
      alert('Failed to delete expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Build a human-readable period label
  const periodLabel = activePreset === 'current'
    ? `${format(new Date(fromDate), 'dd MMM')} → Today`
    : activePreset === 'custom'
      ? `${format(new Date(fromDate), 'dd MMM yyyy')} → ${format(new Date(toDate), 'dd MMM yyyy')}`
      : `Last ${PRESET_LABELS[activePreset]}`;

  return (
    <div ref={containerRef} className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-error/10 flex items-center justify-center">
            <Wallet size={20} className="text-stitch-error" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Expenses</h1>
            <p className="text-xs text-stitch-on-surface-variant">Log daily shop outflows like lunch or tea</p>
          </div>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>New Expense</span>
        </button>
      </div>

      {/* ── Date Range Selector ───────────────────────────────── */}
      <div className="glass-card rounded-xl p-4 space-y-3 border border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={14} className="text-stitch-primary" />
          <span className="text-xs font-bold text-stitch-on-surface-variant uppercase tracking-wider">Period</span>
          <span className="ml-auto text-xs text-stitch-on-surface-variant font-mono">{periodLabel}</span>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABELS) as RangePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              className={`
                px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95
                ${activePreset === preset
                  ? 'bg-stitch-primary text-stitch-on-primary shadow-lg shadow-stitch-primary/25'
                  : 'bg-stitch-surface-container-high/50 text-stitch-on-surface-variant hover:bg-white/10 border border-white/5'
                }
              `}
            >
              {PRESET_LABELS[preset]}
              {preset === 'custom' && <ChevronDown size={12} className="inline ml-1 -mr-0.5" />}
            </button>
          ))}
        </div>

        {/* Custom date pickers */}
        {showCustomPicker && (
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-white/5 animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setActivePreset('custom'); }}
                className="mt-1 block bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setActivePreset('custom'); }}
                className="mt-1 block bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Card ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-stitch-error/20 bg-stitch-error/5">
          <p className="text-xs text-stitch-error font-bold uppercase tracking-wider mb-1">Total Expenses — {periodLabel}</p>
          <p className="text-2xl font-bold text-white tabular-nums">₨ {totalExpenses.toLocaleString('en-PK')}</p>
        </div>
      </div>

      {/* ── New Expense Form ──────────────────────────────────── */}
      {formOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-4 animate-fade-in border border-stitch-primary/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Date</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Amount (₨)</label>
              <input type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 500" className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors">
                <option value="lunch">Lunch</option>
                <option value="tea">Tea / Snacks</option>
                <option value="supplies">Shop Supplies</option>
                <option value="entertainment">Entertainment</option>
                <option value="maintenance">Maintenance</option>
                <option value="personal">Personal Expenses</option>
                <option value="adjustment">Adjustment / Shortage</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Description (Optional)</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="More details..." className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm font-bold text-stitch-on-surface-variant hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95">Save Expense</button>
          </div>
        </form>
      )}

      {/* ── Expenses Table ────────────────────────────────────── */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
              <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider text-right">Amount</th>
              <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Logged By</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-stitch-on-surface-variant">No expenses found for this period</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-stitch-on-surface capitalize">{exp.category}</td>
                  <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{exp.description || '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-stitch-error font-mono text-right tabular-nums">₨ {Number(exp.amount).toLocaleString('en-PK')}</td>
                  <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{exp.createdBy?.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-stitch-on-surface-variant hover:text-stitch-error transition-colors rounded-md hover:bg-stitch-error/10">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
