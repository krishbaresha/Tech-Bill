import React, { useEffect, useState } from 'react';
import { Download, Upload, ShieldCheck, AlertTriangle, RefreshCw, X, FileText, CheckCircle2, Trash2, Clock, Cloud, HardDrive, Mail, Save } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface RestoreSummary {
  exportedAt: string;
  tenantName: string;
  productsCount: number;
  inventoryUnitsCount: number;
  salesCount: number;
  totalSalesAmount: number;
  customersCount: number;
  creditRecordsCount: number;
  expensesCount: number;
}

interface RestorePointModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RestorePointModal: React.FC<RestorePointModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId || 'default';

  const [downloading, setDownloading] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<RestoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email Recipient State
  const [emailRecipient, setEmailRecipient] = useState<string>(() => {
    return localStorage.getItem(`tb_backup_email_${tenantId}`) || user?.email || '';
  });

  // Auto Backup Schedule & Retention State
  const [backupFrequency, setBackupFrequency] = useState<string>(() => {
    return localStorage.getItem(`tb_backup_freq_${tenantId}`) || 'DAILY';
  });
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(() => {
    return localStorage.getItem(`tb_last_backup_${tenantId}`);
  });

  useEffect(() => {
    if (!isOpen) return;
    const freq = localStorage.getItem(`tb_backup_freq_${tenantId}`) || 'DAILY';
    const last = localStorage.getItem(`tb_last_backup_${tenantId}`);
    const savedLocalEmail = localStorage.getItem(`tb_backup_email_${tenantId}`) || user?.email || '';
    setBackupFrequency(freq);
    setLastAutoBackup(last);
    setEmailRecipient(savedLocalEmail);

    // Fetch latest saved email from backend settings
    api.get('/settings').then((res) => {
      if (res.data?.autoBackupEmail) {
        setEmailRecipient(res.data.autoBackupEmail);
        localStorage.setItem(`tb_backup_email_${tenantId}`, res.data.autoBackupEmail);
      }
    }).catch(() => {});
  }, [isOpen, tenantId, user?.email]);

  const handleSaveSchedule = (freq: string) => {
    setBackupFrequency(freq);
    localStorage.setItem(`tb_backup_freq_${tenantId}`, freq);
    setSuccess(`Auto-backup schedule updated to ${freq === 'OFF' ? 'Disabled' : freq}`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSaveEmailRecipient = async () => {
    if (!emailRecipient || !emailRecipient.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    setSavingEmail(true);
    setError(null);
    setSuccess(null);
    try {
      localStorage.setItem(`tb_backup_email_${tenantId}`, emailRecipient);
      await api.patch('/settings', { autoBackupEmail: emailRecipient });
      setSuccess(`✅ Backup email saved successfully: ${emailRecipient}. Automated backups will be delivered to this address.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      localStorage.setItem(`tb_backup_email_${tenantId}`, emailRecipient);
      setSuccess(`✅ Backup email saved locally: ${emailRecipient}`);
      setTimeout(() => setSuccess(null), 4000);
    } finally {
      setSavingEmail(false);
    }
  };

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await api.get('/restore-point/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'techbill_store_restore_point.techbill';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const nowStr = new Date().toISOString();
      setLastAutoBackup(nowStr);
      localStorage.setItem(`tb_last_backup_${tenantId}`, nowStr);

      setSuccess('Restore Point (.techbill) downloaded & saved to local vault!');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to download restore point file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmailBackup = async () => {
    if (!emailRecipient || !emailRecipient.includes('@')) {
      setError('Please provide a valid email address for backup delivery.');
      return;
    }

    setSendingEmail(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post('/restore-point/email', { email: emailRecipient });
      setSuccess(res.data.message || `🎉 Backup snapshot emailed successfully to ${emailRecipient}!`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send backup email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.techbill')) {
      setError('Please select a valid .techbill restore file.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setInspecting(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/restore-point/inspect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummary(res.data.summary);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to inspect .techbill file. File may be corrupted.');
      setSelectedFile(null);
      setSummary(null);
    } finally {
      setInspecting(false);
    }
  };

  const handleApplyRestore = async () => {
    if (!selectedFile) return;

    setApplying(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await api.post('/restore-point/apply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('🎉 Store dataset restored successfully! Reloading application...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to apply restore point.');
    } finally {
      setApplying(false);
    }
  };

  const handleResetTenantData = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      setError('Please type RESET to confirm store data wipe.');
      return;
    }

    setResetting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/restore-point/reset');
      setSuccess('🧹 Store operational data wiped cleanly! You can now test uploading your .techbill file.');
      setShowResetConfirm(false);
      setResetConfirmInput('');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset store data.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-stitch-surface-container border border-stitch-primary/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 text-stitch-on-surface max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-stitch-primary/10 border border-stitch-primary/30 text-stitch-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-space text-white">Store Restore Point System</h2>
              <p className="text-xs text-stitch-on-surface-variant">Instant Download, Triple Vault (Local, Cloud & Email) & Disaster Recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-stitch-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Auto Backup Schedule & Triple-Vault (Local + Cloud + Email) */}
        <div className="p-4 bg-stitch-primary/5 border border-stitch-primary/20 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stitch-primary text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Automated Schedule & Triple Vault</span>
            </div>
            <span className="text-[10px] bg-stitch-primary/20 text-stitch-primary px-2.5 py-0.5 rounded-full font-mono font-semibold">
              {backupFrequency === 'OFF' ? 'Disabled' : `Active (${backupFrequency})`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-stitch-on-surface-variant uppercase mb-1">
                Auto-Backup Frequency
              </label>
              <select
                value={backupFrequency}
                onChange={(e) => handleSaveSchedule(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-stitch-primary/50"
              >
                <option value="OFF">Disabled (Manual Only)</option>
                <option value="DAILY">Every 24 Hours (Daily)</option>
                <option value="WEEKLY">Every 7 Days (Weekly)</option>
                <option value="MONTHLY">Every 30 Days (Monthly)</option>
              </select>
            </div>

            <div className="space-y-1 text-[11px] justify-center flex flex-col">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>1. Local Offline PWA Storage</span>
              </div>
              <div className="flex items-center gap-1.5 text-stitch-primary">
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span>2. Cloudflare R2 Cloud Vault</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>3. Email Inbox Delivery</span>
              </div>
            </div>
          </div>

          {/* Email Recipient Input & Actions */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <label className="block text-[10px] font-bold text-sky-300 uppercase tracking-wider">
              Auto-Backup Email Recipient:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="owner@yourdomain.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="flex-1 bg-black/40 border border-sky-500/30 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEmailRecipient}
                  disabled={savingEmail}
                  className="py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  {savingEmail ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Email</span>
                </button>
                <button
                  onClick={handleSendEmailBackup}
                  disabled={sendingEmail}
                  className="py-1.5 px-3 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold text-xs rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  {sendingEmail ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span>Email Now</span>
                </button>
              </div>
            </div>
          </div>

          {lastAutoBackup && (
            <div className="text-[10px] text-stitch-on-surface-variant/80 font-mono flex items-center justify-between border-t border-white/5 pt-2">
              <span>Last Snapshot: {new Date(lastAutoBackup).toLocaleString()}</span>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="text-stitch-primary hover:underline font-bold text-[11px]"
              >
                Run Backup Now
              </button>
            </div>
          )}
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Download Snapshot */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between space-y-4 border border-white/10 hover:border-stitch-primary/40 transition-all">
            <div>
              <div className="flex items-center gap-2 text-stitch-primary text-sm font-semibold mb-1">
                <Download className="w-4 h-4" />
                <span>Create Restore Point</span>
              </div>
              <p className="text-xs text-stitch-on-surface-variant leading-relaxed">
                Download an encrypted <code className="text-stitch-primary font-mono">.techbill</code> file containing A to Z store data up to this minute.
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-2.5 px-4 bg-stitch-primary text-stitch-on-primary font-semibold text-xs rounded-lg hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Snapshot...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download .techbill File</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Restore File Upload */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between space-y-4 border border-white/10 hover:border-amber-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1">
                <Upload className="w-4 h-4" />
                <span>Restore from File</span>
              </div>
              <p className="text-xs text-stitch-on-surface-variant leading-relaxed">
                Select a previously saved <code className="text-amber-400 font-mono">.techbill</code> restore file to recover your store.
              </p>
            </div>

            <label className="w-full py-2.5 px-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-semibold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all">
              <FileText className="w-4 h-4" />
              <span>{selectedFile ? selectedFile.name : 'Choose .techbill File'}</span>
              <input type="file" accept=".techbill" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>

        {/* Card 3: Reset Store Data (Tenant-Only Wipe) */}
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Trash2 className="w-4 h-4" />
              <span>Reset My Store Operational Data (Test Wipe)</span>
            </div>
            <button
              onClick={() => setShowResetConfirm(!showResetConfirm)}
              className="py-1 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-semibold rounded-md transition-all"
            >
              {showResetConfirm ? 'Cancel' : 'Clean Wipe Store'}
            </button>
          </div>

          <p className="text-[11px] text-stitch-on-surface-variant leading-relaxed">
            Wipes products, sales, inventory, and customers <strong>only for your shop tenant</strong> (does not affect other shops or platform admin).
          </p>

          {showResetConfirm && (
            <div className="p-3 bg-black/40 border border-red-500/30 rounded-lg space-y-2 animate-fade-in">
              <label className="block text-[10px] font-bold text-red-300 uppercase tracking-wider">
                Type RESET to confirm wiping your shop's data:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="RESET"
                  value={resetConfirmInput}
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  className="flex-1 bg-black/50 border border-red-500/30 rounded px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-red-400"
                />
                <button
                  onClick={handleResetTenantData}
                  disabled={resetting || resetConfirmInput.trim().toUpperCase() !== 'RESET'}
                  className="py-1.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5"
                >
                  {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Wipe Store Data</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inspection Result Preview */}
        {inspecting && (
          <div className="p-4 bg-stitch-surface-container-high/50 border border-white/10 rounded-xl flex items-center justify-center gap-3 text-xs text-stitch-on-surface-variant">
            <RefreshCw className="w-4 h-4 animate-spin text-stitch-primary" />
            <span>Verifying SHA-256 signature and decompressing snapshot...</span>
          </div>
        )}

        {summary && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Restore Point Summary</span>
              <span className="text-[10px] text-stitch-on-surface-variant font-mono">
                Captured: {new Date(summary.exportedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-black/30 rounded-lg">
                <div className="text-white font-bold text-sm">{summary.salesCount}</div>
                <div className="text-[10px] text-stitch-on-surface-variant">Invoices</div>
              </div>
              <div className="p-2 bg-black/30 rounded-lg">
                <div className="text-white font-bold text-sm">{summary.inventoryUnitsCount}</div>
                <div className="text-[10px] text-stitch-on-surface-variant">Units</div>
              </div>
              <div className="p-2 bg-black/30 rounded-lg">
                <div className="text-white font-bold text-sm">{summary.customersCount}</div>
                <div className="text-[10px] text-stitch-on-surface-variant">Customers</div>
              </div>
            </div>

            <div className="text-[11px] text-amber-200/80 leading-relaxed">
              ⚠️ <strong>Warning</strong>: Applying this restore point will replace current store data with this exact snapshot. Physical sales made after this snapshot date should be verified.
            </div>

            <button
              onClick={handleApplyRestore}
              disabled={applying}
              className="w-full py-3 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {applying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Applying Restore Point Transaction...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Confirm & Restore Store Data Now</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
