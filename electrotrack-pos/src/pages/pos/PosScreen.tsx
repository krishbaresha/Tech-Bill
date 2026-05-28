import { useState, useEffect, useRef, useMemo } from 'react';
import { ShoppingCart, Package, AlertTriangle, Layers, User, X, Plus } from 'lucide-react';
import gsap from 'gsap';
import UniversalSearch from '../../components/pos/UniversalSearch';
import ProductGrid from '../../components/pos/ProductGrid';
import CartTable from '../../components/pos/CartTable';
import PaymentForm from '../../components/pos/PaymentForm';
import InvoiceModal from '../../components/pos/InvoiceModal';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/client';
import type { Sale, CartItem } from '../../types';

interface ProductCard {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sellingPrice: number;
  inStockCount: number;
  soldCount: number;
  returnedCount: number;
}

interface DashboardData {
  categories: string[];
  lowStock: ProductCard[];
  recentlyAdded: ProductCard[];
  fastSelling: ProductCard[];
  stats: {
    totalProducts: number;
    totalInStock: number;
    totalSold: number;
    totalLowStock: number;
  };
}

interface InventoryUnit {
  id: string;
  serialNumber: string;
  condition: string | null;
  status: string;
  sellingPrice: number;
  productId: string;
  productName?: string;
  brand?: string | null;
}

type StatusFilter = 'in_stock' | 'all' | 'sold';

const formatPKR = (n: number): string => `₨ ${n.toLocaleString('en-PK')}`;

export default function PosScreen() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('in_stock');
  const [viewingProduct, setViewingProduct] = useState<ProductCard | null>(null);
  const [unitPickerUnits, setUnitPickerUnits] = useState<InventoryUnit[]>([]);
  const [unitPickerLoading, setUnitPickerLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [now, setNow] = useState(new Date());

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);

  const statsRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setDashboardLoading(true);
        const res = await api.get<DashboardData>('/inventory/dashboard');
        if (mounted) setDashboard(res.data);
      } catch {
        if (mounted) setDashboard(null);
      } finally {
        if (mounted) setDashboardLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const ctx = gsap.context(() => {
      if (statsRef.current) {
        gsap.fromTo(
          statsRef.current.children,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
      }
      if (pillsRef.current) {
        gsap.fromTo(
          pillsRef.current.children,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out', delay: 0.15 }
        );
      }
      if (gridWrapRef.current) {
        gsap.fromTo(
          gridWrapRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.2 }
        );
      }
    });
    return () => ctx.revert();
  }, [dashboard]);

  const allProducts = useMemo<ProductCard[]>(() => {
    if (!dashboard) return [];
    const map = new Map<string, ProductCard>();
    [...dashboard.recentlyAdded, ...dashboard.fastSelling, ...dashboard.lowStock].forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [dashboard]);

  const filteredProducts = useMemo<ProductCard[]>(() => {
    return allProducts.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (statusFilter === 'in_stock' && p.inStockCount <= 0) return false;
      if (statusFilter === 'sold' && p.soldCount <= 0) return false;
      return true;
    });
  }, [allProducts, selectedCategory, statusFilter]);

  const openUnitPicker = async (product: ProductCard) => {
    setViewingProduct(product);
    setUnitPickerUnits([]);
    setUnitPickerLoading(true);
    try {
      const res = await api.get<InventoryUnit[] | { units: InventoryUnit[] }>(
        `/inventory/units?productId=${product.id}&status=in_stock&limit=100`
      );
      const data = res.data as InventoryUnit[] | { units: InventoryUnit[] };
      const units = Array.isArray(data) ? data : data.units ?? [];
      setUnitPickerUnits(units);
    } catch {
      setUnitPickerUnits([]);
    } finally {
      setUnitPickerLoading(false);
    }
  };

  const handleAddUnit = (unit: InventoryUnit) => {
    if (!viewingProduct) return;
    if (items.some((i) => i.serialNumber === unit.serialNumber)) return;
    const cartItem: CartItem = {
      serialNumber: unit.serialNumber,
      productId: viewingProduct.id,
      productName: viewingProduct.name,
      brand: viewingProduct.brand,
      sellingPrice: unit.sellingPrice ?? viewingProduct.sellingPrice,
    };
    addItem(cartItem);
    setUnitPickerUnits((prev) => prev.filter((u) => u.serialNumber !== unit.serialNumber));
  };

  const handleSaleComplete = (sale: Sale) => {
    setCompletedSale(sale);
  };

  const closeInvoice = () => {
    setCompletedSale(null);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
  };

  const dateStr = now.toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short' });
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-full flex flex-col bg-stitch-surface">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-white/5 px-6 flex items-center justify-between bg-stitch-surface-container/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-stitch-primary/15 flex items-center justify-center ring-1 ring-stitch-primary/20">
            <ShoppingCart size={17} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-stitch-on-surface font-space leading-tight">Point of Sale</h1>
            <p className="text-[10px] text-stitch-on-surface-variant uppercase tracking-wider">ElectroTrack Retail</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-stitch-on-surface font-medium tabular-nums">{timeStr}</span>
            <span className="text-[10px] text-stitch-on-surface-variant uppercase tracking-wider">{dateStr}</span>
          </div>
          <div className="h-7 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-stitch-tertiary/15 flex items-center justify-center ring-1 ring-stitch-tertiary/20">
              <User size={13} className="text-stitch-tertiary" />
            </div>
            <span className="text-stitch-on-surface font-medium">{user?.name ?? 'Cashier'}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-5 gap-5">
          <UniversalSearch />

          {/* Stats Row */}
          <div ref={statsRef} className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Package size={15} />}
              label="Total In Stock"
              value={dashboard?.stats.totalInStock ?? 0}
              accent="blue"
              loading={dashboardLoading}
            />
            <StatCard
              icon={<AlertTriangle size={15} />}
              label="Low Stock"
              value={dashboard?.stats.totalLowStock ?? 0}
              accent={dashboard && dashboard.stats.totalLowStock > 0 ? 'red' : 'green'}
              loading={dashboardLoading}
            />
            <StatCard
              icon={<Layers size={15} />}
              label="Products"
              value={dashboard?.stats.totalProducts ?? 0}
              accent="purple"
              loading={dashboardLoading}
            />
          </div>

          {/* Category Pills */}
          <div ref={pillsRef} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <Pill active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
              All
            </Pill>
            {(dashboard?.categories ?? []).map((cat) => (
              <Pill
                key={cat}
                active={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Pill>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 border-b border-white/5">
            {(['in_stock', 'all', 'sold'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`relative px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  statusFilter === s
                    ? 'text-stitch-primary'
                    : 'text-stitch-on-surface-variant hover:text-stitch-on-surface'
                }`}
              >
                {s === 'in_stock' ? 'In Stock' : s === 'all' ? 'All Items' : 'Sold'}
                {statusFilter === s && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-stitch-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div ref={gridWrapRef} className="flex-1 min-h-0">
            {dashboardLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-2 py-10">
                <Package size={32} className="text-stitch-on-surface-variant/30" />
                <p className="text-sm text-stitch-on-surface-variant">No products match this filter</p>
                <p className="text-xs text-stitch-on-surface-variant/60">
                  Try a different category or status
                </p>
              </div>
            ) : (
              <ProductGrid
                products={filteredProducts}
                onAddToCart={(p: ProductCard) => {
                  if (p.inStockCount > 0) openUnitPicker(p);
                }}
                onViewUnits={(p: ProductCard) => openUnitPicker(p)}
              />
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="w-96 shrink-0 border-l border-white/5 bg-stitch-surface-container/30 flex flex-col min-h-0">
          {/* Cart header */}
          <div className="h-14 shrink-0 px-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-stitch-primary" />
              <h2 className="text-sm font-bold text-stitch-on-surface font-space">Cart</h2>
            </div>
            <span className="text-[11px] font-semibold text-stitch-on-surface-variant uppercase tracking-wider tabular-nums">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
            <div className="min-h-[180px]">
              <CartTable />
            </div>

            {/* Customer section */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
                Customer
              </p>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                inputMode="tel"
                className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors"
              />
            </div>

            {items.length > 0 && (
              <PaymentForm
                onSaleComplete={handleSaleComplete}
                customerName={customerName}
                customerPhone={customerPhone}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Unit Picker Sheet */}
      {viewingProduct && (
        <UnitPickerSheet
          product={viewingProduct}
          units={unitPickerUnits}
          loading={unitPickerLoading}
          onClose={() => setViewingProduct(null)}
          onAdd={handleAddUnit}
          cartSerials={items.map((i) => i.serialNumber)}
        />
      )}

      {completedSale && <InvoiceModal sale={completedSale} onClose={closeInvoice} />}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: 'blue' | 'red' | 'green' | 'purple';
  loading: boolean;
}

function StatCard({ icon, label, value, accent, loading }: StatCardProps) {
  const accents: Record<StatCardProps['accent'], { ring: string; text: string; bg: string }> = {
    blue: { ring: 'ring-sky-400/25', text: 'text-sky-300', bg: 'bg-sky-400/10' },
    red: { ring: 'ring-rose-400/25', text: 'text-rose-300', bg: 'bg-rose-400/10' },
    green: { ring: 'ring-emerald-400/25', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
    purple: { ring: 'ring-violet-400/25', text: 'text-violet-300', bg: 'bg-violet-400/10' },
  };
  const a = accents[accent];
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${a.ring} ${a.bg} ${a.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider truncate">
          {label}
        </p>
        {loading ? (
          <div className="h-6 w-16 rounded bg-white/5 animate-pulse mt-0.5" />
        ) : (
          <p className="text-xl font-bold text-stitch-on-surface tabular-nums font-space leading-tight">
            {value.toLocaleString('en-PK')}
          </p>
        )}
      </div>
    </div>
  );
}

interface PillProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Pill({ active, onClick, children }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
        active
          ? 'bg-stitch-primary text-stitch-on-primary shadow-sm'
          : 'bg-white/[0.04] text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-white/[0.07] border border-white/5'
      }`}
    >
      {children}
    </button>
  );
}

interface UnitPickerSheetProps {
  product: ProductCard;
  units: InventoryUnit[];
  loading: boolean;
  onClose: () => void;
  onAdd: (u: InventoryUnit) => void;
  cartSerials: string[];
}

function UnitPickerSheet({ product, units, loading, onClose, onAdd, cartSerials }: UnitPickerSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sheetRef.current) return;
    gsap.fromTo(
      sheetRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg md:rounded-2xl rounded-t-2xl bg-stitch-surface-container border border-white/10 shadow-2xl flex flex-col max-h-[75vh]"
      >
        <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
              Select Serial Number
            </p>
            <h3 className="text-base font-bold text-stitch-on-surface font-space truncate">{product.name}</h3>
            <p className="text-xs text-stitch-on-surface-variant">
              {product.brand ?? '—'} · {formatPKR(product.sellingPrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : units.length === 0 ? (
            <div className="py-10 text-center">
              <Package size={28} className="text-stitch-on-surface-variant/30 mx-auto mb-2" />
              <p className="text-sm text-stitch-on-surface-variant">No in-stock units available</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {units.map((u) => {
                const inCart = cartSerials.includes(u.serialNumber);
                return (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-stitch-tertiary truncate">{u.serialNumber}</p>
                      <p className="text-[11px] text-stitch-on-surface-variant">
                        {u.condition ?? 'New'} · {formatPKR(u.sellingPrice ?? product.sellingPrice)}
                      </p>
                    </div>
                    <button
                      onClick={() => onAdd(u)}
                      disabled={inCart}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stitch-primary text-stitch-on-primary text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={12} />
                      {inCart ? 'Added' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
