import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { socket } from '../../api/socket';

import type { WsSaleCreatedPayload } from '../../types';

import { Link } from 'react-router-dom';

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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stitch-on-surface font-mono">{item.invoiceNumber}</p>
                  {item.isOnline && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Online Order
                    </span>
                  )}
                </div>
                <div className="text-xs text-stitch-on-surface-variant flex items-center gap-2 mt-0.5">
                  <span>{item.itemCount} item{item.itemCount !== 1 ? 's' : ''}</span>
                  {item.isOnline && item.shippingStatus === 'pending' && (
                    <>
                      <span className="text-white/20">•</span>
                      <Link to="/online-orders" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Manage online order
                      </Link>
                    </>
                  )}
                  {item.isOnline && item.shippingStatus === 'dispatched' && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="text-green-400">Dispatched</span>
                    </>
                  )}
                </div>
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
