import { X, Printer, Plus, Download, ChevronDown } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type { Sale, ShopSettings } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { useFeatureGate } from '../../hooks/useFeatureGate';

interface InvoiceModalProps {
  sale: Sale;
  shopSettings?: ShopSettings | null;
  shopName?: string;
  onClose: () => void;
}

type PageSize = 'A4' | 'A5' | 'A3' | 'invoice';

const PAGE_SIZES: { label: string; value: PageSize; mmW: number; mmH: number | 'auto' }[] = [
  { label: 'A4',      value: 'A4',      mmW: 210, mmH: 297 },
  { label: 'A5',      value: 'A5',      mmW: 148, mmH: 210 },
  { label: 'A3',      value: 'A3',      mmW: 297, mmH: 420 },
  { label: 'Invoice', value: 'invoice', mmW: 80,  mmH: 'auto' },
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

const PAYMENT_BADGE_CLASSES: Record<string, string> = {
  cash: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  easypaisa: 'bg-green-50 text-green-700 border-green-200',
  jazzcash: 'bg-orange-50 text-orange-700 border-orange-200',
  card: 'bg-blue-50 text-blue-700 border-blue-200',
  bank_transfer: 'bg-purple-50 text-purple-700 border-purple-200',
};

function formatCurrency(value: number): string {
  return `₨ ${Number(value).toLocaleString('en-PK')}`;
}

function getPaymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method.replace(/_/g, ' ');
}

function getPaymentBadgeClass(method: string): string {
  return PAYMENT_BADGE_CLASSES[method] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

function getWarrantyText(warrantyDays: number, saleDate: Date): string {
  if (!warrantyDays || warrantyDays <= 0) return '';
  const expiryDate = addDays(saleDate, warrantyDays);
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'Expired';
  return `${daysLeft} days left (until ${format(expiryDate, 'dd MMM yyyy')})`;
}

export default function InvoiceModal({ sale, shopSettings, shopName, onClose }: InvoiceModalProps) {
  const tenantName = useAuthStore((s) => s.user?.tenantName);
  const resolvedShopName = shopSettings?.shopName ?? shopName ?? tenantName ?? 'TechBill';

  const { limits } = useFeatureGate();
  const isAdvanced = limits.qrInvoices;

  const accentColor = isAdvanced ? (shopSettings?.invoiceAccentColor ?? '#14b8a6') : '#0f766e';
  const fontFamily = isAdvanced ? (shopSettings?.invoiceFontFamily ?? 'Inter') : 'system-ui, sans-serif';
  const footerNotes = shopSettings?.invoiceFooterNotes ?? null;
  const showWatermark = isAdvanced ? (shopSettings?.invoiceShowWatermark ?? false) : false;
  const watermarkText = isAdvanced ? (shopSettings?.invoiceWatermarkText ?? '') : '';
  const logoUrl = isAdvanced ? (shopSettings?.logoUrl ?? null) : null;

  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const subtotal = sale.items.reduce((s, i) => s + Number(i.sellingPrice), 0);
  const discount = Number(sale.discountAmount);
  const total = Number(sale.totalAmount);
  const saleDate = new Date(sale.createdAt);

  const returnedUnitIds = new Set(sale.returns?.map(r => r.inventoryUnitId) || []);
  const isSaleVoided = sale.status === 'voided' || sale.shippingStatus === 'returned';
  const hasReturns = (sale.returns && sale.returns.length > 0) || sale.status === 'partial_return';

  const publicInvoiceUrl = `${window.location.origin}/public/invoice/${sale.id}`;

  const handlePrint = (): void => {
    window.print();
  };

  const handleDownloadPDF = async (): Promise<void> => {
    const element = document.getElementById('invoice-print-area');
    if (!element) return;

    const selected = PAGE_SIZES.find(p => p.value === pageSize) ?? PAGE_SIZES[0];
    const pxToMm = 25.4 / 96;

    let format: [number, number] | string;
    if (selected.mmH === 'auto') {
      const elementHeightMm = element.scrollHeight * pxToMm;
      format = [selected.mmW, Math.max(100, elementHeightMm)];
    } else {
      format = [selected.mmW, selected.mmH];
    }

    const opt = {
      margin: selected.value === 'invoice' ? 0 : [8, 10, 8, 10],
      filename: `Invoice_${sale.invoiceNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format, orientation: 'portrait' as const }
    };

    const { default: html2pdf } = await import('html2pdf.js');
    html2pdf().set(opt).from(element).save();
  };

  const selectedSizeLabel = PAGE_SIZES.find(p => p.value === pageSize)?.label ?? 'A4';

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${pageSize === 'invoice' ? '80mm auto' : pageSize};
            margin: ${pageSize === 'invoice' ? '0' : '10mm'};
          }
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: fixed !important;
            left: 0; top: 0;
            width: ${pageSize === 'invoice' ? '80mm' : '100%'} !important;
            background: #ffffff !important;
            color: #111111 !important;
            padding: ${pageSize === 'invoice' ? '8mm 6mm' : '0'} !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #invoice-print-area * {
            color: #111111 !important;
            border-color: #e5e7eb !important;
          }
          #invoice-print-area .print-accent { color: #0f766e !important; }
          #invoice-print-area .print-muted { color: #6b7280 !important; }
          #invoice-print-area .print-total { font-size: 14pt !important; font-weight: bold !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className="w-full max-w-[520px] max-h-[94vh] flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0 no-print bg-gray-50">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400 font-medium">Invoice</p>
            <div className="flex items-center gap-1.5">

              {/* Page Size Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSizeMenu(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-white rounded-lg transition-all"
                >
                  {selectedSizeLabel}
                  <ChevronDown size={11} />
                </button>
                {showSizeMenu && (
                  <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 overflow-hidden">
                    {PAGE_SIZES.map(ps => (
                      <button
                        key={ps.value}
                        onClick={() => { setPageSize(ps.value); setShowSizeMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                          pageSize === ps.value
                            ? 'bg-teal-50 text-teal-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {ps.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-white rounded-lg transition-all"
              >
                <Download size={13} />
                PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-white rounded-lg transition-all"
              >
                <Printer size={13} />
                Print
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-all"
              >
                <Plus size={13} />
                New Sale
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-1 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Invoice Body */}
          <div className="overflow-auto flex-1">
            <div
              id="invoice-print-area"
              className="relative bg-white text-gray-900"
              style={{ fontFamily: `${fontFamily}, system-ui, sans-serif` }}
            >
              {/* Watermark */}
              {isSaleVoided ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                  <span
                    className="text-6xl font-black uppercase whitespace-nowrap opacity-[0.08]"
                    style={{ transform: 'rotate(-30deg)', color: '#ef4444' }}
                  >
                    {sale.status === 'voided' ? 'VOID' : 'RETURNED'}
                  </span>
                </div>
              ) : hasReturns ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                  <span
                    className="text-6xl font-black uppercase whitespace-nowrap opacity-[0.08]"
                    style={{ transform: 'rotate(-30deg)', color: '#ef4444' }}
                  >
                    PARTIAL RETURN
                  </span>
                </div>
              ) : (showWatermark && watermarkText) ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                  <span
                    className="text-6xl font-black uppercase whitespace-nowrap opacity-[0.05]"
                    style={{ transform: 'rotate(-30deg)', color: '#000000' }}
                  >
                    {watermarkText}
                  </span>
                </div>
              ) : null}

              {/* Header */}
              <div className="px-8 pt-8 pb-5 relative z-10 border-b border-gray-100">
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
                      <h2 className="text-xl font-bold tracking-tight leading-tight text-gray-900">
                        {resolvedShopName}
                      </h2>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">
                        Invoice · <span className="font-mono normal-case tracking-normal text-gray-600">{sale.invoiceNumber}</span>
                      </p>
                    </div>
                  </div>
                  {isAdvanced && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      <span className="text-[11px] leading-none">✓</span> VERIFIED
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3 tabular-nums">
                  {format(saleDate, 'dd MMM yyyy, h:mm a')}
                </p>
              </div>

              {/* Sold To */}
              <div className="px-8 py-5 border-b border-gray-100 relative z-10">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-3">Sold To</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-gray-900 font-medium">
                      {sale.customer?.name ?? 'Walk-in Customer'}
                    </span>
                    {!sale.customer && (
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Walk-in</span>
                    )}
                  </div>
                  {sale.customer?.phone && (
                    <p className="text-gray-500 font-mono text-xs">{sale.customer.phone}</p>
                  )}
                  {sale.soldBy?.name && (
                    <p className="text-gray-400 text-xs pt-1">
                      Cashier • <span className="text-gray-600">{sale.soldBy.name}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="px-8 py-5 border-b border-gray-100 relative z-10">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-4">Items</p>
                <div className="space-y-4">
                  {sale.items.map((item, idx) => {
                    const product = item.inventoryUnit?.product;
                    const serial = item.inventoryUnit?.serialNumber;
                    const wDays = product?.warrantyMonths ?? 0;
                    const isItemReturned = isSaleVoided || returnedUnitIds.has(item.inventoryUnit?.id);
                    const warrantyText = isItemReturned ? '' : getWarrantyText(wDays, saleDate);
                    return (
                      <div key={item.id ?? idx} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm text-gray-900 font-medium leading-snug">
                            {product?.name ?? 'Item'}
                          </p>
                          <p className="text-sm text-gray-900 tabular-nums whitespace-nowrap font-semibold">
                            {formatCurrency(item.sellingPrice)}
                          </p>
                        </div>
                        {product?.brand && (
                          <p className="text-[11px] text-gray-400">{product.brand}</p>
                        )}
                        {serial && (
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-mono print-accent" style={{ color: accentColor, opacity: 0.9 }}>
                              SN • {serial}
                            </p>
                            {isItemReturned && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 uppercase">Returned</span>
                            )}
                          </div>
                        )}
                        {warrantyText && (
                          <p className="text-[10px] text-gray-400">
                            Warranty: {warrantyText}
                          </p>
                        )}
                        {idx < sale.items.length - 1 && (
                          <div className="h-px bg-gray-100 mt-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="px-8 py-5 space-y-2 relative z-10">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700 tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-rose-600 tabular-nums">− {formatCurrency(discount)}</span>
                  </div>
                )}
                {Number(sale.additionalCharges) > 0 && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-gray-500">Additional Charges</span>
                    <span className="text-emerald-700 tabular-nums">+ {formatCurrency(Number(sale.additionalCharges))}</span>
                  </div>
                )}
                {sale.description && (
                  <div className="text-xs text-gray-400 mt-1 italic">
                    Note: {sale.description}
                  </div>
                )}
                <div className="h-px bg-gray-200 my-3" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Total</span>
                  <span className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight print-total">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-gray-500">Payment</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border rounded-full ${getPaymentBadgeClass(sale.paymentMethod)}`}
                  >
                    {getPaymentLabel(sale.paymentMethod)}
                  </span>
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-8" />

              {/* QR / Footer */}
              <div className="px-8 py-7 flex flex-col items-center gap-4 relative z-10">
                {isAdvanced ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <QRCodeSVG
                        value={publicInvoiceUrl}
                        size={96}
                        level="H"
                        fgColor="#111111"
                        bgColor="#ffffff"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Scan to verify</p>
                      <p className="font-mono text-xs text-gray-600 mt-1">{sale.invoiceNumber}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-mono text-xs text-gray-400 mt-1">Receipt Ref • {sale.invoiceNumber}</p>
                  </div>
                )}
                <div className="text-center pt-2 space-y-1">
                  <p className="text-sm text-gray-700">Thank you for your purchase</p>
                  {footerNotes && (
                    <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">{footerNotes}</p>
                  )}
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gray-300 mt-1">
                    {resolvedShopName}
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
