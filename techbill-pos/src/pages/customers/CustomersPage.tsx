import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Phone, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
import gsap from 'gsap';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

interface SaleRow {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  discountAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  _count: { items: number };
}

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

const SALE_STATUS: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-stitch-error/10 text-stitch-error border-stitch-error/20',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [salesMap, setSalesMap] = useState<Record<string, SaleRow[]>>({});
  const [salesLoading, setSalesLoading] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<Customer[]>('/sales/customers', {
        params: q ? { search: q } : {},
      });
      setCustomers(res.data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCustomers(''); }, [fetchCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchCustomers(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.customer-row');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, [loading, customers]);

  const toggleExpand = async (customer: Customer) => {
    if (expandedId === customer.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customer.id);
    if (!salesMap[customer.id]) {
      setSalesLoading(customer.id);
      try {
        const res = await api.get<{ data: SaleRow[] }>('/sales', {
          params: { customerId: customer.id, limit: 20 },
        });
        setSalesMap((prev) => ({ ...prev, [customer.id]: res.data.data }));
      } catch {
        setSalesMap((prev) => ({ ...prev, [customer.id]: [] }));
      } finally {
        setSalesLoading(null);
      }
    }
  };

  const totalSpent = (id: string) =>
    (salesMap[id] ?? []).reduce((s, r) => s + Number(r.totalAmount), 0);

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
            <Users size={20} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Customers</h1>
            <p className="text-xs text-stitch-on-surface-variant">Purchase history and customer records</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant/50" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="pl-9 pr-3 py-1.5 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors w-56 placeholder:text-stitch-on-surface-variant/50"
          />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                <th className="w-10 px-4 py-3" />
                {['Customer', 'Phone', 'Member Since', 'Total Spent'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <span className="inline-block w-6 h-6 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Users size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
                    <p className="text-sm text-stitch-on-surface-variant">No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <>
                    <tr
                      key={c.id}
                      onClick={() => void toggleExpand(c)}
                      className="customer-row hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-stitch-on-surface-variant/50">
                        {expandedId === c.id
                          ? <ChevronDown size={14} className="text-stitch-primary" />
                          : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-stitch-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <User size={13} className="text-stitch-primary" />
                          </div>
                          <span className="font-semibold text-stitch-on-surface text-sm">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 text-xs text-stitch-on-surface-variant font-mono">
                            <Phone size={11} className="text-stitch-on-surface-variant/50" />
                            {c.phone}
                          </div>
                        ) : (
                          <span className="text-stitch-on-surface-variant/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stitch-on-surface-variant">
                        {format(new Date(c.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {salesMap[c.id] !== undefined ? (
                          <div>
                            <span className="font-bold tabular-nums text-stitch-tertiary font-mono text-sm">
                              {formatPKR(totalSpent(c.id))}
                            </span>
                            <span className="text-[10px] text-stitch-on-surface-variant ml-1.5">
                              {salesMap[c.id].length} sales
                            </span>
                          </div>
                        ) : (
                          <span className="text-stitch-on-surface-variant/40 text-xs">—</span>
                        )}
                      </td>
                    </tr>

                    {expandedId === c.id && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={5} className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                          {salesLoading === c.id ? (
                            <div className="flex items-center gap-2 text-xs text-stitch-on-surface-variant py-2">
                              <span className="w-3.5 h-3.5 border border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
                              Loading purchase history…
                            </div>
                          ) : (salesMap[c.id] ?? []).length === 0 ? (
                            <p className="text-xs text-stitch-on-surface-variant/60 py-2">No sales found for this customer.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/5">
                                  {['Invoice', 'Date', 'Items', 'Payment', 'Status', 'Total'].map((h) => (
                                    <th key={h} className={`pb-2 font-bold text-[10px] text-stitch-on-surface-variant uppercase tracking-wider ${h === 'Total' ? 'text-right' : 'text-left'}`}>
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {salesMap[c.id].map((s) => (
                                  <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-2 font-mono text-stitch-tertiary">{s.invoiceNumber}</td>
                                    <td className="py-2 text-stitch-on-surface-variant">
                                      {format(new Date(s.createdAt), 'dd MMM yyyy')}
                                    </td>
                                    <td className="py-2 text-stitch-on-surface-variant">{s._count.items}</td>
                                    <td className="py-2 capitalize text-stitch-on-surface-variant">
                                      {s.paymentMethod.replace('_', ' ')}
                                    </td>
                                    <td className="py-2">
                                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${SALE_STATUS[s.status] ?? 'bg-white/5 text-stitch-on-surface-variant border-white/10'}`}>
                                        {s.status}
                                      </span>
                                    </td>
                                    <td className="py-2 text-right tabular-nums font-bold font-mono text-stitch-on-surface">
                                      {formatPKR(Number(s.totalAmount))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
