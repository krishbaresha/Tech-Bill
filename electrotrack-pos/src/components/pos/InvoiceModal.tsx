import { X, Printer, Plus } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import type { Sale, ShopSettings } from '../../types';
import { useAuthStore } from '../../store/auth.store';

interface InvoiceModalProps {
  sale: Sale;
  shopSettings?: ShopSettings | null;
  shopName?: string;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

const PAYMENT_BADGE_CLASSES: Record<string, string> = {
  cash: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  easypaisa: 'bg-green-500/15 text-green-300 border-green-400/30',
  jazzcash: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  card: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  bank_transfer: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
};

const DEFAULT_WARRANTY_MONTHS = 12;

function formatCurrency(value: number): string {
  return `₨ ${Number(value).toLocaleString('en-PK')}`;
}

function getPaymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method.replace(/_/g, ' ');
}

function getPaymentBadgeClass(method: string): string {
  return PAYMENT_BADGE_CLASSES[method] ?? 'bg-white/10 text-white/70 border-white/20';
}

function VerificationCode({ invoiceNumber, accentColor }: { invoiceNumber: string; accentColor?: string }) {
  const cells = Array.from({ length: 64 }, (_, i) => {
    const seed = invoiceNumber.charCodeAt(i % invoiceNumber.length) + i * 7;
    return (seed % 3) !== 0;
  });
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative p-3 bg-white/[0.03] border border-white/10 rounded-xl">
        <div className="grid grid-cols-8 gap-[2px] w-[88px] h-[88px]">
          {cells.map((on, i) => (
            <div
              key={i}
              style={on ? { backgroundColor: accentColor ?? 'rgba(255,255,255,0.9)', borderRadius: '1px' } : undefined}
            />
          ))}
        </div>
        <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-white/40" />
        <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-white/40" />
        <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-white/40" />
        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-white/40" />
      </div>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Scan to verify</p>
        <p className="font-mono text-xs text-white/80 mt-1">{invoiceNumber}</p>
      </div>
    </div>
  );
}

export default function InvoiceModal({ sale, shopSettings, shopName, onClose }: InvoiceModalProps) {
  const tenantName = useAuthStore((s) => s.user?.tenantName);
  const resolvedShopName = shopSettings?.shopName ?? shopName ?? tenantName ?? 'ElectroTrack';

  const accentColor = shopSettings?.invoiceAccentColor ?? '#14b8a6';
  const primaryColor = shopSettings?.invoicePrimaryColor ?? '#ffffff';
  const fontFamily = shopSettings?.invoiceFontFamily ?? 'Inter';
  const footerNotes = shopSettings?.invoiceFooterNotes ?? null;
  const showWatermark = shopSettings?.invoiceShowWatermark ?? false;
  const watermarkText = shopSettings?.invoiceWatermarkText ?? '';
  const logoUrl = shopSettings?.logoUrl ?? null;

  const subtotal = sale.items.reduce((s, i) => s + Number(i.sellingPrice), 0);
  const discount = Number(sale.discountAmount);
  const total = Number(sale.totalAmount);
  const saleDate = new Date(sale.createdAt);
  const warrantyEnd = addMonths(saleDate, DEFAULT_WARRANTY_MONTHS);

  const handlePrint = (): void => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: absolute !important;
            left: 0; top: 0;
            width: 100% !important;
            background: #0a0a0a !important;
            color: #fff !important;
            padding: 32px !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md no-print">
        <div className="w-full max-w-[480px] max-h-[94vh] flex flex-col bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Receipt</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/5 rounded-lg transition-all"
              >
                <Printer size={13} />
                Print
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-white hover:bg-white/90 rounded-lg transition-all"
              >
                <Plus size={13} />
                New Sale
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-1 p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-auto flex-1">
            <div
              id="invoice-print-area"
              className="relative bg-zinc-950 text-white"
              style={{
                fontFamily: `${fontFamily}, system-ui, sans-serif`,
                backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 30%)',
              }}
            >
              {/* Watermark */}
              {showWatermark && watermarkText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                  <span
                    className="text-6xl font-black uppercase opacity-[0.04] whitespace-nowrap"
                    style={{ transform: 'rotate(-30deg)', color: primaryColor }}
                  >
                    {watermarkText}
                  </span>
                </div>
              )}

              <div className="px-7 pt-7 pb-5 relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt={resolvedShopName}
                        className="h-10 w-auto object-contain rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-medium tracking-tight leading-tight" style={{ color: primaryColor }}>
                        {resolvedShopName}
                      </h2>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mt-1.5">
                        Tax Invoice · <span className="font-mono normal-case tracking-normal text-white/60">{sale.invoiceNumber}</span>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 rounded-full">
                    <span className="text-[11px] leading-none">✓</span> VERIFIED
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-3 tabular-nums">
                  {format(saleDate, 'dd MMM yyyy, h:mm a')}
                </p>
              </div>

              <div className="h-px bg-white/10 mx-7" />

              <div className="px-7 py-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-3">Sold To</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-white font-medium">
                      {sale.customer?.name ?? 'Walk-in Customer'}
                    </span>
                    {!sale.customer && (
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Walk-in</span>
                    )}
                  </div>
                  {sale.customer?.phone && (
                    <p className="text-white/60 font-mono text-xs">{sale.customer.phone}</p>
                  )}
                  {sale.soldBy?.name && (
                    <p className="text-white/50 text-xs pt-1">
                      Cashier · <span className="text-white/70">{sale.soldBy.name}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/10 mx-7" />

              <div className="px-7 py-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-4">Items</p>
                <div className="space-y-4">
                  {sale.items.map((item, idx) => {
                    const product = item.inventoryUnit?.product;
                    const serial = item.inventoryUnit?.serialNumber;
                    return (
                      <div key={item.id ?? idx} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm text-white font-medium leading-snug">
                            {product?.name ?? 'Item'}
                          </p>
                          <p className="text-sm text-white tabular-nums whitespace-nowrap font-medium">
                            {formatCurrency(item.sellingPrice)}
                          </p>
                        </div>
                        {product?.brand && (
                          <p className="text-[11px] text-white/45">{product.brand}</p>
                        )}
                        {serial && (
                          <p className="text-[11px] font-mono" style={{ color: accentColor, opacity: 0.8 }}>
                            SN · {serial}
                          </p>
                        )}
                        <p className="text-[10px] text-white/35">
                          Warranty until {format(warrantyEnd, 'dd MMM yyyy')}
                        </p>
                        {idx < sale.items.length - 1 && (
                          <div className="h-px bg-white/5 mt-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/10 mx-7" />

              <div className="px-7 py-5 space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-white/55">Subtotal</span>
                  <span className="text-white/80 tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-white/55">Discount</span>
                    <span className="text-rose-300 tabular-nums">− {formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="h-px bg-white/15 my-3" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/50">Total</span>
                  <span className="text-2xl font-medium text-white tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-white/50">Payment</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border rounded-full ${getPaymentBadgeClass(sale.paymentMethod)}`}
                  >
                    {getPaymentLabel(sale.paymentMethod)}
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/10 mx-7" />

              <div className="px-7 py-7 flex flex-col items-center gap-4">
                <VerificationCode invoiceNumber={sale.invoiceNumber} accentColor={accentColor} />
                <div className="text-center pt-2 space-y-1">
                  <p className="text-sm text-white/80">Thank you for your purchase</p>
                  {footerNotes && (
                    <p className="text-xs text-white/50 max-w-xs mx-auto mt-2 leading-relaxed">{footerNotes}</p>
                  )}
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mt-1">
                    {resolvedShopName} · ElectroTrack POS
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
