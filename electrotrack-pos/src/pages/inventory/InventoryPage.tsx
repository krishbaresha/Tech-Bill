import { useEffect, useRef, useState } from 'react';
import { Plus, Package, AlertTriangle, CheckCircle, X, Tag, Search } from 'lucide-react';
import { api } from '../../api/client';
import { useCan } from '../../lib/permissions';
import type { Product, InventoryUnit } from '../../types';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

interface ProductWithStock extends Product {
  inStockCount?: number;
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

export default function InventoryPage() {
  const canWrite = useCan('inventory.write');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [tab, setTab] = useState<'products' | 'units'>('products');
  const [search, setSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const [productForm, setProductForm] = useState<AddProductForm>({
    name: '', brand: '', category: '', sellingPrice: '', warrantyMonths: '0',
  });
  const [unitForm, setUnitForm] = useState<AddUnitForm>({
    serialNumber: '', productId: '', purchasePrice: '',
  });

  const loadProducts = () => {
    api.get<ProductWithStock[]>('/inventory/products')
      .then((r) => setProducts(r.data))
      .catch(() => setError('Failed to load products'));
  };

  const loadUnits = () => {
    api.get<{ data: InventoryUnit[] }>('/inventory/units?status=in_stock&limit=100')
      .then((r) => setUnits(r.data.data))
      .catch(() => setError('Failed to load units'));
  };

  useEffect(() => {
    loadProducts();
    loadUnits();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current.querySelectorAll('.glass-card'), {
        opacity: 0, y: 20, duration: 0.5, stagger: 0.06, ease: 'power2.out',
      });
    }
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/inventory/products', {
        name: productForm.name,
        brand: productForm.brand || undefined,
        category: productForm.category || undefined,
        sellingPrice: parseFloat(productForm.sellingPrice),
        warrantyMonths: parseInt(productForm.warrantyMonths),
      });
      setSuccessMsg('Product added successfully');
      setShowAddProduct(false);
      setProductForm({ name: '', brand: '', category: '', sellingPrice: '', warrantyMonths: '0' });
      loadProducts();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/inventory/units', {
        serialNumber: unitForm.serialNumber,
        productId: unitForm.productId,
        purchasePrice: unitForm.purchasePrice ? parseFloat(unitForm.purchasePrice) : undefined,
      });
      setSuccessMsg('Unit added successfully');
      setShowAddUnit(false);
      setUnitForm({ serialNumber: '', productId: '', purchasePrice: '' });
      loadUnits();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to add unit');
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
              onClick={() => { setShowAddProduct(true); setShowAddUnit(false); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95"
            >
              <Plus size={14} /> Add Product
            </button>
            <button
              onClick={() => { setShowAddUnit(true); setShowAddProduct(false); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-stitch-tertiary/20 text-stitch-tertiary text-sm font-bold rounded-lg border border-stitch-tertiary/30 hover:bg-stitch-tertiary/30 transition-all active:scale-95"
            >
              <Plus size={14} /> Add Unit
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, brand, serial…"
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/40"
        />
      </div>

      {error && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-2 border-l-4 border-stitch-error/50">
          <AlertTriangle size={14} className="text-stitch-error shrink-0" />
          <p className="text-sm text-stitch-error">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-stitch-on-surface-variant hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-2 border-l-4 border-green-500/50">
          <CheckCircle size={14} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{successMsg}</p>
        </div>
      )}

      {showAddProduct && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base font-semibold text-stitch-on-surface font-space"
              style={{ borderLeft: '3px solid rgba(192,193,255,0.5)', paddingLeft: '10px' }}>
              New Product
            </h2>
            <button onClick={() => setShowAddProduct(false)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className={inputCls} />
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
            <div className="col-span-2 flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-sm text-stitch-on-surface-variant hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-stitch-primary text-stitch-on-primary font-bold rounded-lg hover:bg-stitch-primary/90 disabled:opacity-50 active:scale-95 transition-all">
                {loading ? 'Saving…' : 'Save Product'}
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
          <form onSubmit={handleAddUnit} className="grid grid-cols-3 gap-4">
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
            <div className="col-span-3 flex gap-2 justify-end pt-1">
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
                  {['Product', 'Brand', 'Category', 'Price', 'Warranty', 'Stock', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
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
                      <td className="px-4 py-3 text-sm font-mono text-stitch-tertiary font-bold">
                        {p.inStockCount !== undefined ? p.inStockCount : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-stitch-error/10 text-stitch-error border border-stitch-error/20'
                        }`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
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
                {filteredUnits.length === 0 ? (
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
    </div>
  );
}
