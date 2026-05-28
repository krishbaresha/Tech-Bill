import { useRef } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Sale } from '../../types';
import { useAuthStore } from '../../store/auth.store';

export default function InvoiceModal({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const shopName = useAuthStore((s) => s.user?.tenantName) ?? 'ElectroTrack';

  const subtotal = sale.items.reduce((s, i) => s + Number(i.sellingPrice), 0);
  const discount = Number(sale.discountAmount);
  const total = Number(sale.totalAmount);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=680,height=960');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${sale.invoiceNumber}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Courier New',monospace;padding:32px;background:#fff;color:#111;font-size:12px}
        .receipt{max-width:560px;margin:0 auto}
        .center{text-align:center}
        .shop-name{font-size:20px;font-weight:bold;letter-spacing:3px;text-transform:uppercase}
        .sub{font-size:11px;color:#555;margin-top:3px}
        hr{border:none;border-top:1px dashed #aaa;margin:12px 0}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:3px 0;margin:8px 0}
        .lbl{color:#777;font-size:11px}
        .val{text-align:right;font-size:11px}
        table{width:100%;border-collapse:collapse;margin:8px 0}
        th{text-align:left;font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.05em;padding:5px 0;border-bottom:1px solid #ddd}
        th.r,td.r{text-align:right}
        td{padding:5px 0;font-size:11px;border-bottom:1px solid #f0f0f0;vertical-align:top}
        .brand{font-size:10px;color:#888}
        .serial{font-size:10px;color:#888;font-family:monospace}
        .totals .row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:#444}
        .totals .big{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;border-top:1px solid #222;padding-top:6px;margin-top:4px;color:#111}
        .disc{color:#c00}
        .mono{font-family:monospace}
        .payment{font-size:11px;color:#555;margin-top:6px}
        .footer{text-align:center;font-size:10px;color:#999;margin-top:20px;line-height:1.6}
      </style></head><body><div class="receipt">${content}</div></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="glass-modal rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-white/10">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-stitch-on-surface font-space">Sale Complete</p>
              <p className="text-xs font-mono text-stitch-on-surface-variant">{sale.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg text-sm text-stitch-on-surface-variant hover:bg-white/5 hover:text-white transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
            <button onClick={onClose} className="text-stitch-on-surface-variant hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* White paper receipt */}
        <div className="overflow-auto flex-1 p-4">
          <div
            ref={printRef}
            className="bg-white text-gray-900 rounded-lg p-6 shadow-inner"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* Shop header */}
            <div className="center text-center mb-4">
              <p className="shop-name text-xl font-bold tracking-widest uppercase text-gray-900">{shopName}</p>
              <p className="sub text-[11px] text-gray-500 mt-0.5">Official Receipt</p>
            </div>

            <hr className="border-dashed border-gray-300 my-3" />

            {/* Invoice meta */}
            <div className="meta grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="lbl text-gray-500">Invoice No.</span>
              <span className="val mono text-right font-mono text-gray-800">{sale.invoiceNumber}</span>

              <span className="lbl text-gray-500">Date</span>
              <span className="val text-right text-gray-800">
                {format(new Date(sale.createdAt), 'dd MMM yyyy, h:mm a')}
              </span>

              {sale.soldBy && (
                <>
                  <span className="lbl text-gray-500">Cashier</span>
                  <span className="val text-right text-gray-800">{sale.soldBy.name}</span>
                </>
              )}

              {sale.customer && (
                <>
                  <span className="lbl text-gray-500">Customer</span>
                  <span className="val text-right text-gray-800">{sale.customer.name}</span>
                  <span className="lbl text-gray-500">Phone</span>
                  <span className="val mono text-right font-mono text-gray-800">{sale.customer.phone}</span>
                </>
              )}
            </div>

            <hr className="border-dashed border-gray-300 my-3" />

            {/* Items table */}
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="text-left py-1.5 text-gray-500 uppercase tracking-wider text-[10px] font-semibold border-b border-gray-200">
                    Product
                  </th>
                  <th className="text-left py-1.5 text-gray-500 uppercase tracking-wider text-[10px] font-semibold border-b border-gray-200">
                    Serial
                  </th>
                  <th className="r text-right py-1.5 text-gray-500 uppercase tracking-wider text-[10px] font-semibold border-b border-gray-200">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5 text-gray-900">
                      {item.inventoryUnit?.product?.name ?? '—'}
                      {item.inventoryUnit?.product?.brand && (
                        <p className="brand text-[10px] text-gray-400">{item.inventoryUnit.product.brand}</p>
                      )}
                    </td>
                    <td className="py-1.5">
                      <span className="serial font-mono text-[10px] text-gray-500">
                        {item.inventoryUnit?.serialNumber ?? '—'}
                      </span>
                    </td>
                    <td className="r py-1.5 text-right tabular-nums text-gray-900">
                      ₨ {Number(item.sellingPrice).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="border-dashed border-gray-300 my-3" />

            {/* Totals */}
            <div className="totals space-y-1">
              <div className="row flex justify-between text-[12px] text-gray-600">
                <span>Subtotal ({sale.items?.length ?? 0} item{(sale.items?.length ?? 0) !== 1 ? 's' : ''})</span>
                <span className="tabular-nums">₨ {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="row disc flex justify-between text-[12px] text-red-600">
                  <span>Discount</span>
                  <span className="tabular-nums">− ₨ {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="row big flex justify-between text-[15px] font-bold text-gray-900 border-t border-gray-800 pt-1.5 mt-1">
                <span>TOTAL</span>
                <span className="tabular-nums">₨ {total.toLocaleString()}</span>
              </div>
              <p className="payment text-[11px] text-gray-500 capitalize mt-1">
                Payment: {sale.paymentMethod?.replace(/_/g, ' ')}
              </p>
            </div>

            <hr className="border-dashed border-gray-300 my-3" />

            <p className="footer text-center text-[10px] text-gray-400 leading-relaxed">
              Thank you for shopping at {shopName}!<br />
              Keep this receipt for warranty claims.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
