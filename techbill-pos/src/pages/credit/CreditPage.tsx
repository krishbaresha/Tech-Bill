import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Trash2, X, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../api/client';
import { useToastStore } from '../../store/toast.store';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
}

interface CreditRecord {
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  status: 'PENDING' | 'PAID';
  amount: number;
  paidAmount: number;
  dueAmount: number;
  description: string | null;
  date: string;
  personName: string | null;
  customerId: string | null;
  supplierId: string | null;
  createdAt: string;
  customer?: Customer | null;
  supplier?: Supplier | null;
}

export default function CreditPage() {
  const toast = useToastStore();
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [tab, setTab] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<CreditRecord | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    type: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER',
    personName: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchRecords = async () => {
    try {
      const res = await api.get<CreditRecord[]>('/credit');
      setRecords(res.data);
    } catch {
      toast.error('Failed to load credit records');
    }
  };

  const loadData = async () => {
    setDataLoading(true);
    await fetchRecords();
    setDataLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (containerRef.current && !dataLoading) {
      const els = containerRef.current.querySelectorAll('.glass-card');
      gsap.killTweensOf(els);
      gsap.fromTo(els,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power3.out', overwrite: true }
      );
    }
  }, [dataLoading]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        type: addForm.type,
        amount: parseFloat(addForm.amount),
        description: addForm.description || undefined,
        date: addForm.date,
        personName: addForm.personName || undefined,
      };

      await api.post('/credit', payload);
      toast.success('Credit record added successfully');
      setShowAddModal(false);
      setAddForm({
        type: tab,
        personName: '',
        amount: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
      await fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to add credit record');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    setLoading(true);
    try {
      await api.patch(`/credit/${showPaymentModal.id}/payment`, {
        amount: parseFloat(paymentAmount),
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(null);
      setPaymentAmount('');
      await fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit record?')) return;
    try {
      await api.delete(`/credit/${id}`);
      toast.success('Credit record deleted successfully');
      await fetchRecords();
    } catch {
      toast.error('Failed to delete credit record');
    }
  };

  // Get display name for a record
  const getDisplayName = (r: CreditRecord): string => {
    if (r.personName) return r.personName;
    if (r.type === 'CUSTOMER') return r.customer?.name ?? 'Unknown';
    return r.supplier?.name ?? 'Unknown';
  };

  const getDisplayPhone = (r: CreditRecord): string | undefined => {
    if (r.type === 'CUSTOMER') return r.customer?.phone;
    return r.supplier?.phone;
  };

  // Filter & Search
  const q = search.toLowerCase();
  const filteredRecords = records.filter((r) => {
    if (r.type !== tab) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

    const name = getDisplayName(r);
    const phone = getDisplayPhone(r) ?? '';
    const desc = r.description ?? '';

    return name.toLowerCase().includes(q) || phone.includes(q) || desc.toLowerCase().includes(q);
  });

  // Calculate totals
  const totalReceivables = records
    .filter((r) => r.type === 'CUSTOMER')
    .reduce((sum, r) => sum + Number(r.dueAmount), 0);

  const totalPayables = records
    .filter((r) => r.type === 'SUPPLIER')
    .reduce((sum, r) => sum + Number(r.dueAmount), 0);

  return (
    <div ref={containerRef} className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center shrink-0">
            <Wallet size={20} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Credit Management</h1>
            <p className="text-xs text-stitch-on-surface-variant">Track receivables (Khata) and payables (We Owe)</p>
          </div>
        </div>
        <button
          onClick={() => {
            setAddForm({
              type: tab,
              personName: '',
              amount: '',
              description: '',
              date: new Date().toISOString().slice(0, 10),
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <Plus size={14} /> Add Credit Entry
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 overflow-hidden relative border border-white/5 bg-white/[0.01]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-stitch-tertiary/60" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Total Receivables — Customer Owes Us (Inflow)</p>
              <p className="text-2xl font-bold font-space mt-1 text-stitch-tertiary tabular-nums">
                {formatPKR(totalReceivables)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-stitch-tertiary/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-stitch-tertiary" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 overflow-hidden relative border border-white/5 bg-white/[0.01]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-stitch-error/60" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Total Payables — We Owe (Outflow)</p>
              <p className="text-2xl font-bold font-space mt-1 text-stitch-error tabular-nums">
                {formatPKR(totalPayables)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-stitch-error/10 flex items-center justify-center">
              <TrendingDown size={20} className="text-stitch-error" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-2">
        <div className="flex gap-2">
          {(['CUSTOMER', 'SUPPLIER'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSearch('');
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t
                  ? 'bg-white/10 text-white shadow'
                  : 'text-stitch-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
            >
              {t === 'CUSTOMER' ? 'Customer Owes Us (Khata)' : 'We Owe (Payables)'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, description…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/40"
            />
          </div>

          {/* Status Filter */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            {(['PENDING', 'PAID', 'ALL'] as const).map((sf) => (
              <button
                key={sf}
                onClick={() => setStatusFilter(sf)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  statusFilter === sf
                    ? 'bg-stitch-primary text-stitch-on-primary'
                    : 'text-stitch-on-surface-variant hover:text-white'
                }`}
              >
                {sf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Credit Records List */}
      <div className="glass-card rounded-xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Person / Party</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Total Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Paid Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Due Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dataLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <span className="w-6 h-6 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin inline-block" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Wallet size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
                    <p className="text-sm text-stitch-on-surface-variant">No credit records found</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const displayName = getDisplayName(r);
                  const displayPhone = getDisplayPhone(r);
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm text-stitch-on-surface-variant font-mono whitespace-nowrap">
                        {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-stitch-on-surface">{displayName}</p>
                        {displayPhone && <p className="text-[11px] text-stitch-on-surface-variant">{displayPhone}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-stitch-on-surface-variant max-w-xs truncate" title={r.description || ''}>
                        {r.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-white tabular-nums">
                        {formatPKR(Number(r.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold font-mono text-green-400 tabular-nums">
                        {formatPKR(Number(r.paidAmount))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-stitch-tertiary tabular-nums">
                        {formatPKR(Number(r.dueAmount))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'PAID'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                setPaymentAmount('');
                                setShowPaymentModal(r);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-colors"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => void handleDelete(r.id)}
                            title="Delete record"
                            className="flex items-center justify-center w-7 h-7 text-stitch-on-surface-variant hover:text-stitch-error hover:bg-stitch-error/10 border border-white/5 hover:border-stitch-error/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Credit Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="glass-modal rounded-xl p-6 w-full max-w-md border border-white/10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-base font-bold text-white font-space">Add Credit Record</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CUSTOMER', 'SUPPLIER'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, type: t, personName: '' })}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        addForm.type === t
                          ? 'bg-stitch-primary text-stitch-on-primary border-stitch-primary'
                          : 'bg-white/5 text-stitch-on-surface-variant border-white/10 hover:text-white'
                      }`}
                    >
                      {t === 'CUSTOMER' ? 'Customer Owes Us' : 'We Owe'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1">
                  {addForm.type === 'CUSTOMER' ? 'Customer Name *' : 'Person / Party Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={addForm.personName}
                  onChange={(e) => setAddForm({ ...addForm, personName: e.target.value })}
                  placeholder={addForm.type === 'CUSTOMER' ? 'e.g. Ali Hassan' : 'e.g. Tariq Electronics'}
                  className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1">Amount (₨) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="e.g. Pending payment for invoice #1002"
                  className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 text-sm bg-stitch-primary text-stitch-on-primary font-bold rounded-lg hover:bg-stitch-primary/90 disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading ? 'Adding…' : 'Add Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePaymentSubmit} className="glass-modal rounded-xl p-6 w-full max-w-sm border border-white/10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-base font-bold text-white font-space">Record Payment</h2>
              <button type="button" onClick={() => setShowPaymentModal(null)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
              <p className="text-xs text-stitch-on-surface-variant font-bold uppercase tracking-wider">Person / Party</p>
              <p className="text-sm font-semibold text-white">
                {getDisplayName(showPaymentModal)}
              </p>
              <div className="flex justify-between pt-1 text-xs text-stitch-on-surface-variant">
                <span>Total Due:</span>
                <span className="font-mono text-stitch-tertiary font-bold">{formatPKR(Number(showPaymentModal.dueAmount))}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1">Payment Amount (₨) *</label>
              <input
                type="number"
                required
                min="0.01"
                max={Number(showPaymentModal.dueAmount)}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(null)}
                className="flex-1 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 text-sm bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading ? 'Recording…' : 'Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
