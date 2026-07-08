import { useEffect, useRef, useState } from 'react';
import { PackageCheck, Plus, Trash2, AlertTriangle, CheckCircle, Wand2, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
import { useCan } from '../../lib/permissions';
import gsap from 'gsap';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { name: string } | null;
  status: string;
  expectedDelivery: string | null;
  items: { product: { id: string; name: string }; quantityOrdered: number; unitCostPrice: number }[];
}

interface Product {
  id: string;
  name: string;
  brand: string | null;
}

interface BatchInput {
  id: string;
  productId: string;
  productName: string;
  orderedQuantity: number | null;
  receivingQuantity: string;
  unitCost: string;
  serialMode: 'auto' | 'manual';
  manualSerials: string;
  autoPrefix: string;
}

export default function GrnPage() {
  const canWrite = useCan('suppliers.write');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [batches, setBatches] = useState<BatchInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [poRes, prodRes] = await Promise.all([
          api.get<PurchaseOrder[]>('/purchase-orders'),
          api.get<Product[]>('/inventory/products'),
        ]);
        setPurchaseOrders(poRes.data.filter((p) => ['draft', 'sent', 'partial'].includes(p.status)));
        setProducts(prodRes.data);
      } catch {
        // silently ignore
      }
    };
    void loadData();
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

  const selectedPo = purchaseOrders.find((p) => p.id === selectedPoId);

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po && po.items.length > 0) {
      const newBatches: BatchInput[] = po.items.map((item, idx) => ({
        id: Date.now() + idx.toString(),
        productId: item.product.id,
        productName: item.product.name,
        orderedQuantity: item.quantityOrdered,
        receivingQuantity: String(item.quantityOrdered),
        unitCost: String(item.unitCostPrice),
        serialMode: 'auto',
        manualSerials: '',
        autoPrefix: '',
      }));
      setBatches(newBatches);
    } else {
      setBatches([]);
    }
  };

  const addBatch = () => {
    setBatches((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productId: '',
        productName: '',
        orderedQuantity: null,
        receivingQuantity: '1',
        unitCost: '',
        serialMode: 'auto',
        manualSerials: '',
        autoPrefix: '',
      },
    ]);
  };

  const removeBatch = (id: string) => setBatches((prev) => prev.filter((b) => b.id !== id));

  const updateBatch = (id: string, field: keyof BatchInput, value: string) => {
    setBatches((prev) => prev.map((b) => {
       if (b.id !== id) return b;
       if (field === 'receivingQuantity' && b.orderedQuantity !== null) {
          const num = parseInt(value);
          if (num > b.orderedQuantity) return { ...b, receivingQuantity: String(b.orderedQuantity) };
       }
       if (field === 'productId') {
          const prod = products.find(p => p.id === value);
          return { ...b, productId: value, productName: prod ? prod.name : '' };
       }
       return { ...b, [field]: value };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId) {
      setError('A Purchase Order must be selected to receive goods.');
      return;
    }
    if (batches.length === 0) {
      setError('Please add at least one product batch to receive.');
      return;
    }

    const payloadUnits: { serialNumber: string; productId: string; purchasePrice?: number }[] = [];
    
    for (const batch of batches) {
      if (!batch.productId) {
         setError('Please select a product for all batches.');
         return;
      }
      const rQty = parseInt(batch.receivingQuantity);
      if (isNaN(rQty) || rQty <= 0) {
         setError(`Invalid receiving quantity for ${batch.productName || 'product'}.`);
         return;
      }
      
      let serials: string[] = [];
      if (batch.serialMode === 'manual') {
         serials = batch.manualSerials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
         if (serials.length !== rQty) {
            setError(`Mismatch in ${batch.productName}: You specified ${rQty} units but entered ${serials.length} serial numbers.`);
            return;
         }
      } else {
         const timestamp = format(new Date(), 'yyyyMMdd');
         const prefix = batch.autoPrefix.trim() ? `${batch.autoPrefix.trim()}-` : `SN-`;
         for(let i=0; i<rQty; i++) {
             serials.push(`${prefix}${timestamp}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
         }
      }

      for (const s of serials) {
          payloadUnits.push({
             serialNumber: s,
             productId: batch.productId,
             purchasePrice: batch.unitCost ? Number(batch.unitCost) : undefined,
          });
      }
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/inventory/grn', {
        purchaseOrderId: selectedPoId || undefined,
        notes: notes || undefined,
        units: payloadUnits,
      });
      setSuccessMsg(`GRN created — ${payloadUnits.length} unit(s) added to inventory.`);
      setBatches([]);
      setSelectedPoId('');
      setNotes('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create GRN';
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

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
              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Link to Purchase Order *</label>
              <select value={selectedPoId} onChange={(e) => handlePoChange(e.target.value)} required
                className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors">
                <option value="" className="bg-stitch-surface text-stitch-on-surface">— Select PO —</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id} className="bg-stitch-surface text-stitch-on-surface">{po.poNumber} — {po.supplier?.name ?? 'Unknown'}</option>
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
              <h3 className="text-sm font-semibold text-stitch-on-surface">Received Batches</h3>
              <button type="button" onClick={addBatch}
                className="flex items-center gap-1.5 text-xs text-stitch-primary hover:text-stitch-primary/80 font-bold transition-colors">
                <Plus size={14} /> Add Product Batch
              </button>
            </div>

            <div className="space-y-4">
              {batches.map((batch) => (
                  <div key={batch.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="w-1/2">
                              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Product *</label>
                              {batch.orderedQuantity !== null ? (
                                  <div className="mt-1 px-3 py-2 bg-white/5 rounded-lg text-sm font-semibold text-stitch-on-surface border border-white/5">
                                      {batch.productName}
                                  </div>
                              ) : (
                                  <select value={batch.productId} onChange={(e) => updateBatch(batch.id, 'productId', e.target.value)}
                                      className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors">
                                      <option value="" className="bg-stitch-surface text-stitch-on-surface">Select product...</option>
                                      {products.map((p) => (
                                          <option key={p.id} value={p.id} className="bg-stitch-surface text-stitch-on-surface">{p.name}{p.brand ? ` (${p.brand})` : ''}</option>
                                      ))}
                                  </select>
                              )}
                          </div>
                          <button type="button" onClick={() => removeBatch(batch.id)}
                              className="text-stitch-on-surface-variant hover:text-stitch-error transition-colors p-2">
                              <Trash2 size={16} />
                          </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
                                  Receiving Qty {batch.orderedQuantity !== null && <span className="text-stitch-primary">(Max: {batch.orderedQuantity})</span>} *
                              </label>
                              <input type="number" min="1" max={batch.orderedQuantity ?? undefined} value={batch.receivingQuantity} onChange={(e) => updateBatch(batch.id, 'receivingQuantity', e.target.value)}
                                  className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Unit Cost (₨)</label>
                              <input type="number" min="0" value={batch.unitCost} onChange={(e) => updateBatch(batch.id, 'unitCost', e.target.value)}
                                  className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
                          </div>
                      </div>

                      <div className="pt-3 border-t border-white/5">
                          <div className="flex items-center gap-3 mb-3">
                              <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Serial Numbers Mode:</label>
                              <div className="flex bg-white/5 rounded-lg p-0.5">
                                  <button type="button" onClick={() => updateBatch(batch.id, 'serialMode', 'auto')}
                                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${batch.serialMode === 'auto' ? 'bg-stitch-primary/20 text-stitch-primary' : 'text-stitch-on-surface-variant hover:text-white'}`}>
                                      Auto-Generate
                                  </button>
                                  <button type="button" onClick={() => updateBatch(batch.id, 'serialMode', 'manual')}
                                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${batch.serialMode === 'manual' ? 'bg-stitch-primary/20 text-stitch-primary' : 'text-stitch-on-surface-variant hover:text-white'}`}>
                                      Manual Entry
                                  </button>
                              </div>
                          </div>

                          {batch.serialMode === 'auto' ? (
                              <div className="max-w-xs">
                                  <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Prefix (Optional)</label>
                                  <input value={batch.autoPrefix} onChange={(e) => updateBatch(batch.id, 'autoPrefix', e.target.value)} placeholder="e.g. SN"
                                      className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors" />
                                  <p className="text-[10px] text-stitch-primary mt-1 flex items-center gap-1">
                                      <Wand2 size={10} /> Will automatically generate {batch.receivingQuantity || 0} unique serials on submit.
                                  </p>
                              </div>
                          ) : (
                              <div>
                                  <label className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Paste Serial Numbers (one per line or comma separated) *</label>
                                  <textarea value={batch.manualSerials} onChange={(e) => updateBatch(batch.id, 'manualSerials', e.target.value)} rows={3}
                                      placeholder="SN-001&#10;SN-002"
                                      className="mt-1 w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors resize-none" />
                                  <p className={`text-[10px] mt-1 font-bold ${batch.manualSerials.split(/[\n,]+/).filter(s => s.trim()).length === parseInt(batch.receivingQuantity) ? 'text-green-400' : 'text-stitch-error'}`}>
                                      {batch.manualSerials.split(/[\n,]+/).filter(s => s.trim()).length} / {batch.receivingQuantity || 0} serials entered
                                  </p>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
              {batches.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                      <Layers size={24} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
                      <p className="text-sm text-stitch-on-surface-variant">No product batches added.</p>
                  </div>
              )}
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
