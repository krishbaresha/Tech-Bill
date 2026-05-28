import { useEffect, useRef, useState } from 'react';
import { Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import type { ShopSettings } from '../../types';
import gsap from 'gsap';

interface SettingsForm {
  shopName: string;
  lowStockThreshold: string;
  deadStockDays: string;
  maxDiscountWithoutOtp: string;
  returnFraudWindowDays: string;
  returnFraudCountThreshold: string;
}

const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/50';
const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
}

function FieldGroup({ title, children }: FieldGroupProps) {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-stitch-on-surface font-space">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, accessToken, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState<SettingsForm>({
    shopName: '',
    lowStockThreshold: '3',
    deadStockDays: '60',
    maxDiscountWithoutOtp: '500',
    returnFraudWindowDays: '30',
    returnFraudCountThreshold: '3',
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api.get<ShopSettings>('/settings')
      .then((r) => {
        const s = r.data;
        setForm({
          shopName: s.shopName,
          lowStockThreshold: String(s.lowStockThreshold),
          deadStockDays: String(s.deadStockDays),
          maxDiscountWithoutOtp: String(s.maxDiscountWithoutOtp),
          returnFraudWindowDays: String(s.returnFraudWindowDays),
          returnFraudCountThreshold: String(s.returnFraudCountThreshold),
        });
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.glass-card');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, [loading]);

  const set = (key: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch('/settings', {
        shopName: form.shopName || undefined,
        lowStockThreshold: parseInt(form.lowStockThreshold),
        deadStockDays: parseInt(form.deadStockDays),
        maxDiscountWithoutOtp: parseFloat(form.maxDiscountWithoutOtp),
        returnFraudWindowDays: parseInt(form.returnFraudWindowDays),
        returnFraudCountThreshold: parseInt(form.returnFraudCountThreshold),
      });
      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (form.shopName && user && accessToken) {
        setAuth({ ...user, tenantName: form.shopName }, accessToken);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-stitch-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stitch-on-surface font-space">Shop Settings</h1>
          <p className="text-xs text-stitch-on-surface-variant">Configure thresholds and controls</p>
        </div>
      </div>

      {error && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-2 border-l-4 border-stitch-error/50">
          <AlertTriangle size={14} className="text-stitch-error shrink-0" />
          <p className="text-sm text-stitch-error">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-2 border-l-4 border-green-500/50">
          <CheckCircle size={14} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <FieldGroup title="General">
          <div>
            <label className={labelCls}>Shop Name</label>
            <input value={form.shopName} onChange={set('shopName')} className={inputCls} />
          </div>
        </FieldGroup>

        <FieldGroup title="Inventory Alerts">
          <div>
            <label className={labelCls}>Low Stock Threshold (units)</label>
            <input type="number" min="1" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} className={inputCls} />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Alert when in-stock units fall below this number</p>
          </div>
          <div>
            <label className={labelCls}>Dead Stock Days</label>
            <input type="number" min="1" value={form.deadStockDays} onChange={set('deadStockDays')} className={inputCls} />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Units unsold for longer than this are flagged as dead stock</p>
          </div>
        </FieldGroup>

        <FieldGroup title="Sales Controls">
          <div>
            <label className={labelCls}>Max Discount Without OTP (₨)</label>
            <input type="number" min="0" step="0.01" value={form.maxDiscountWithoutOtp} onChange={set('maxDiscountWithoutOtp')} className={inputCls} />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Discounts above this amount require owner OTP approval</p>
          </div>
        </FieldGroup>

        <FieldGroup title="Fraud Detection">
          <div>
            <label className={labelCls}>Return Fraud Window (days)</label>
            <input type="number" min="1" value={form.returnFraudWindowDays} onChange={set('returnFraudWindowDays')} className={inputCls} />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Look-back window for detecting repeat returns from the same customer</p>
          </div>
          <div>
            <label className={labelCls}>Return Fraud Count Threshold</label>
            <input type="number" min="1" value={form.returnFraudCountThreshold} onChange={set('returnFraudCountThreshold')} className={inputCls} />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Flag as suspicious if customer has this many returns in the window</p>
          </div>
        </FieldGroup>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-stitch-on-primary/30 border-t-stitch-on-primary rounded-full animate-spin" />
              Saving…
            </>
          ) : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
