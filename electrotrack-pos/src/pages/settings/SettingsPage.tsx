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
  logoUrl: string;
  invoiceFontFamily: string;
  invoicePrimaryColor: string;
  invoiceAccentColor: string;
  invoiceFooterNotes: string;
  invoiceWatermarkText: string;
  invoiceShowWatermark: boolean;
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

const FONT_OPTIONS = ['Inter', 'system-ui', 'Georgia', 'Courier New', 'Helvetica'];

export default function SettingsPage() {
  const { user, accessToken, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState<SettingsForm>({
    shopName: '',
    lowStockThreshold: '2',
    deadStockDays: '60',
    maxDiscountWithoutOtp: '500',
    returnFraudWindowDays: '30',
    returnFraudCountThreshold: '2',
    logoUrl: '',
    invoiceFontFamily: 'Inter',
    invoicePrimaryColor: '#ffffff',
    invoiceAccentColor: '#14b8a6',
    invoiceFooterNotes: '',
    invoiceWatermarkText: '',
    invoiceShowWatermark: false,
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
          logoUrl: s.logoUrl ?? '',
          invoiceFontFamily: s.invoiceFontFamily ?? 'Inter',
          invoicePrimaryColor: s.invoicePrimaryColor ?? '#ffffff',
          invoiceAccentColor: s.invoiceAccentColor ?? '#14b8a6',
          invoiceFooterNotes: s.invoiceFooterNotes ?? '',
          invoiceWatermarkText: s.invoiceWatermarkText ?? '',
          invoiceShowWatermark: s.invoiceShowWatermark ?? false,
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

  const set = (key: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
        logoUrl: form.logoUrl || null,
        invoiceFontFamily: form.invoiceFontFamily,
        invoicePrimaryColor: form.invoicePrimaryColor,
        invoiceAccentColor: form.invoiceAccentColor,
        invoiceFooterNotes: form.invoiceFooterNotes || null,
        invoiceWatermarkText: form.invoiceWatermarkText || null,
        invoiceShowWatermark: form.invoiceShowWatermark,
      });
      setSuccessMsg('Settings saved');
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
    <div ref={containerRef} className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-stitch-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stitch-on-surface font-space">Shop Settings</h1>
          <p className="text-xs text-stitch-on-surface-variant">Configure thresholds, controls, and invoice template</p>
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

        <FieldGroup title="Invoice Template">
          <div>
            <label className={labelCls}>Logo URL</label>
            <input value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://..." className={inputCls} />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Publicly accessible image URL shown at the top of invoices</p>
          </div>
          {form.logoUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <img src={form.logoUrl} alt="Logo preview" className="h-10 w-auto object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <p className="text-xs text-stitch-on-surface-variant">Logo preview</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.invoicePrimaryColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, invoicePrimaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                />
                <input value={form.invoicePrimaryColor} onChange={set('invoicePrimaryColor')} placeholder="#ffffff" className={`${inputCls} flex-1`} />
              </div>
              <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Shop name & heading color</p>
            </div>
            <div>
              <label className={labelCls}>Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.invoiceAccentColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, invoiceAccentColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                />
                <input value={form.invoiceAccentColor} onChange={set('invoiceAccentColor')} placeholder="#14b8a6" className={`${inputCls} flex-1`} />
              </div>
              <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Serial numbers & QR color</p>
            </div>
          </div>
          <div>
            <label className={labelCls}>Invoice Font</label>
            <select value={form.invoiceFontFamily} onChange={set('invoiceFontFamily')}
              className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors">
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Footer Notes</label>
            <textarea
              value={form.invoiceFooterNotes}
              onChange={(e) => setForm((prev) => ({ ...prev, invoiceFooterNotes: e.target.value }))}
              placeholder="e.g. All sales are final. Warranty claims require original receipt."
              rows={2}
              className="w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/50 resize-none"
            />
            <p className="text-[10px] text-stitch-on-surface-variant/60 mt-1">Printed at the bottom of every invoice</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Watermark Text</label>
              <input value={form.invoiceWatermarkText} onChange={set('invoiceWatermarkText')} placeholder="e.g. PAID" className={inputCls} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((prev) => ({ ...prev, invoiceShowWatermark: !prev.invoiceShowWatermark }))}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.invoiceShowWatermark ? 'bg-stitch-primary' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.invoiceShowWatermark ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-stitch-on-surface-variant">Show watermark</span>
              </label>
            </div>
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
