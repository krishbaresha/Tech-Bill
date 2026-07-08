import { useEffect, useRef, useState } from 'react';
import { Plus, Package, X, Tag, Search, Layers, Trash2, Wand2, Pencil, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useCan } from '../../lib/permissions';
import type { Product, InventoryUnit } from '../../types';
import gsap from 'gsap';
import { useToastStore } from '../../store/toast.store';
import { TableSkeleton } from '../../components/common/Skeleton';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

interface ProductWithStock extends Product {
  stockCount?: number;
}

interface AddProductForm {
  name: string;
  brand: string;
  category: string;
  sellingPrice: string;
  warrantyMonths: string;
}

interface AddUnitForm {
  serialNumber: string;
  productId: string;
  purchasePrice: string;
}

interface StockModal {
  productId: string;
  productName: string;
}

export default function InventoryPage() {
  const canWrite = useCan('inventory.write');
  const canDelete = useCan('inventory.delete');
  const toast = useToastStore();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tab, setTab] = useState<'products' | 'units'>('products');
  const [search, setSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [stockModal, setStockModal] = useState<StockModal | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<ProductWithStock | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [productForm, setProductForm] = useState<AddProductForm>({
    name: '', brand: '', category: '', sellingPrice: '', warrantyMonths: '0',
  });
  const [unitForm, setUnitForm] = useState<AddUnitForm>({
    serialNumber: '', productId: '', purchasePrice: '',
  });
  const [stockSerials, setStockSerials] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  // Auto-serial generation state
  const [stockMode, setStockMode] = useState<'manual' | 'auto'>('manual');
  const [stockQty, setStockQty] = useState('');
  const [stockPrefix, setStockPrefix] = useState('');

  const loadProducts = () => {
    api.get<ProductWithStock[]>('/inventory/products')
      .then((r) => setProducts(r.data))
      .catch(() => toast.error('Failed to load products'));
  };

  const loadUnits = () => {
    api.get<{ data: InventoryUnit[] }>('/inventory/units?status=in_stock&limit=100')
      .then((r) => setUnits(r.data.data))
      .catch(() => toast.error('Failed to load units'));
  };

  const loadCategories = () => {
    api.get<string[]>('/inventory/categories')
      .then((r) => setCategories(r.data))
      .catch(() => undefined);
  };

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        api.get<ProductWithStock[]>('/inventory/products').then((r) => setProducts(r.data)),
        api.get<{ data: InventoryUnit[] }>('/inventory/units?status=in_stock&limit=100').then((r) => setUnits(r.data.data)),
        api.get<string[]>('/inventory/categories').then((r) => setCategories(r.data)).catch(() => {})
      ]);
    } catch {
      toast.error('Failed to load inventory data');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
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

  const handleDeleteProduct = async (product: ProductWithStock) => {
    setLoading(true);
    try {
      await api.delete(`/inventory/products/${product.id}`);
      toast.success(`"${product.name}" deactivated — historical sales preserved`);
      setDeleteConfirm(null);
      loadProducts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const generateSerials = (): string[] => {
    const qty = parseInt(stockQty);
    if (!stockModal || isNaN(qty) || qty < 1) return [];
    const product = products.find((p) => p.id === stockModal.productId);
    const brandPart = (product?.brand?.slice(0, 3) ?? 'PRD').toUpperCase().replace(/\s+/g, '');
    const catPart = (product?.category?.slice(0, 3) ?? 'CAT').toUpperCase().replace(/\s+/g, '');
    const prefix = stockPrefix.trim() || `${brandPart}-${catPart}`;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return Array.from({ length: qty }, (_, i) =>
      `${prefix}-${date}-${String(i + 1).padStart(4, '0')}`,
    );
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProductId) {
        await api.patch(`/inventory/products/${editingProductId}`, {
          name: productForm.name,
          brand: productForm.brand || undefined,
          category: productForm.category || undefined,
          sellingPrice: parseFloat(productForm.sellingPrice),
          warrantyMonths: parseInt(productForm.warrantyMonths),
        });
        toast.success('Product updated successfully');
      } else {
        await api.post('/inventory/products', {
          name: productForm.name,
          brand: productForm.brand || undefined,
          category: productForm.category || undefined,
          sellingPrice: parseFloat(productForm.sellingPrice),
          warrantyMonths: parseInt(productForm.warrantyMonths),
        });
        toast.success('Product added successfully');
      }
      setShowAddProduct(false);
      setEditingProductId(null);
      setProductForm({ name: '', brand: '', category: productForm.category, sellingPrice: '', warrantyMonths: '0' });
      loadProducts();
      loadCategories();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/inventory/units', {
        serialNumber: unitForm.serialNumber,
        productId: unitForm.productId,
        purchasePrice: unitForm.purchasePrice ? parseFloat(unitForm.purchasePrice) : undefined,
      });
      toast.success('Unit added successfully');
      setShowAddUnit(false);
      setUnitForm({ serialNumber: '', productId: '', purchasePrice: '' });
      loadUnits();
      loadProducts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to add unit');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModal) return;
    let serials: string[];
    if (stockMode === 'auto') {
      serials = generateSerials();
      if (serials.length === 0) { toast.error('Enter a valid quantity'); return; }
    } else {
      serials = stockSerials.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      if (serials.length === 0) { toast.error('Enter at least one serial number'); return; }
    }
    setLoading(true);
    try {
      await api.post('/inventory/units/bulk', {
        units: serials.map((sn) => ({
          serialNumber: sn,
          productId: stockModal.productId,
          purchasePrice: stockPurchasePrice ? parseFloat(stockPurchasePrice) : undefined,
        })),
      });
      toast.success(`${serials.length} unit(s) added to ${stockModal.productName}`);
      setStockModal(null);
      setStockSerials('');
      setStockPurchasePrice('');
      setStockQty('');
      setStockPrefix('');
      setStockMode('manual');
      loadProducts();
      loadUnits();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors';
  const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

  const q = search.toLowerCase();
  const filteredProducts = products.filter((p) =>
    !q || p.name.toLowerCase().includes(q) || (p.brand?.toLowerCase().includes(q) ?? false) || (p.category?.toLowerCase().includes(q) ?? false),
  );
  const filteredUnits = units.filter((u) =>
    !q || u.serialNumber.toLowerCase().includes(q) || u.product.name.toLowerCase().includes(q) || (u.product.brand?.toLowerCase().includes(q) ?? false),
  );

  return (
    <div ref={containerRef} className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center shrink-0">
            <Package size={20} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Inventory</h1>
            <p className="text-xs text-stitch-on-surface-variant">Products and serial-number stock management</p>
          </div>
        </div>
        {canWrite && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setEditingProductId(null); setProductForm({ name: '', brand: '', category: '', sellingPrice: '', warrantyMonths: '0' }); setShowAddProduct(true); setShowAddUnit(false); setStockModal(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95"
            >
              <Plus size={14} /> Add Product
            </button>
            <button
              onClick={() => { setShowAddUnit(true); setShowAddProduct(false); setStockModal(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-stitch-tertiary/20 text-stitch-tertiary text-sm font-bold rounded-lg border border-stitch-tertiary/30 hover:bg-stitch-tertiary/30 transition-all active:scale-95"
            >
              <Plus size={14} /> Add Unit
            </button>
          </div>
        )}
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, brand, serial…"
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/40"
        />
      </div>

      {/* Notifications handled globally via ToastContainer */}

      {showAddProduct && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base font-semibold text-stitch-on-surface font-space"
              style={{ borderLeft: '3px solid rgba(192,193,255,0.5)', paddingLeft: '10px' }}>
              {editingProductId ? 'Edit Product' : 'New Product'}
            </h2>
            <button onClick={() => { setShowAddProduct(false); setEditingProductId(null); }} className="text-stitch-on-surface-variant hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className={labelCls}>Name *</label>
              <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                list="cat-list"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                placeholder="Type or pick existing…"
                className={inputCls}
              />
              <datalist id="cat-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Selling Price (₨) *</label>
              <input type="number" min="0" step="0.01" value={productForm.sellingPrice}
                onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Warranty (months)</label>
              <input type="number" min="0" value={productForm.warrantyMonths}
                onChange={(e) => setProductForm({ ...productForm, warrantyMonths: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-1 sm:col-span-2 flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => { setShowAddProduct(false); setEditingProductId(null); }}
                className="px-4 py-2 text-sm text-stitch-on-surface-variant hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-stitch-primary text-stitch-on-primary font-bold rounded-lg hover:bg-stitch-primary/90 disabled:opacity-50 active:scale-95 transition-all">
                {loading ? 'Saving…' : (editingProductId ? 'Update Product' : 'Save Product')}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddUnit && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base font-semibold text-stitch-on-surface font-space"
              style={{ borderLeft: '3px solid rgba(47,217,244,0.5)', paddingLeft: '10px' }}>
              Add Unit (Serial Number)
            </h2>
            <button onClick={() => setShowAddUnit(false)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddUnit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Serial Number *</label>
              <input value={unitForm.serialNumber} onChange={(e) => setUnitForm({ ...unitForm, serialNumber: e.target.value })}
                required placeholder="SN-XXXX-00000" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Product *</label>
              <select value={unitForm.productId} onChange={(e) => setUnitForm({ ...unitForm, productId: e.target.value })} required className={inputCls}>
                <option value="">Select product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Purchase Price (₨)</label>
              <input type="number" min="0" step="0.01" value={unitForm.purchasePrice}
                onChange={(e) => setUnitForm({ ...unitForm, purchasePrice: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-1 sm:col-span-3 flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowAddUnit(false)}
                className="px-4 py-2 text-sm text-stitch-on-surface-variant hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-stitch-tertiary/20 text-stitch-tertiary font-bold border border-stitch-tertiary/30 rounded-lg hover:bg-stitch-tertiary/30 disabled:opacity-50 active:scale-95 transition-all">
                {loading ? 'Adding…' : 'Add Unit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {stockModal && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base font-semibold text-stitch-on-surface font-space"
              style={{ borderLeft: '3px solid rgba(74,222,128,0.5)', paddingLeft: '10px' }}>
              Add Stock — {stockModal.productName}
            </h2>
            <button onClick={() => setStockModal(null)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddStock} className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/5 w-fit">
              {(['manual', 'auto'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setStockMode(m); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    stockMode === m
                      ? 'bg-stitch-primary/20 text-stitch-primary border border-stitch-primary/30'
                      : 'text-stitch-on-surface-variant hover:text-white'
                  }`}
                >
                  {m === 'auto' && <Wand2 size={11} />}
                  {m === 'manual' ? 'Manual Entry' : 'Auto-Generate'}
                </button>
              ))}
            </div>

            {stockMode === 'manual' ? (
              <div>
                <label className={labelCls}>Serial Numbers * (one per line or comma-separated)</label>
                <textarea
                  value={stockSerials}
                  onChange={(e) => setStockSerials(e.target.value)}
                  rows={4}
                  required
                  placeholder={'SN-001\nSN-002\nSN-003'}
                  className={`${inputCls} font-mono resize-none`}
                />
                <p className="text-[10px] text-stitch-on-surface-variant mt-1">
                  {stockSerials.split(/[\n,]+/).filter((s) => s.trim()).length} serial(s) entered
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      required={stockMode === 'auto'}
                      placeholder="e.g. 500"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Prefix (optional)</label>
                    <input
                      value={stockPrefix}
                      onChange={(e) => setStockPrefix(e.target.value)}
                      placeholder="e.g. SAM-LAP (auto-filled)"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                </div>
                {stockQty && parseInt(stockQty) > 0 && (
                  <div className="p-3 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono text-stitch-on-surface-variant space-y-0.5">
                    <p className="font-bold text-stitch-on-surface text-xs mb-1">Preview (first 3 serials)</p>
                    {generateSerials().slice(0, 3).map((s) => (
                      <p key={s}>{s}</p>
                    ))}
                    {parseInt(stockQty) > 3 && (
                      <p className="text-stitch-primary">…and {parseInt(stockQty) - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="max-w-xs">
              <label className={labelCls}>Purchase Price per Unit (₨)</label>
              <input type="number" min="0" step="0.01" value={stockPurchasePrice}
                onChange={(e) => setStockPurchasePrice(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setStockModal(null); setStockMode('manual'); setStockQty(''); setStockPrefix(''); }}
                className="px-4 py-2 text-sm text-stitch-on-surface-variant hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all">
                <Layers size={14} />
                {loading ? 'Adding…' : `Add ${stockMode === 'auto' && stockQty ? parseInt(stockQty).toLocaleString() + ' ' : ''}Stock`}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex border-b border-white/5 px-4 gap-1 bg-white/[0.01]">
          {([
            { key: 'products', label: 'Products', count: products.length },
            { key: 'units', label: 'In-Stock Units', count: units.length },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-stitch-primary text-stitch-primary'
                  : 'border-transparent text-stitch-on-surface-variant hover:text-white'
              }`}>
              {t.label}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-stitch-primary/20 text-stitch-primary' : 'bg-white/5 text-stitch-on-surface-variant'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                  {['Product', 'Brand', 'Category', 'Price', 'Warranty', 'Stock', 'Status', ...((canWrite || canDelete) ? ['Actions'] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataLoading ? (
                  <TableSkeleton cols={(canWrite || canDelete) ? 8 : 7} rows={6} />
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={(canWrite || canDelete) ? 8 : 7} className="py-16 text-center">
                      <Package size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
                      <p className="text-sm text-stitch-on-surface-variant">{search ? 'No products match your search' : 'No products yet'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-stitch-on-surface">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{p.brand ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.category ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stitch-primary/10 text-stitch-primary border border-stitch-primary/20">
                            <Tag size={9} />{p.category}
                          </span>
                        ) : <span className="text-stitch-on-surface-variant text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-stitch-on-surface tabular-nums">{formatPKR(Number(p.sellingPrice))}</td>
                      <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{p.warrantyMonths ? `${p.warrantyMonths}m` : '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold tabular-nums">
                        <span className={p.stockCount !== undefined && p.stockCount <= 2 ? 'text-amber-400' : 'text-stitch-tertiary'}>
                          {p.stockCount ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-stitch-error/10 text-stitch-error border border-stitch-error/20'
                        }`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      {(canWrite || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {canWrite && (
                              <button
                                onClick={() => {
                                  setProductForm({
                                    name: p.name,
                                    brand: p.brand || '',
                                    category: p.category || '',
                                    sellingPrice: String(p.sellingPrice),
                                    warrantyMonths: String(p.warrantyMonths || 0),
                                  });
                                  setEditingProductId(p.id);
                                  setShowAddProduct(true);
                                  setShowAddUnit(false);
                                  setStockModal(null);
                                }}
                                title="Edit product"
                                className="flex items-center justify-center w-7 h-7 text-stitch-on-surface-variant hover:text-blue-400 hover:bg-blue-400/10 border border-white/5 hover:border-blue-400/20 rounded-lg transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                            {canWrite && (
                              <button
                                onClick={() => { setStockModal({ productId: p.id, productName: p.name }); setShowAddProduct(false); setShowAddUnit(false); }}
                                className="flex items-center gap-1 text-[11px] font-bold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Plus size={11} /> Stock
                              </button>
                            )}
                            {canDelete && p.isActive && (
                              <button
                                onClick={() => setDeleteConfirm(p)}
                                title="Deactivate product"
                                className="flex items-center justify-center w-7 h-7 text-stitch-on-surface-variant hover:text-stitch-error hover:bg-stitch-error/10 border border-white/5 hover:border-stitch-error/20 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'units' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                  {['Serial Number', 'Product', 'Brand', 'Status', 'Purchase Price'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataLoading ? (
                  <TableSkeleton cols={5} rows={6} />
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <Package size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
                      <p className="text-sm text-stitch-on-surface-variant">{search ? 'No units match your search' : 'No units in stock'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-stitch-tertiary">{u.serialNumber}</td>
                      <td className="px-4 py-3 text-sm font-medium text-stitch-on-surface">{u.product.name}</td>
                      <td className="px-4 py-3 text-sm text-stitch-on-surface-variant">{u.product.brand ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                          {u.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">
                        {u.purchasePrice ? formatPKR(Number(u.purchasePrice)) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-xl p-6 w-full max-w-sm border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-stitch-error/10 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-stitch-error" />
              </div>
              <div>
                <p className="font-bold text-stitch-on-surface font-space">Deactivate Product?</p>
                <p className="text-xs text-stitch-on-surface-variant mt-0.5">Historical sales and serial records are preserved.</p>
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <p className="text-sm font-semibold text-stitch-on-surface">{deleteConfirm.name}</p>
              {deleteConfirm.brand && (
                <p className="text-xs text-stitch-on-surface-variant mt-0.5">{deleteConfirm.brand}</p>
              )}
              {(deleteConfirm.stockCount ?? 0) > 0 && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {deleteConfirm.stockCount} unit(s) still in stock
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteProduct(deleteConfirm)}
                disabled={loading}
                className="flex-1 py-2 text-sm bg-stitch-error text-stitch-on-error font-bold rounded-lg hover:bg-stitch-error/80 disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
