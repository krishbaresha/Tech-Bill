import { useState, useEffect, useCallback } from 'react';
import { Truck, PackageSearch, CheckCircle2, RotateCcw, Search, X, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { Sale } from '../../types';
import { format } from 'date-fns';

export default function OnlineOrdersPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'dispatched' | 'delivered' | 'returned'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState('');
  
  const [returningId, setReturningId] = useState<string | null>(null);
  const [refundLossAmount, setRefundLossAmount] = useState<number>(0);

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number | ''>('');
  const [payoutCourier, setPayoutCourier] = useState('');
  const [payoutDate, setPayoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [orders, setOrders] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ledger, setLedger] = useState({ totalDeliveredCod: 0, totalPayouts: 0, dueFromCouriers: 0 });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, ledgerRes] = await Promise.all([
        api.get('/sales', { params: { isOnline: true, shippingStatus: activeTab } }),
        api.get('/sales/payouts/ledger'),
      ]);
      setOrders(ordersRes.data.data);
      setLedger(ledgerRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const markDelivered = async (id: string) => {
    setIsMarkingDelivered(true);
    try {
      await api.patch(`/sales/${id}/deliver`);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  const [isLoggingPayout, setIsLoggingPayout] = useState(false);
  const logPayout = async () => {
    if (!payoutAmount) return;
    setIsLoggingPayout(true);
    try {
      await api.post('/sales/payouts', { amount: Number(payoutAmount), courierName: payoutCourier, date: payoutDate });
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      setPayoutCourier('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingPayout(false);
    }
  };

  const handleDispatch = async (id: string) => {
    if (!trackingId.trim()) return alert('Enter a tracking ID first.');
    try {
      setDispatchingId(id);
      await api.patch(`/sales/${id}/dispatch`, { trackingId });
      setTrackingId('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setDispatchingId(null);
    }
  };

  const handleReturn = async (id: string) => {
    if (isNaN(refundLossAmount) || refundLossAmount < 0) return alert('Invalid loss amount.');
    try {
      setReturningId(id);
      await api.patch(`/sales/${id}/return`, { refundLossAmount });
      setRefundLossAmount(0);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setReturningId(null);
    }
  };

  const filteredOrders = orders.filter((o) =>
    o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.trackingId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6 max-w-7xl mx-auto w-full">
      <div className="max-w-6xl mx-auto space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white font-space uppercase tracking-tight flex items-center gap-2">
              <Truck className="text-stitch-primary" size={28} />
              Online Orders
            </h1>
            <p className="text-stitch-on-surface-variant text-sm mt-1">Manage e-commerce fulfillment and courier ledgers</p>
          </div>
          <button onClick={() => setIsPayoutModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
            <CheckCircle className="w-5 h-5" />
            Log Bulk Payout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 border border-white/5 bg-white/[0.02]">
            <p className="text-xs text-stitch-on-surface-variant font-bold uppercase tracking-wider mb-1">Delivered COD Value</p>
            <p className="text-2xl font-bold text-white tabular-nums">₨ {ledger.totalDeliveredCod.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5 bg-white/[0.02]">
            <p className="text-xs text-stitch-on-surface-variant font-bold uppercase tracking-wider mb-1">Total Payouts Logged</p>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">₨ {ledger.totalPayouts.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5">
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Due from Couriers</p>
            <p className="text-2xl font-bold text-indigo-400 tabular-nums">₨ {ledger.dueFromCouriers.toLocaleString()}</p>
          </div>
        </div>

        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full rounded-2xl p-6 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white font-space">Log Courier Payout</h3>
                  <p className="text-sm text-stitch-on-surface-variant mt-1">Record a bulk payout from your courier.</p>
                </div>
                <button onClick={() => setIsPayoutModalOpen(false)} className="text-stitch-on-surface-variant hover:text-white p-1 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(Number(e.target.value))} className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50" placeholder="Payout Amount (₨)" />
                <input type="text" value={payoutCourier} onChange={(e) => setPayoutCourier(e.target.value)} className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50" placeholder="Courier Name" />
                <input type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsPayoutModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={logPayout} disabled={isLoggingPayout || !payoutAmount} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                  {isLoggingPayout ? 'Saving...' : 'Save Payout'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-white/10 shrink-0 overflow-x-auto pb-px">
          <TabButton id="pending" active={activeTab} set={setActiveTab} label="Pending" icon={<PackageSearch size={16} />} />
          <TabButton id="dispatched" active={activeTab} set={setActiveTab} label="Dispatched" icon={<Truck size={16} />} />
          <TabButton id="delivered" active={activeTab} set={setActiveTab} label="Completed" icon={<CheckCircle2 size={16} />} />
          <TabButton id="returned" active={activeTab} set={setActiveTab} label="Returned" icon={<RotateCcw size={16} />} />
        </div>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant" size={18} />
          <input type="text" placeholder="Search by invoice, customer, or tracking ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-stitch-on-surface-variant focus:outline-none focus:border-stitch-primary transition-colors" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><span className="w-8 h-8 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" /></div>
          ) : filteredOrders.map((order) => (
            <div key={order.id} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-3 flex-1">
                <p className="font-space font-bold text-stitch-primary text-lg">{order.invoiceNumber}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-stitch-on-surface-variant text-[10px] uppercase font-bold">Customer</p><p className="font-semibold text-white">{order.customer?.name || 'Walk-in'}</p></div>
                  <div><p className="text-stitch-on-surface-variant text-[10px] uppercase font-bold">Total</p><p className="font-semibold text-white">Rs {Number(order.totalAmount).toLocaleString()}</p></div>
                  <div><p className="text-stitch-on-surface-variant text-[10px] uppercase font-bold">Tracking</p><p className="font-mono text-white text-xs">{order.trackingId || 'N/A'}</p></div>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-64">
                {activeTab === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Tracking ID" value={dispatchingId === order.id ? trackingId : ''} onChange={(e) => { setDispatchingId(order.id); setTrackingId(e.target.value); }} className="bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white" />
                    <button onClick={() => handleDispatch(order.id)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2"><Truck size={14} /> Dispatch</button>
                  </div>
                )}
                {activeTab === 'dispatched' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => markDelivered(order.id)} disabled={isMarkingDelivered} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold justify-center"><CheckCircle size={14} /> Mark Delivered</button>
                    <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                      <input
                        type="number"
                        placeholder="Loss Amount (e.g. Delivery Rs)"
                        value={returningId === order.id ? refundLossAmount || '' : ''}
                        onChange={(e) => {
                          setReturningId(order.id);
                          setRefundLossAmount(Number(e.target.value));
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-stitch-on-surface-variant focus:outline-none focus:border-stitch-error"
                      />
                      <button
                        onClick={() => handleReturn(order.id)}
                        disabled={returningId === order.id && !refundLossAmount}
                        className="w-full bg-stitch-error/20 hover:bg-stitch-error/30 text-stitch-error border border-stitch-error/30 text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={14} /> Mark Returned
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'delivered' && (
                  <div className="text-center">
                    <p className="text-stitch-success text-xs font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 size={14} /> Delivered
                    </p>
                    <p className="text-[10px] text-stitch-on-surface-variant mt-1">COD added to Ledger</p>
                  </div>
                )}
                
                {activeTab === 'returned' && (
                  <div className="text-center">
                    <p className="text-stitch-error text-xs font-bold flex items-center justify-center gap-1">
                      <RotateCcw size={14} /> Order Returned
                    </p>
                    {order.refundLossAmount != null && (
                      <p className="text-[10px] text-stitch-error/80 mt-1">
                        Loss Logged: Rs {Number(order.refundLossAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, active, set, label, icon }: any) {
  const isActive = active === id;
  return (
    <button
      onClick={() => set(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
        isActive
          ? 'text-stitch-primary border-stitch-primary'
          : 'text-stitch-on-surface-variant border-transparent hover:text-white hover:border-white/20'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
