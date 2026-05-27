import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { api } from '../../api/client';
import type { SalesSummary } from '../../types';

interface DayData {
  date: string;
  revenue: number;
  sales: number;
}

export default function SalesChart() {
  const [data, setData] = useState<DayData[]>([]);

  useEffect(() => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
    );

    Promise.allSettled(
      days.map((d) => api.get<SalesSummary>(`/reports/sales-summary?date=${d}`)),
    ).then((results) => {
      setData(
        results.map((r, i) => ({
          date: format(new Date(days[i]), 'MMM d'),
          revenue: r.status === 'fulfilled' ? r.value.data.totalRevenue : 0,
          sales: r.status === 'fulfilled' ? r.value.data.totalSales : 0,
        })),
      );
    });
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm font-medium text-gray-900 mb-4">Revenue — Last 7 Days</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(v: number) => [`Rs ${v.toLocaleString()}`, 'Revenue']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
