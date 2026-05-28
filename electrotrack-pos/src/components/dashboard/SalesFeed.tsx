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
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-sm font-bold text-stitch-on-surface font-space">Live Sales</p>
      </div>
      <div className="divide-y divide-white/5 max-h-64 overflow-auto">
        {feed.length === 0 ? (
          <p className="text-xs text-stitch-on-surface-variant p-4 text-center">Waiting for sales…</p>
        ) : (
          feed.map((item) => (
            <div key={`${item.invoiceNumber}-${item.timestamp.getTime()}`} className="px-4 py-2.5 flex justify-between items-start hover:bg-white/[0.03] transition-colors">
              <div>
                <p className="text-sm font-medium text-stitch-on-surface font-mono">{item.invoiceNumber}</p>
                <p className="text-xs text-stitch-on-surface-variant">
                  {item.itemCount} item{item.itemCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold tabular-nums text-stitch-primary">
                  ₨ {item.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-stitch-on-surface-variant">
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
