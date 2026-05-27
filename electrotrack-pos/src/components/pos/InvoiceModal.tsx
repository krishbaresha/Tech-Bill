import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { Sale } from '../../types';

export default function InvoiceModal({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) return;
    win.document.write(
      `<html><head><title>Invoice ${sale.invoiceNumber}</title>
      <style>
        body{font-family:monospace;padding:20px;font-size:12px;color:#111}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th,td{padding:4px 6px;text-align:left}
        th{border-bottom:1px solid #ccc}
        .right{text-align:right}
        hr{border:none;border-top:1px solid #ccc;margin:8px 0}
      </style></head><body>${content}</body></html>`,
    );
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-green-700">Sale Complete</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-5 space-y-4 overflow-auto">
          <div>
            <p className="text-lg font-bold text-gray-900">INVOICE</p>
            <p className="text-sm font-mono text-gray-600">{sale.invoiceNumber}</p>
            <p className="text-xs text-gray-400">
              {format(new Date(sale.createdAt), 'dd MMM yyyy, h:mm a')}
            </p>
          </div>

          {sale.customerName && (
            <p className="text-sm">
              <span className="text-gray-500">Customer: </span>
              <span className="font-medium">{sale.customerName}</span>
              {sale.customerPhone && (
                <span className="text-gray-400 ml-2">({sale.customerPhone})</span>
              )}
            </p>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Product</th>
                <th className="text-left py-2 font-medium text-gray-600">Serial</th>
                <th className="text-right py-2 font-medium text-gray-600">Price</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2">{item.inventoryUnit?.product?.name}</td>
                  <td className="py-2 font-mono text-xs text-gray-500">{item.serialNumber}</td>
                  <td className="py-2 text-right tabular-nums">
                    Rs {Number(item.sellingPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 border-t border-gray-200 pt-3">
            {Number(sale.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Discount</span>
                <span className="tabular-nums">
                  - Rs {Number(sale.discountAmount).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span className="tabular-nums">Rs {Number(sale.totalAmount).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 capitalize">Payment: {sale.paymentMethod}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
