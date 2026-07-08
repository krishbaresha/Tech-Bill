import { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [_loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    category: 'lunch',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Expense[]>('/expenses');
      setExpenses(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchExpenses();
    if (containerRef.current) {
      const els = containerRef.current.querySelectorAll('.glass-card');
      gsap.killTweensOf(els);
      gsap.fromTo(els,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power3.out', overwrite: true }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/expenses', {
        ...form,
        amount: Number(form.amount),
      });
      setFormOpen(false);
      setForm({ amount: '', category: 'lunch', description: '', date: format(new Date(), 'yyyy-MM-dd') });
      await fetchExpenses();
    } catch {
      alert('Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      await fetchExpenses();
    } catch {
      alert('Failed to delete expense');
    }
  };

  return (
    <div ref={containerRef} className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-stitch-on-surface-variant">No expenses found</td>
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
