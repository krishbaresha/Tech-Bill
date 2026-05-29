import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, ShoppingCart, Package, Tag } from 'lucide-react';
import { api } from '../../api/client';

import SalesChart from '../../components/dashboard/SalesChart';
import SalesFeed from '../../components/dashboard/SalesFeed';
import StockAlerts from '../../components/dashboard/StockAlerts';
import AiInsights from '../../components/dashboard/AiInsights';
import type { SalesSummary } from '../../types';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

export default function OwnerDashboard() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    api.get<SalesSummary>(`/reports/sales-summary?date=${today}`)
      .then((r) => setSummary(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const els = containerRef.current.querySelectorAll('.glass-card');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, [summary]);

  const statCards = summary
    ? [
        { label: "Today's Revenue", value: formatPKR(summary.totalRevenue), icon: TrendingUp, color: 'text-stitch-tertiary', accent: 'bg-stitch-tertiary' },
        { label: 'Total Sales', value: String(summary.totalSales), icon: ShoppingCart, color: 'text-stitch-primary', accent: 'bg-stitch-primary' },
        { label: 'Items Sold', value: String(summary.totalItems), icon: Package, color: 'text-green-400', accent: 'bg-green-400' },
        { label: 'Discounts Given', value: formatPKR(summary.totalDiscounts), icon: Tag, color: 'text-amber-400', accent: 'bg-amber-400' },
      ]
    : [];

  return (
    <div ref={containerRef} className="p-4 sm:p-6 space-y-6">
      <AiInsights />

      {summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="glass-card rounded-xl p-4 overflow-hidden relative">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accent}/60`} />
              <div className={`w-8 h-8 rounded-lg ${card.accent}/10 flex items-center justify-center mb-3`}>
                <card.icon size={16} className={card.color} />
              </div>
              <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">{card.label}</p>
              <p className={`text-xl font-bold font-space mt-1 ${card.color} tabular-nums`}>{card.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 h-24 animate-pulse bg-white/5" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-4">
          <SalesChart />
        </div>
        <div className="space-y-4">
          <StockAlerts />
          <SalesFeed />
        </div>
      </div>
    </div>
  );
}
