import { useState } from 'react';
import { AlertTriangle, Key, ArrowRight } from 'lucide-react';
import { useDesktopLicenseStore } from '../../store/desktopLicense.store';

const inputCls = 'w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-[13px] text-white placeholder-white/30 outline-none focus:bg-white/[0.06] focus:border-stitch-primary/50 focus:ring-1 focus:ring-stitch-primary/30 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] backdrop-blur-md';
const labelCls = 'block text-[11px] font-bold text-white/60 mb-1.5 ml-1 uppercase tracking-wider';

export default function ActivationScreen() {
  const { activate, activating, activationError } = useDesktopLicenseStore();
  const [licenseKey, setLicenseKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    try {
      await activate(licenseKey);
    } catch {
      // activationError is already set by the store; nothing else to do.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080d] relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(65,105,225,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-[440px] px-6 relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl mb-5">
            <Key size={40} className="text-stitch-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Activate This Device</h1>
          <p className="text-[12px] text-white/50 mt-2 font-semibold tracking-[0.15em] uppercase text-center">
            Enter your shop's desktop license key to continue
          </p>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] p-8 sm:p-10 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stitch-primary/50 to-transparent" />

          {activationError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-200 leading-relaxed">{activationError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelCls}>License Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-stitch-primary transition-colors">
                  <Key size={16} strokeWidth={2.5} />
                </div>
                <input
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  autoComplete="off"
                  autoFocus
                  placeholder="TB-DSK-XXXX-XXXX-XXXX"
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </div>
              <p className="text-[11px] text-white/40 mt-1.5 ml-1">
                Ask your platform admin for this shop's license key if you don't have it.
              </p>
            </div>

            <button type="submit" disabled={activating || !licenseKey.trim()}
              className="w-full relative group overflow-hidden bg-white text-black font-bold rounded-xl py-4 text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]">
              {activating ? (
                <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Activating...</>
              ) : (
                <>Activate <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
