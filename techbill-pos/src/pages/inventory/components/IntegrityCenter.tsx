import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Play,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Activity,
  History,
  AlertOctagon,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { api } from '../../../api/client';
import { useToastStore } from '../../../store/toast.store';

interface ScanSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  safeRepairs: number;
}

interface ScanResult {
  id: string;
  healthScore: number;
  scanDurationMs: number;
  scannedAt: string;
  overallHealth: {
    inventory: number;
    sales: number;
    purchasing: number;
    returns: number;
    reports: number;
    database: number;
  };
  needsScan: boolean;
  summary: ScanSummary;
  checks: any[];
}

interface HistoryScan {
  id: string;
  healthScore: number;
  createdAt: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  durationMs: number;
}

export default function IntegrityCenter() {
  const toast = useToastStore();
  const [scanning, setScanning] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryScan[]>([]);
  const [needsScan, setNeedsScan] = useState(true);
  const [activeTab, setActiveTab] = useState<'checks' | 'history'>('checks');
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [repairingId, setRepairingId] = useState<string | null>(null);

  // Dry run preview modal state
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [confirmingIssueId, setConfirmingIssueId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await api.get<{ scans: HistoryScan[]; needsScan: boolean }>('/integrity/history');
      setHistory(res.data.scans);
      setNeedsScan(res.data.needsScan);
    } catch {
      // Ignore background load error
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const runScan = async (type: 'quick' | 'deep') => {
    setScanning(true);
    const steps = [
      'Checking Inventory Serial Numbers...',
      'Verifying Active Stock Counts...',
      'Validating Invoice Integrity...',
      'Checking Return States...',
      'Reconciling Cost & Retail Values...',
      'Auditing Purchase Order Records...',
      'Verifying Dashboard Synchronizations...',
      'Performing Database Health Analysis...',
    ];

    // Simulated progress steps for better user feedback
    for (let i = 0; i < steps.length; i++) {
      setProgressStep(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    try {
      const res = await api.get<ScanResult>(`/integrity/scan?type=${type}`);
      setScanResult(res.data);
      setNeedsScan(false);
      toast.success(`${type === 'quick' ? 'Quick' : 'Deep'} Scan completed successfully!`);
      void fetchHistory();
    } catch {
      toast.error('Integrity Scan failed. Please check backend logs.');
    } finally {
      setScanning(false);
      setProgressStep(null);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/integrity/recalculate');
      toast.success('Inventory counts and caches recalculated successfully!');
      if (scanResult) {
        // Automatically re-run quick scan to update dashboard
        void runScan('quick');
      }
    } catch {
      toast.error('Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  const startRepair = async (issueId: string, _type: string) => {
    setRepairingId(issueId);
    try {
      // First call endpoint with dryRun: true to preview changes
      const res = await api.post(`/integrity/repair/${issueId}`, { dryRun: true });
      setPreviewData(res.data.preview);
      setConfirmingIssueId(issueId);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to calculate repair preview.');
      setRepairingId(null);
    }
  };

  const commitRepair = async () => {
    if (!confirmingIssueId) return;
    try {
      const res = await api.post(`/integrity/repair/${confirmingIssueId}`, { dryRun: false });
      if (res.data.success) {
        toast.success(`Issue resolved! Stock adjusted from ${res.data.preview.stockBefore} to ${res.data.preview.stockAfter}.`);
        setPreviewData(null);
        setConfirmingIssueId(null);
        // Refresh scan result
        if (scanResult) {
          const updatedChecks = scanResult.checks.map((c) => {
            if (c.name.toLowerCase().replace(/\s+/g, '_') === scanResult.checks.find(k => k.records?.some((x: any) => x.id === confirmingIssueId))?.name.toLowerCase().replace(/\s+/g, '_')) {
              return { ...c, status: 'Healthy', count: 0, records: [] };
            }
            return c;
          });
          setScanResult({ ...scanResult, checks: updatedChecks });
        }
        void fetchHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Repair commit failed.');
    } finally {
      setRepairingId(null);
    }
  };

  const exportReport = (format: 'csv' | 'json') => {
    if (!scanResult) return;
    window.open(`${api.defaults.baseURL}/integrity/export?scanId=${scanResult.id}&format=${format}`);
  };

  const getHealthColor = (score: number) => {
    if (score >= 95) return 'text-green-400 border-green-500/30 bg-green-500/5';
    if (score >= 80) return 'text-blue-400 border-blue-500/30 bg-blue-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    if (score >= 40) return 'text-orange-400 border-orange-500/30 bg-orange-500/5';
    return 'text-red-400 border-red-500/30 bg-red-500/5';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 95) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs Attention';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

  return (
    <div className="space-y-6">
      {/* Hero Health Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`glass-card rounded-xl p-5 border flex flex-col items-center justify-center text-center ${scanResult ? getHealthColor(scanResult.healthScore) : 'text-stitch-on-surface-variant border-white/5 bg-white/[0.01]'}`}>
          <div className="relative w-32 h-32 flex items-center justify-center mb-3">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="opacity-10"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="351.8"
                strokeDashoffset={351.8 - (351.8 * (scanResult?.healthScore ?? 100)) / 100}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="text-center">
              <span className="text-3xl font-extrabold font-space tabular-nums">{scanResult?.healthScore ?? '--'}%</span>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 mt-0.5">Health Score</p>
            </div>
          </div>
          <h2 className="text-lg font-bold font-space">{scanResult ? getHealthLabel(scanResult.healthScore) : 'Ready to Scan'}</h2>
          <p className="text-xs opacity-75 mt-1">
            {needsScan ? 'Inconsistencies may exist. Run scan to verify.' : 'All system databases synchronized.'}
          </p>
        </div>

        {/* Sub-Health Status Cards */}
        <div className="glass-card rounded-xl p-5 border border-white/5 bg-white/[0.01] lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stitch-on-surface font-space">Overall System Health</h3>
              <p className="text-[10px] text-stitch-on-surface-variant mt-0.5">Sub-health scores calculated from transactional logs</p>
            </div>
            {needsScan && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <AlertTriangle size={10} /> Needs Scan
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(
              scanResult?.overallHealth ?? {
                inventory: 100,
                sales: 100,
                purchasing: 100,
                returns: 100,
                reports: 100,
                database: 100,
              },
            ).map(([module, val]) => (
              <div key={module} className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
                  <span>{module}</span>
                  <span className={val >= 95 ? 'text-green-400' : val >= 80 ? 'text-blue-400' : 'text-amber-400'}>{val}%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${val >= 95 ? 'bg-green-400' : val >= 80 ? 'bg-blue-400' : 'bg-amber-400'}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={handleRecalculate}
              disabled={recalculating || scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-stitch-on-surface-variant text-xs font-bold rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={12} className={recalculating ? 'animate-spin' : ''} />
              Recalculate Caches
            </button>
            <button
              onClick={() => void runScan('quick')}
              disabled={scanning || recalculating}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-stitch-primary text-stitch-on-primary text-xs font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <Play size={12} />
              Run Quick Scan
            </button>
            <button
              onClick={() => void runScan('deep')}
              disabled={scanning || recalculating}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-stitch-tertiary/20 text-stitch-tertiary text-xs font-bold rounded-lg border border-stitch-tertiary/30 hover:bg-stitch-tertiary/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Activity size={12} />
              Run Deep Scan
            </button>
          </div>
        </div>
      </div>

      {/* Progress Stepper Overlay */}
      {scanning && (
        <div className="glass-card rounded-xl p-5 border border-stitch-primary/20 bg-stitch-primary/5 flex flex-col items-center justify-center space-y-3 py-8">
          <span className="w-8 h-8 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white font-space animate-pulse">{progressStep}</p>
            <p className="text-[10px] text-stitch-on-surface-variant">Performing read-only database validations...</p>
          </div>
        </div>
      )}

      {/* Main Tabs switcher */}
      <div className="flex border-b border-white/5 px-2 gap-1">
        <button
          onClick={() => setActiveTab('checks')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'checks'
              ? 'border-stitch-primary text-stitch-primary font-space'
              : 'border-transparent text-stitch-on-surface-variant hover:text-white'
          }`}
        >
          <Activity size={12} /> Diagnostics Log
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-stitch-primary text-stitch-primary font-space'
              : 'border-transparent text-stitch-on-surface-variant hover:text-white'
          }`}
        >
          <History size={12} /> Scan History
        </button>
      </div>

      {activeTab === 'checks' && (
        <div className="space-y-4">
          {scanResult && (
            <div className="flex justify-between items-center text-xs text-stitch-on-surface-variant bg-white/[0.01] p-2 px-3 rounded-lg border border-white/5">
              <span>Scanned: {new Date(scanResult.scannedAt).toLocaleString()} ({scanResult.scanDurationMs}ms)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => exportReport('json')}
                  className="flex items-center gap-1 text-[10px] font-bold hover:text-white transition-colors"
                >
                  <Download size={10} /> Export JSON
                </button>
                <span className="text-white/10">|</span>
                <button
                  onClick={() => exportReport('csv')}
                  className="flex items-center gap-1 text-[10px] font-bold hover:text-white transition-colors"
                >
                  <FileSpreadsheet size={10} /> Export CSV
                </button>
              </div>
            </div>
          )}

          {!scanResult ? (
            <div className="glass-card rounded-xl p-16 border border-white/5 bg-white/[0.01] text-center">
              <ShieldAlert size={36} className="mx-auto mb-3 text-stitch-on-surface-variant/40" />
              <h3 className="text-sm font-semibold text-stitch-on-surface font-space">No Scan Performed</h3>
              <p className="text-xs text-stitch-on-surface-variant mt-1 max-w-xs mx-auto">
                Run an integrity scan to check database synchronization, pricing errors, orphans, or duplicate serial numbers.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {scanResult.checks.map((check) => {
                const key = check.name.toLowerCase().replace(/\s+/g, '_');
                const isExpanded = expandedCheck === key;

                return (
                  <div
                    key={check.name}
                    className={`glass-card rounded-xl border transition-all ${
                      check.status === 'Healthy'
                        ? 'border-white/5 bg-white/[0.01] hover:bg-white/[0.02]'
                        : check.severity === 'Critical'
                        ? 'border-red-500/20 bg-red-500/[0.02]'
                        : 'border-amber-500/20 bg-amber-500/[0.02]'
                    }`}
                  >
                    {/* Accordion header */}
                    <button
                      onClick={() => setExpandedCheck(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        {check.status === 'Healthy' ? (
                          <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                        ) : check.severity === 'Critical' ? (
                          <AlertOctagon size={16} className="text-red-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stitch-on-surface font-space">{check.name}</span>
                            {check.confidence && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Confidence {check.confidence}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stitch-on-surface-variant mt-0.5">{check.message}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {check.count > 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            check.severity === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {check.count} issue(s)
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={14} className="text-stitch-on-surface-variant" /> : <ChevronDown size={14} className="text-stitch-on-surface-variant" />}
                      </div>
                    </button>

                    {/* Accordion content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                        <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                          <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Recommended Resolution</p>
                          <p className="text-xs text-stitch-on-surface mt-1">{check.recommendedAction}</p>
                        </div>

                        {check.records && check.records.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Affected Records</p>
                            <div className="overflow-x-auto border border-white/5 rounded-lg bg-white/[0.01]">
                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="bg-white/5 text-stitch-on-surface-variant uppercase text-[9px] font-bold tracking-wider">
                                    <th className="p-2 px-3">Reference / ID</th>
                                    <th className="p-2">Info</th>
                                    <th className="p-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-stitch-on-surface-variant">
                                  {check.records.map((r: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                      <td className="p-2 px-3 text-stitch-tertiary">{r.id || r.serialNumber || r.invoice_number || '—'}</td>
                                      <td className="p-2 text-white font-semibold">
                                        {r.productName || r.name || r.serialNumber || (r.purchasePrice && `Cost: ${formatPKR(Number(r.purchasePrice))}`) || '—'}
                                      </td>
                                      <td className="p-2">
                                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px]">
                                          {r.status || r.condition || 'detected'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {check.count > 0 && (
                          <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
                            {check.repairable ? (
                              <button
                                onClick={() => void startRepair(check.records[0]?.id || check.id, check.name)}
                                disabled={repairingId === (check.records[0]?.id || check.id)}
                                className={`flex items-center gap-1 px-3 py-1 bg-stitch-primary text-stitch-on-primary text-xs font-bold rounded hover:bg-stitch-primary/95 transition-all`}
                              >
                                {repairingId === (check.records[0]?.id || check.id) ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <Play size={11} />
                                )}
                                {check.requiresConfirmation ? 'Confirm & Repair' : 'Safe Repair'}
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-stitch-on-surface-variant">
                                <Lock size={10} /> Requires Manual Review
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="overflow-x-auto border border-white/5 rounded-xl bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-white/5 text-stitch-on-surface-variant font-bold uppercase text-[10px] border-b border-white/5">
                <th className="p-3 px-4">Date</th>
                <th className="p-3">Health Score</th>
                <th className="p-3">Issues Found</th>
                <th className="p-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stitch-on-surface-variant">
                    No scan history available.
                  </td>
                </tr>
              ) : (
                history.map((scan) => (
                  <tr key={scan.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 px-4 text-stitch-on-surface font-semibold">
                      {new Date(scan.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        scan.healthScore >= 95 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {scan.healthScore}%
                      </span>
                    </td>
                    <td className="p-3 space-x-1.5">
                      {scan.criticalCount > 0 && (
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold">
                          {scan.criticalCount} Critical
                        </span>
                      )}
                      {scan.highCount + scan.mediumCount + scan.lowCount > 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                          {scan.highCount + scan.mediumCount + scan.lowCount} Warnings
                        </span>
                      )}
                      {scan.criticalCount === 0 && scan.highCount + scan.mediumCount + scan.lowCount === 0 && (
                        <span className="text-[10px] text-green-400">0 issues</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-stitch-on-surface-variant">
                      {scan.durationMs}ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Repair Dry Run Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-xl p-6 w-full max-w-md border border-white/10 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center shrink-0 text-stitch-primary">
                <Play size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white font-space">Repair Action Preview</h3>
                <p className="text-xs text-stitch-on-surface-variant mt-0.5">Dry-run preview before executing database transactions</p>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/5 space-y-3 text-xs text-stitch-on-surface-variant font-mono">
              <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-2">
                <div>
                  <span className="text-[10px] text-stitch-on-surface-variant/60 block">AFFECTED UNITS</span>
                  <span className="text-sm font-bold text-white">{previewData.affectedUnits}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stitch-on-surface-variant/60 block">AUDIT LOGS TO CREATE</span>
                  <span className="text-sm font-bold text-white">{previewData.auditLogsCreated}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-2">
                <div>
                  <span className="text-[10px] text-stitch-on-surface-variant/60 block">STOCK COUNT BEFORE</span>
                  <span className="text-sm font-bold text-white">{previewData.stockBefore}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stitch-on-surface-variant/60 block">STOCK COUNT AFTER</span>
                  <span className="text-sm font-bold text-white">{previewData.stockAfter}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-stitch-on-surface-variant/60 block mb-1">PLANNED DATABASE MUTATIONS</span>
                <ul className="list-disc list-inside space-y-1 text-[10px] text-stitch-tertiary">
                  {previewData.changes.map((c: string, idx: number) => (
                    <li key={idx} className="truncate">{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setPreviewData(null); setConfirmingIssueId(null); setRepairingId(null); }}
                className="flex-1 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={commitRepair}
                className="flex-1 py-2 text-sm bg-stitch-primary text-stitch-on-primary font-bold rounded-lg hover:bg-stitch-primary/95 transition-all"
              >
                Execute Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
