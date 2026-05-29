import { useEffect, useRef } from 'react';
import { Plus, Package, PackageX, Tag, Cpu, HardDrive, MemoryStick, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import type { ProductSpecifications } from '../../types';

export interface ProductCard {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sellingPrice: number;
  comparePrice?: number | null;
  inStockCount: number;
  soldCount: number;
  returnedCount: number;
  shortDescription?: string | null;
  aiSummary?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  specifications?: ProductSpecifications | null;
}

interface Props {
  products: ProductCard[];
  loading: boolean;
  onAddToCart: (product: ProductCard) => void;
  onViewUnits: (product: ProductCard) => void;
  selectedCategory: string | null;
}

const AVATAR_PALETTE = [
  'from-indigo-500/40 to-violet-600/40 text-indigo-200',
  'from-violet-500/40 to-fuchsia-600/40 text-violet-200',
  'from-rose-500/40 to-pink-600/40 text-rose-200',
  'from-amber-500/40 to-orange-600/40 text-amber-200',
  'from-emerald-500/40 to-teal-600/40 text-emerald-200',
  'from-sky-500/40 to-blue-600/40 text-sky-200',
  'from-teal-500/40 to-cyan-600/40 text-teal-200',
  'from-pink-500/40 to-rose-600/40 text-pink-200',
];

const SPEC_ICONS: Record<string, React.ReactNode> = {
  cpu:     <Cpu size={9} />,
  ram:     <MemoryStick size={9} />,
  storage: <HardDrive size={9} />,
};

function SpecChips({ specs }: { specs: ProductSpecifications }) {
  const chips = (['ram', 'storage', 'cpu'] as const)
    .flatMap((k) => (specs[k] ? [{ key: k, val: specs[k]! }] : []))
    .slice(0, 3);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {chips.map(({ key, val }) => (
        <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-stitch-on-surface-variant font-mono">
          {SPEC_ICONS[key]}{val}
        </span>
      ))}
    </div>
  );
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}


function formatPkr(value: number): string {
  return `₨ ${value.toLocaleString('en-PK')}`;
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-white/10 rounded w-3/4" />
          <div className="h-2.5 bg-white/5 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2.5 bg-white/5 rounded w-1/3" />
        <div className="h-5 bg-white/10 rounded w-1/2" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-5 bg-white/5 rounded w-20" />
        <div className="h-8 bg-white/10 rounded-lg w-20" />
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  loading,
  onAddToCart,
  onViewUnits,
  selectedCategory,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>('[data-product-card]');
    if (cards.length === 0) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: 'power2.out',
        stagger: 0.04,
      },
    );
  }, [products, loading]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass-card rounded-xl p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-stitch-surface-container-high flex items-center justify-center mb-4">
          <PackageX size={26} className="text-stitch-on-surface-variant" />
        </div>
        <p className="text-sm font-semibold text-stitch-on-surface">No products match</p>
        <p className="text-xs text-stitch-on-surface-variant mt-1 max-w-xs">
          {selectedCategory
            ? `Nothing in "${selectedCategory}" right now. Try another category or clear filters.`
            : 'Try a different search term or receive new stock to see products here.'}
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {products.map((product) => {
        const outOfStock = product.inStockCount === 0;
        const palette = AVATAR_PALETTE[hashString(product.name) % AVATAR_PALETTE.length];
        const hasDiscount = product.comparePrice && product.comparePrice > product.sellingPrice;

        return (
          <div
            key={product.id}
            data-product-card
            onClick={() => onViewUnits(product)}
            className="glass-card rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-stitch-primary/30 hover:shadow-lg hover:shadow-stitch-primary/5 transition-all duration-200 group flex flex-col"
          >
            {/* Hero image / gradient avatar */}
            <div className="relative h-28 shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${palette} flex items-center justify-center`}>
                  <span className="text-3xl font-black opacity-60 select-none">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {product.category && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-medium text-white/70">
                  <Tag size={8} />{product.category}
                </span>
              )}
              {product.aiSummary && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-stitch-primary/20 backdrop-blur-sm flex items-center justify-center" title={product.aiSummary}>
                  <Sparkles size={10} className="text-stitch-primary" />
                </span>
              )}
              {outOfStock && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col flex-1 gap-1.5">
              <div>
                <p className="text-sm font-bold text-stitch-on-surface truncate leading-snug">{product.name}</p>
                {product.brand && <p className="text-[11px] text-stitch-on-surface-variant truncate">{product.brand}</p>}
              </div>

              {product.specifications
                ? <SpecChips specs={product.specifications} />
                : product.shortDescription && (
                  <p className="text-[11px] text-stitch-on-surface-variant leading-normal line-clamp-2 mt-0.5">
                    {product.shortDescription}
                  </p>
                )
              }

              <div className="flex items-baseline gap-2 mt-auto pt-1.5">
                <span className="text-base font-bold text-stitch-tertiary tabular-nums">{formatPkr(product.sellingPrice)}</span>
                {hasDiscount && (
                  <span className="text-xs text-stitch-on-surface-variant/50 line-through tabular-nums">{formatPkr(product.comparePrice!)}</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                {outOfStock ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stitch-error/15 text-stitch-error text-[11px] font-semibold">
                    <PackageX size={10} /> Out
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold">
                    <Package size={10} /> {product.inStockCount}
                  </span>
                )}
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={(e) => { e.stopPropagation(); if (!outOfStock) onAddToCart(product); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stitch-primary/90 hover:bg-stitch-primary text-stitch-on-primary text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
