import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Download, ClipboardList } from 'lucide-react';
import { api } from '../../api/client';
import type { AuditLog } from '../../types';
import gsap from 'gsap';

interface AuditMeta {
  total: number;
  page: number;
  limit: number;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditMeta>({ total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = (p = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (actionFilter) params.set('action', actionFilter);
    api.get<{ data: AuditLog[]; meta: AuditMeta }>(`/audit-logs?${params.toString()}`)
      .then((r) => {
        setLogs(r.data.data ?? []);
        setMeta(r.data.meta ?? { total: 0, page: p, limit: 50 });
      })
      .catch(() => setError('Failed to load audit log'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); setPage(1); }, [actionFilter]);

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
  }, []);

  const changePage = (next: number) => {
    setPage(next);
    load(next);
  };

  const exportCsv = () => {
    const params = new URLSearchParams({ limit: '10000' });
    if (actionFilter) params.set('action', actionFilter);
    api.get<{ data: AuditLog[] }>(`/audit-logs?${params.toString()}`).then((r) => {
      const rows = r.data.data ?? [];
      const header = 'Timestamp,Action,Entity Type,Entity ID,User,IP Address\n';
      const body = rows.map((l) =>
        [
          format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          l.action,
          l.entityType ?? '',
          l.entityId ?? '',
          l.user ? `${l.user.name} <${l.user.email}>` : '',
          l.ipAddress ?? '',
        ].map((v) => `"${v}"`).join(',')
      ).join('\n');
      const blob = new Blob([header + body], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Audit Log</h1>
            <p className="text-xs text-stitch-on-surface-variant">Immutable trail of all system actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Filter by action…"
            className="bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors w-44 placeholder:text-stitch-on-surface-variant/50"
          />
          <button onClick={() => load(page)}
            className="flex items-center gap-1.5 text-sm text-stitch-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-stitch-on-surface-variant border border-white/10 text-sm font-bold rounded-lg hover:bg-white/10 hover:text-white transition-colors">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card rounded-xl p-3 border-l-4 border-stitch-error/50">
          <p className="text-sm text-stitch-error">{error}</p>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                {['Timestamp', 'Action', 'Entity', 'User', 'IP'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <span className="inline-block w-6 h-6 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <ClipboardList size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
                    <p className="text-sm text-stitch-on-surface-variant">No audit entries found</p>
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-xs text-stitch-on-surface-variant tabular-nums whitespace-nowrap font-mono">
                      {format(new Date(l.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-stitch-primary/10 text-stitch-primary px-1.5 py-0.5 rounded border border-stitch-primary/20">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stitch-on-surface-variant">
                      {l.entityType ? (
                        <span>
                          <span className="font-semibold text-stitch-on-surface">{l.entityType}</span>
                          {l.entityId && (
                            <span className="text-stitch-tertiary font-mono ml-1 text-[10px]">#{l.entityId.slice(-8)}</span>
                          )}
                        </span>
                      ) : <span className="text-stitch-on-surface-variant/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {l.user ? (
                        <div>
                          <p className="text-xs font-semibold text-stitch-on-surface">{l.user.name}</p>
                          <p className="text-[10px] text-stitch-on-surface-variant">{l.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-stitch-on-surface-variant/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-stitch-on-surface-variant">
                      {l.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-stitch-on-surface-variant">
          <span>
            Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total} entries
          </span>
          <div className="flex gap-1">
            <button onClick={() => changePage(page - 1)} disabled={page === 1}
              className="px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors text-xs font-bold">
              Previous
            </button>
            <button onClick={() => changePage(page + 1)} disabled={page >= totalPages}
              className="px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors text-xs font-bold">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
