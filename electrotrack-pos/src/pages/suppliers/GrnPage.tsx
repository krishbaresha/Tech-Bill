import { useEffect, useRef, useState } from 'react';
import { PackageCheck, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
import { useCan } from '../../lib/permissions';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { name: string } | null;
  status: string;
  expectedDelivery: string | null;
  items: { product: { id: string; name: string }; quantity: number; unitCost: number }[];
}

interface Product {
  id: string;
  name: string;
  brand: string | null;
}

interface UnitInput {
  serialNumber: string;
  productId: string;
  purchasePrice: string;
}

export default function GrnPage() {
  const canWrite = useCan('suppliers.write');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [notes, setNotes] = useState('');
  const [units, setUnits] = useState<UnitInput[]>([{ serialNumber: '', productId: '', purchasePrice: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [poRes, prodRes] = await Promise.all([
          api.get<PurchaseOrder[]>('/suppliers/purchase-orders'),
          api.get<Product[]>('/inventory/products'),
        ]);
        setPurchaseOrders(poRes.data.filter((p) => ['sent', 'partial'].includes(p.status)));
        setProducts(prodRes.data);
      } catch {
        // silently ignore
      }
    };
    void loadData();
    if (containerRef.current) {
      gsap.from(containerRef.current.querySelectorAll('.glass-card'), {
        opacity: 0, y: 20, duration: 0.6, stagger: 0.08, ease: 'power2.out',
      });
    }
  }, []);

  const selectedPo = purchaseOrders.find((p) => p.id === selectedPoId);

  const addUnit = () => setUnits((prev) => [...prev, { serialNumber: '', productId: '', purchasePrice: '' }]);

  const removeUnit = (i: number) => setUnits((prev) => prev.filter((_, idx) => idx !== i));

  const updateUnit = (i: number, field: keyof UnitInput, value: string) =>
    setUnits((prev) => prev.map((u, idx) => (idx === i ? { ...u, [field]: value } : u)));

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po && po.items.length > 0) {
      setUnits(po.items.map((item) => ({
        serialNumber: '',
        productId: item.product.id,
        purchasePrice: String(item.unitCost),
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validUnits = units.filter((u) => u.serialNumber.trim() && u.productId);
    if (validUnits.length === 0) {
      setError('Add at least one unit with a serial number and product.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/inventory/grn', {
        purchaseOrderId: selectedPoId || undefined,
        notes: notes || undefined,
        units: validUnits.map((u) => ({
          serialNumber: u.serialNumber.trim(),
          productId: u.productId,
          purchasePrice: u.purchasePrice ? Number(u.purchasePrice) : undefined,
        })),
      });
      setSuccessMsg(`GRN created — ${validUnits.length} unit(s) added to inventory.`);
      setUnits([{ serialNumber: '', productId: '', purchasePrice: '' }]);
      setSelectedPoId('');
      setNotes('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create GRN';
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const readyCount = units.filter((u) => u.serialNumber && u.productId).length;
  const totalCost = units.reduce((s, u) => s + (Number(u.purchasePrice) || 0), 0);

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-stitch-tertiary-container flex items-center justify-center">
          <PackageCheck size={20} className="text-stitch-tertiary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stitch-on-surface font-space">Goods Received Note (GRN)</h1>
          <p className="text-xs text-stitch-on-surface-variant">Record received inventory units with serial numbers</p>
        </div>
      </div>

      {!canWrite && (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-l-4 border-amber-500/50">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">You don't have permission to create GRNs.</p>
        </div>
      )}

      {canWrite && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-5">
          <h2 className="text-base font-semibold text-stitch-on-surface font-space border-b border-white/5 pb-3"
            style={{ borderLeft: '3px solid rgba(47,217,244,0.5)', paddingLeft: '12px' }}>
            New GRN Entry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Link to Purchase Order (optional)</label>
              <select value={selectedPoId} onChange={(e) => handlePoChange(e.target.value)}
                className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors">
                <option value="">— No PO linked —</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.poNumber} — {po.supplier?.name ?? 'Unknown'}</option>
                ))}
              </select>
              {selectedPo?.expectedDelivery && (
                <p className="text-xs text-stitch-on-surface-variant mt-1">
                  Expected: {format(new Date(selectedPo.expectedDelivery), 'dd MMM yyyy')}
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Receiving notes, condition remarks..."
                className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors resize-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stitch-on-surface">Inventory Units</h3>
              <button type="button" onClick={addUnit}
                className="flex items-center gap-1.5 text-xs text-stitch-primary hover:text-stitch-primary/80 font-bold transition-colors">
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-2">
                <span className="col-span-4 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Serial Number</span>
                <span className="col-span-5 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Product</span>
                <span className="col-span-2 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Cost (₨)</span>
                <span className="col-span-1" />
              </div>

              {units.map((unit, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={unit.serialNumber} onChange={(e) => updateUnit(i, 'serialNumber', e.target.value)}
                    placeholder="SN-XXXX-00000"
                    className="col-span-4 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
                  <select value={unit.productId} onChange={(e) => updateUnit(i, 'productId', e.target.value)}
                    className="col-span-5 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors">
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>
                    ))}
                  </select>
                  <input type="number" min="0" value={unit.purchasePrice} onChange={(e) => updateUnit(i, 'purchasePrice', e.target.value)}
                    placeholder="0"
                    className="col-span-2 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
                  <button type="button" onClick={() => removeUnit(i)} disabled={units.length === 1}
                    className="col-span-1 flex items-center justify-center text-stitch-on-surface-variant hover:text-stitch-error disabled:opacity-30 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 px-2 flex items-center gap-4 text-xs text-stitch-on-surface-variant">
              <span>{readyCount} / {units.length} units ready</span>
              {totalCost > 0 && <span>Total cost: {formatPKR(totalCost)}</span>}
            </div>
          </div>

          {error && <p className="text-stitch-error text-xs flex items-center gap-2"><AlertTriangle size={12} />{error}</p>}
          {successMsg && <p className="text-green-400 text-xs flex items-center gap-2"><CheckCircle size={12} />{successMsg}</p>}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={submitting}
              className="bg-stitch-primary hover:bg-stitch-primary-container text-stitch-on-primary font-bold px-6 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2">
              {submitting ? (
                <span className="w-4 h-4 border-2 border-stitch-on-primary/30 border-t-stitch-on-primary rounded-full animate-spin" />
              ) : (
                <PackageCheck size={16} />
              )}
              Create GRN & Add to Inventory
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
