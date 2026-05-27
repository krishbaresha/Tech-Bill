import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { socket } from '../../api/socket';
import type { LowStockItem, WsStockLowPayload } from '../../types';

export default function StockAlerts() {
  const [alerts, setAlerts] = useState<LowStockItem[]>([]);

  useEffect(() => {
    api
      .get<{ threshold: number; products: LowStockItem[] }>('/reports/low-stock')
      .then((r) => setAlerts(r.data.products.slice(0, 10)))
      .catch(() => {});

    const handler = (data: WsStockLowPayload) => {
      setAlerts((prev) => {
        const exists = prev.find((a) => a.productId === data.productId);
        if (exists) {
          return prev.map((a) =>
            a.productId === data.productId ? { ...a, inStockCount: data.stockCount } : a,
          );
        }
        return [
          {
            productId: data.productId,
            productName: data.productName,
            brand: null,
            category: null,
            inStockCount: data.stockCount,
            sellingPrice: 0,
          },
          ...prev,
        ].slice(0, 10);
      });
    };

    socket.on('stock.low', handler);
    return () => {
      socket.off('stock.low', handler);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-orange-200 bg-orange-50">
        <p className="text-sm font-medium text-orange-800">Low Stock Alerts</p>
      </div>
      <div className="divide-y divide-gray-100 max-h-52 overflow-auto">
        {alerts.map((item) => (
          <div key={item.productId} className="px-4 py-2.5 flex justify-between items-center">
            <p className="text-sm text-gray-900 truncate flex-1 mr-2">{item.productName}</p>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                item.inStockCount === 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {item.inStockCount} left
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
