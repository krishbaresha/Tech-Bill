import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Building2, Phone, Mail, X } from 'lucide-react';
import { api } from '../../api/client';
import gsap from 'gsap';

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  _count: { purchaseOrders: number };
}

const emptyForm = { name: '', contactName: '', phone: '', email: '', address: '' };

const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/50';
const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

const FIELD_LABELS: Record<string, string> = {
  name: 'Company Name',
  contactName: 'Contact Name',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuppliers = async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.get<Supplier[]>('/suppliers', { params: q ? { search: q } : {} });
      setSuppliers(res.data);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchSuppliers(); }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchSuppliers(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.supplier-card');
      gsap.killTweensOf(els);
      const tw = gsap.fromTo(els,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' },
      );
      return () => { tw.kill(); };
    }
  }, [loading, suppliers]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setForm({
      name: s.name,
      contactName: s.contactName ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await api.patch(`/suppliers/${editTarget.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false);
      void fetchSuppliers(search);
    } catch {
      setError('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
            <Building2 size={20} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface font-space">Suppliers</h1>
            <p className="text-xs text-stitch-on-surface-variant">Manage vendor contacts and purchase relationships</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant/50" size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="pl-9 pr-3 py-1.5 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors w-48 placeholder:text-stitch-on-surface-variant/50" />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95">
            <Plus size={14} /> Add Supplier
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="col-span-full py-16 flex justify-center">
            <span className="w-6 h-6 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
          </div>
        )}
        {!loading && suppliers.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Building2 size={32} className="mx-auto mb-2 text-stitch-on-surface-variant/30" />
            <p className="text-sm text-stitch-on-surface-variant">No suppliers found</p>
          </div>
        )}
        {suppliers.map((s) => (
          <div key={s.id} onClick={() => openEdit(s)}
            className="supplier-card glass-card rounded-xl p-4 hover:border-stitch-primary/30 border border-transparent cursor-pointer transition-all group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-stitch-primary/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-stitch-primary/15 transition-colors">
                <Building2 size={16} className="text-stitch-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stitch-on-surface text-sm truncate">{s.name}</p>
                {s.contactName && (
                  <p className="text-xs text-stitch-on-surface-variant mt-0.5">{s.contactName}</p>
                )}
              </div>
              <span className="text-[10px] text-stitch-on-surface-variant/60 shrink-0 font-mono">{s._count.purchaseOrders} POs</span>
            </div>
            <div className="mt-3 space-y-1">
              {s.phone && (
                <div className="flex items-center gap-1.5 text-xs text-stitch-on-surface-variant font-mono">
                  <Phone size={11} className="text-stitch-on-surface-variant/50" />
                  {s.phone}
                </div>
              )}
              {s.email && (
                <div className="flex items-center gap-1.5 text-xs text-stitch-on-surface-variant truncate">
                  <Mail size={11} className="text-stitch-on-surface-variant/50 shrink-0" />
                  {s.email}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-xl w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="font-bold text-stitch-on-surface font-space">
                {editTarget ? 'Edit Supplier' : 'New Supplier'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {(['name', 'contactName', 'phone', 'email', 'address'] as const).map((field) => (
                <div key={field}>
                  <label className={labelCls}>
                    {FIELD_LABELS[field]}
                    {field === 'name' && <span className="text-stitch-error ml-1">*</span>}
                  </label>
                  <input value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className={inputCls} />
                </div>
              ))}
              {error && <p className="text-xs text-stitch-error">{error}</p>}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={() => void handleSave()} disabled={saving}
                className="px-4 py-2 bg-stitch-primary hover:bg-stitch-primary/90 text-stitch-on-primary text-sm font-bold rounded-lg disabled:opacity-60 transition-all active:scale-95">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
