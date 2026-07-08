import { useEffect, useRef, useState } from 'react';
import { Star, Award, Crown, Gem, TrendingUp, Users } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client';
import gsap from 'gsap';

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  sales?: { id: string; totalAmount: number; createdAt: string }[];
}

interface TierConfig {
  name: string;
  minSpend: number;
  color: string;
  textColor: string;
  icon: typeof Star;
  emoji: string;
}

const TIERS: TierConfig[] = [
  { name: 'Platinum', minSpend: 500000, color: 'bg-stitch-tertiary/10 border-stitch-tertiary/30', textColor: 'text-stitch-tertiary', icon: Crown, emoji: '💎' },
  { name: 'Gold',     minSpend: 200000, color: 'bg-yellow-500/10 border-yellow-500/30',           textColor: 'text-yellow-400',      icon: Gem,   emoji: '🥇' },
  { name: 'Silver',   minSpend: 50000,  color: 'bg-gray-400/10 border-gray-400/30',               textColor: 'text-gray-300',        icon: Award, emoji: '🥈' },
  { name: 'Bronze',   minSpend: 0,      color: 'bg-amber-700/10 border-amber-700/30',             textColor: 'text-amber-600',       icon: Star,  emoji: '🥉' },
];

function getTier(totalSpend: number): TierConfig {
  return TIERS.find((t) => totalSpend >= t.minSpend) ?? TIERS[TIERS.length - 1];
}

function getNextTier(totalSpend: number): TierConfig | null {
  const idx = TIERS.findIndex((t) => totalSpend >= t.minSpend);
  return idx > 0 ? TIERS[idx - 1] : null;
}

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<LoyaltyCustomer[]>('/sales/customers')
      .then((r) => setCustomers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.stagger-item');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, [loading]);

  const withSpend = customers
    .map((c) => ({
      ...c,
      totalSpend: (c.sales ?? []).reduce((s, sale) => s + Number(sale.totalAmount), 0),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .map((c) => ({ ...c, tier: getTier(c.totalSpend) }));

  const totalSpendAll = withSpend.reduce((s, c) => s + c.totalSpend, 0);

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="stagger-item flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
          <Star size={20} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stitch-on-surface font-space">Loyalty Rewards</h1>
          <p className="text-xs text-stitch-on-surface-variant">Customer tier management and rewards tracking</p>
        </div>
      </div>

      <div className="stagger-item glass-card rounded-xl p-4 flex items-start gap-3"
        style={{ borderLeft: '3px solid rgba(192,193,255,0.5)' }}>
        <div className="w-8 h-8 rounded-lg bg-stitch-primary/10 flex items-center justify-center text-sm shrink-0">🤖</div>
        <div>
          <p className="text-sm font-semibold text-stitch-on-surface">AI Loyalty Insight</p>
          <p className="text-xs text-stitch-on-surface-variant mt-0.5">
            Top 20% of customers account for 80% of revenue. Consider targeted promotions for Silver customers to upgrade them to Gold tier.
          </p>
        </div>
      </div>

      <div className="stagger-item grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: String(customers.length), Icon: Users, color: 'text-stitch-primary', bg: 'bg-stitch-primary/10' },
          { label: 'Platinum Members', value: String(withSpend.filter((c) => c.tier.name === 'Platinum').length), Icon: Crown, color: 'text-stitch-tertiary', bg: 'bg-stitch-tertiary/10' },
          { label: 'Gold Members', value: String(withSpend.filter((c) => c.tier.name === 'Gold').length), Icon: Gem, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Total Revenue', value: formatPKR(totalSpendAll), Icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="glass-card rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-bold font-space mt-1 ${color} truncate`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="stagger-item grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => (
          <div key={tier.name} className={`glass-card rounded-xl p-4 border ${tier.color}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{tier.emoji}</span>
              <span className={`text-xs font-bold ${tier.textColor}`}>
                {withSpend.filter((c) => c.tier.name === tier.name).length} members
              </span>
            </div>
            <p className={`text-base font-bold font-space ${tier.textColor}`}>{tier.name}</p>
            <p className="text-[10px] text-stitch-on-surface-variant mt-1">Min: {formatPKR(tier.minSpend)}</p>
          </div>
        ))}
      </div>

      <div className="stagger-item glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stitch-on-surface font-space">Customer Leaderboard</h2>
          {loading && <span className="w-4 h-4 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />}
        </div>
        {withSpend.length === 0 && !loading ? (
          <div className="py-12 text-center">
            <Star size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/40" />
            <p className="text-sm text-stitch-on-surface-variant">No customers yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                  {['#', 'Customer', 'Phone', 'Total Spend', 'Tier', 'To Next Tier', 'Member Since'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {withSpend.map((c, i) => {
                  const next = getNextTier(c.totalSpend);
                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-stitch-primary/20 flex items-center justify-center text-xs font-bold text-stitch-primary shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-stitch-on-surface">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-stitch-on-surface-variant">{c.phone}</td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-stitch-on-surface">{formatPKR(c.totalSpend)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${c.tier.color} ${c.tier.textColor}`}>
                          {c.tier.emoji} {c.tier.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-stitch-on-surface-variant whitespace-nowrap">
                        {next ? (
                          <span>
                            {next.emoji} {next.name}<br />
                            <span className="font-mono">{formatPKR(next.minSpend - c.totalSpend)} more</span>
                          </span>
                        ) : (
                          <span className="text-stitch-tertiary font-bold">Max tier 🏆</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-stitch-on-surface-variant whitespace-nowrap">
                        {format(new Date(c.createdAt), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
