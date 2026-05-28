import { useEffect, useRef } from 'react';
import { Plus, Package, PackageX, Tag } from 'lucide-react';
import { gsap } from 'gsap';

export interface ProductCard {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sellingPrice: number;
  inStockCount: number;
  soldCount: number;
  returnedCount: number;
}

interface Props {
  products: ProductCard[];
  loading: boolean;
  onAddToCart: (product: ProductCard) => void;
  onViewUnits: (product: ProductCard) => void;
  selectedCategory: string | null;
}

const AVATAR_PALETTE = [
  'bg-indigo-500/30 text-indigo-200 ring-indigo-400/40',
  'bg-violet-500/30 text-violet-200 ring-violet-400/40',
  'bg-fuchsia-500/30 text-fuchsia-200 ring-fuchsia-400/40',
  'bg-rose-500/30 text-rose-200 ring-rose-400/40',
  'bg-amber-500/30 text-amber-200 ring-amber-400/40',
  'bg-emerald-500/30 text-emerald-200 ring-emerald-400/40',
  'bg-teal-500/30 text-teal-200 ring-teal-400/40',
  'bg-sky-500/30 text-sky-200 ring-sky-400/40',
  'bg-blue-500/30 text-blue-200 ring-blue-400/40',
  'bg-pink-500/30 text-pink-200 ring-pink-400/40',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarClasses(name: string): string {
  const index = hashString(name) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
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
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    >
      {products.map((product) => {
        const outOfStock = product.inStockCount === 0;
        const initial = product.name.charAt(0).toUpperCase() || '?';
        const avatarClasses = getAvatarClasses(product.name);

        return (
          <div
            key={product.id}
            data-product-card
            onClick={() => onViewUnits(product)}
            className="glass-card rounded-xl p-4 cursor-pointer border border-white/5 hover:border-white/20 hover:scale-[1.02] transition-all duration-200 flex flex-col group"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-full ring-1 flex items-center justify-center font-semibold text-base shrink-0 ${avatarClasses}`}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stitch-on-surface truncate">
                  {product.name}
                </p>
                {product.brand && (
                  <p className="text-xs text-stitch-on-surface-variant truncate mt-0.5">
                    {product.brand}
                  </p>
                )}
              </div>
            </div>

            {product.category && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stitch-surface-container-high text-[10px] font-medium text-stitch-on-surface-variant uppercase tracking-wide">
                  <Tag size={9} />
                  {product.category}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-lg font-bold text-stitch-tertiary tabular-nums">
                {formatPkr(product.sellingPrice)}
              </span>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between gap-2">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stitch-error/15 text-stitch-error text-[11px] font-semibold">
                  <PackageX size={11} />
                  Out of stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold">
                  <Package size={11} />
                  {product.inStockCount} in stock
                </span>
              )}

              <button
                type="button"
                disabled={outOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!outOfStock) onAddToCart(product);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stitch-primary/90 hover:bg-stitch-primary text-stitch-on-primary text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus size={13} />
                {outOfStock ? 'Unavailable' : 'Pick Serial'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
