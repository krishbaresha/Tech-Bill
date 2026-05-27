import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { socket } from '../../api/socket';
import type { WsSaleCreatedPayload } from '../../types';

interface FeedItem extends WsSaleCreatedPayload {
  timestamp: Date;
}

export default function SalesFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const handler = (data: WsSaleCreatedPayload) => {
      setFeed((prev) => [{ ...data, timestamp: new Date() }, ...prev].slice(0, 20));
    };
    socket.on('sale.created', handler);
    return () => {
      socket.off('sale.created', handler);
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-900">Live Sales</p>
      </div>
      <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
        {feed.length === 0 ? (
          <p className="text-xs text-gray-400 p-4 text-center">Waiting for sales…</p>
        ) : (
          feed.map((item, i) => (
            <div key={i} className="px-4 py-2.5 flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.invoiceNumber}</p>
                <p className="text-xs text-gray-400">
                  {item.itemCount} item{item.itemCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-semibold tabular-nums">
                  Rs {item.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
