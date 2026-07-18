import { useEffect, useRef, useState } from 'react';
import {
  Key, Shield, Copy, Eye, EyeOff, RotateCw, RefreshCw, X, Trash2, ShieldOff,
  UserPlus, Plus, Laptop, Download, Store
} from 'lucide-react';
import { api } from '../../api/client';
import type { Role } from '../../types';
import gsap from 'gsap';

interface LicenseRecord {
  id: string;
  tenantId: string;
  licenseKey: string;
  licenseType: 'DESKTOP' | 'MOBILE';
  plan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  expiresAt: string;
  maxDevices: number;
  signedToken?: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string } | null;
  _count?: { devices: number };
}

interface UserPermissionInfo {
  webAccess: boolean;
  desktopAccess: boolean;
  mobileAccess: boolean;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  tenantId: string | null;
  tenant: {
    name: string;
    slug: string;
  } | null;
  userPermission: UserPermissionInfo | null;
  licenses: { id: string }[];
  createdAt: string;
}

interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  maxUsers: number;
  ownerEmail?: string;
  createdAt: string;
  _count?: { users: number };
}

interface DeviceInfo {
  id: string;
  licenseId: string;
  deviceName: string;
  deviceType: string;
  os: string;
  machineHash: string;
  appVersion: string | null;
  lastLoginAt: string | null;
  lastCheckinAt: string | null;
  status: 'ACTIVE' | 'REMOVED';
  createdAt: string;
}

const PLAN_COLORS = {
  BASIC: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PREMIUM: 'bg-stitch-primary/10 text-stitch-primary border-stitch-primary/20',
  ENTERPRISE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  EXPIRED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SUSPENDED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  REVOKED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/50';
const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

export default function LicenseManagementPage() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [allLicenses, setAllLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State — primary entity is now the tenant (shop), not a single user.
  // A License is scoped to the tenant (any staff member there can use it), so all
  // license/device management happens per-shop here, not per-user.
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Who a newly-issued license is recorded as "issued for" (audit trail only —
  // any staff member at the shop can use it once issued). Defaults to the
  // shop's owner when generating a license.
  const [desktopIssueToUserId, setDesktopIssueToUserId] = useState('');

  // License Issuance form state (temporary variables)
  const [desktopPlan, setDesktopPlan] = useState<'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('BASIC');
  const [desktopDuration, setDesktopDuration] = useState<'1m' | '6m' | '1y' | 'lifetime'>('1y');

  // Renewal date state
  const [renewalLicenseId, setRenewalLicenseId] = useState<string | null>(null);
  const [renewalDuration, setRenewalDuration] = useState<'1m' | '6m' | '1y' | 'lifetime'>('1y');

  // User Creation Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'owner' as Role,
    tenantId: '',
    webAccess: true,
    desktopAccess: false,
    mobileAccess: false,
    desktopPlan: 'BASIC' as 'BASIC' | 'PREMIUM' | 'ENTERPRISE',
    desktopDuration: '1y' as '1m' | '6m' | '1y' | 'lifetime',
    mobilePlan: 'BASIC' as 'BASIC' | 'PREMIUM' | 'ENTERPRISE',
    mobileDuration: '1y' as '1m' | '6m' | '1y' | 'lifetime',
  });


  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tenantsRes, usersRes, licensesRes] = await Promise.all([
        api.get<TenantRecord[]>('/tenants'),
        api.get<PlatformUser[]>('/admin/users'),
        api.get<LicenseRecord[]>('/admin/licenses'),
      ]);
      setTenants(tenantsRes.data);
      setUsers(usersRes.data);
      setAllLicenses(licensesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load shop and license directories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.tenant-card-row');
      gsap.killTweensOf(els);
      gsap.fromTo(els,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.02, ease: 'power3.out', clearProps: 'all' }
      );
    }
  }, [loading, tenants, searchQuery]);

  // All users belonging to a given tenant — used both as the "issued for" picker
  // and to display who's on staff at the shop in the detail modal.
  const usersForTenant = (tenantId: string) => users.filter(u => u.tenantId === tenantId);

  // All licenses belonging to a given tenant, regardless of which staff member
  // they were originally issued to — this is the per-shop license pool.
  const licensesForTenant = (tenantId: string) => allLicenses.filter(l => l.tenantId === tenantId);

  const handleSelectTenant = async (tenant: TenantRecord) => {
    setSelectedTenant(tenant);
    setDevices([]);
    setRevealedKeys({});
    setRenewalLicenseId(null);

    const tenantUsers = usersForTenant(tenant.id);
    const owner = tenantUsers.find(u => u.role === 'owner') || tenantUsers[0];
    setDesktopIssueToUserId(owner?.id || '');

    // Load device activations across every active license this shop holds.
    try {
      const activeLicenses = licensesForTenant(tenant.id).filter(l => l.status === 'ACTIVE');
      const deviceLists = await Promise.all(
        activeLicenses.map(l => api.get<DeviceInfo[]>(`/admin/devices?licenseId=${l.id}`))
      );
      setDevices(deviceLists.flatMap(res => res.data));
    } catch (err) {
      console.error('Failed to load shop devices', err);
    }
  };

  const refreshTenantLicenses = async (tenantId: string) => {
    const res = await api.get<LicenseRecord[]>(`/admin/licenses?tenantId=${tenantId}`);
    setAllLicenses(prev => [...prev.filter(l => l.tenantId !== tenantId), ...res.data]);
  };

  const calculateExpiryDate = (duration: '1m' | '6m' | '1y' | 'lifetime'): string => {
    const d = new Date();
    if (duration === '1m') d.setMonth(d.getMonth() + 1);
    else if (duration === '6m') d.setMonth(d.getMonth() + 6);
    else if (duration === '1y') d.setFullYear(d.getFullYear() + 1);
    else d.setFullYear(d.getFullYear() + 100); // 100 years for lifetime
    return d.toISOString();
  };

  const handleGenerateLicense = async () => {
    if (!selectedTenant) return;
    if (!desktopIssueToUserId) {
      setError('This shop has no staff account to record the license against yet — add a user first.');
      return;
    }
    setLicenseLoading(true);
    setError('');

    const expiresAt = calculateExpiryDate(desktopDuration);

    try {
      await api.post('/admin/licenses', {
        userId: desktopIssueToUserId,
        licenseType: 'DESKTOP',
        plan: desktopPlan,
        expiresAt,
      });

      await refreshTenantLicenses(selectedTenant.id);

      setSuccess('License key generated successfully — any staff member at this shop can now activate it.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate license key.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleLicenseAction = async (licenseId: string, action: 'regenerate' | 'revoke' | 'suspend') => {
    if (!selectedTenant) return;
    setLicenseLoading(true);
    setError('');
    try {
      await api.post(`/admin/licenses/${licenseId}/${action}`);
      await refreshTenantLicenses(selectedTenant.id);
      setSuccess(`License successfully ${action}d.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to perform ${action} on license.`);
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleRenewSubmit = async (licenseId: string) => {
    if (!selectedTenant) return;
    setLicenseLoading(true);
    setError('');
    const expiresAt = calculateExpiryDate(renewalDuration);
    try {
      await api.post(`/admin/licenses/${licenseId}/renew`, { expiresAt });
      await refreshTenantLicenses(selectedTenant.id);
      setRenewalLicenseId(null);
      setSuccess('License renewed successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to renew license.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device activation?')) return;
    setLicenseLoading(true);
    setError('');
    try {
      await api.post(`/admin/devices/${deviceId}/remove`);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      setSuccess('Device activation removed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove device.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleResetActivations = async (licenseId: string) => {
    if (!confirm('CAUTION: This will immediately wipe all active device registrations for this license! Continue?')) return;
    setLicenseLoading(true);
    setError('');
    try {
      await api.post(`/admin/devices/license/${licenseId}/reset`);
      setDevices(prev => prev.filter(d => d.licenseId !== licenseId));
      setSuccess('All device activations have been reset.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset activations.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleDownloadLicenseFile = (lic: LicenseRecord, name: string) => {
    if (!lic.signedToken) {
      alert('Could not retrieve raw license signed token.');
      return;
    }
    const blob = new Blob([lic.signedToken], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `techbill_${name.toLowerCase().replace(/\s+/g, '_')}_license.lic`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.tenantId) {
      setError('Please select a tenant shop.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userRes = await api.post<PlatformUser>('/admin/users', {
        name: addUserForm.name,
        username: addUserForm.username,
        password: addUserForm.password,
        role: addUserForm.role,
        tenantId: addUserForm.tenantId,
      });
      const createdUser = userRes.data;

      // Set Web / Desktop / Mobile permissions
      await api.post(`/admin/users/${createdUser.id}/permissions`, {
        webAccess: addUserForm.webAccess,
        desktopAccess: addUserForm.desktopAccess,
        mobileAccess: addUserForm.mobileAccess,
      });

      // Issue licenses if toggled — these land on the shop (tenantId), this
      // user is just recorded as who they were issued for.
      if (addUserForm.desktopAccess) {
        await api.post('/admin/licenses', {
          userId: createdUser.id,
          licenseType: 'DESKTOP',
          plan: addUserForm.desktopPlan,
          expiresAt: calculateExpiryDate(addUserForm.desktopDuration),
        });
      }

      if (addUserForm.mobileAccess) {
        await api.post('/admin/licenses', {
          userId: createdUser.id,
          licenseType: 'MOBILE',
          plan: addUserForm.mobilePlan,
          expiresAt: calculateExpiryDate(addUserForm.mobileDuration),
        });
      }

      setSuccess(`User "${addUserForm.name}" created and configured successfully.`);
      setShowAddModal(false);
      setAddUserForm({
        name: '',
        username: '',
        password: '',
        role: 'owner',
        tenantId: '',
        webAccess: true,
        desktopAccess: false,
        mobileAccess: false,
        desktopPlan: 'BASIC',
        desktopDuration: '1y',
        mobilePlan: 'BASIC',
        mobileDuration: '1y',
      });
      loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create and configure tenant user.');
    } finally {
      setLoading(false);
    }
  };


  // Filter tenants (shops) based on search
  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.ownerEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTenantLicenses = selectedTenant ? licensesForTenant(selectedTenant.id) : [];
  const selectedTenantUsers = selectedTenant ? usersForTenant(selectedTenant.id) : [];
  const selectedDesktopLic = selectedTenantLicenses.find(l => l.licenseType === 'DESKTOP' && l.status === 'ACTIVE');

  return (
    <div ref={containerRef} className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
            <Key size={20} className="text-stitch-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-space">License Management</h1>
            <p className="text-xs text-stitch-on-surface-variant">Configure per-shop activations, staff access, and trusted clock policies</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData}
            className="flex items-center gap-1.5 text-sm text-stitch-on-surface-variant hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stitch-primary text-stitch-on-primary text-sm font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95 animate-pulse"
          >
            <UserPlus size={15} /> Add Tenant User
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card rounded-xl p-3 border-l-4 border-stitch-error/50">
          <p className="text-sm text-stitch-error">{error}</p>
        </div>
      )}
      {success && (
        <div className="glass-card rounded-xl p-3 border-l-4 border-green-500/50">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Search Filter */}
      <div className="glass-card rounded-xl p-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by shop name, subdomain, or owner email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Tenants (shops) table list — a license belongs to the shop, so shops are
          the primary row here, not individual staff users. */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stitch-surface-container-high/50 border-b border-white/5">
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Shop</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Staff</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">Active License Keys</th>
                <th className="px-4 py-3 text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-stitch-on-surface-variant">
                    {loading ? (
                      <span className="inline-block w-6 h-6 border-2 border-stitch-primary/30 border-t-stitch-primary rounded-full animate-spin" />
                    ) : 'No tenant shops found.'}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const tLicenses = licensesForTenant(t.id);
                  const desktopLic = tLicenses.find(l => l.licenseType === 'DESKTOP' && l.status === 'ACTIVE');
                  return (
                    <tr key={t.id} className="tenant-card-row hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Store size={13} className="text-stitch-on-surface-variant/50 shrink-0" />
                          <div>
                            <p className="font-semibold text-white text-sm">{t.name}</p>
                            <p className="text-[10px] text-stitch-primary font-mono mt-0.5">{t.slug}.techbill.app</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-stitch-on-surface">{t.ownerEmail || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-stitch-on-surface-variant">{t._count?.users ?? 0} user{(t._count?.users ?? 0) === 1 ? '' : 's'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {desktopLic && (
                            <div className="flex items-center gap-1.5">
                              <Laptop size={11} className="text-indigo-400" />
                              <span className="text-[10px] font-mono text-white/95">{desktopLic.licenseKey}</span>
                              <span className={`px-1 rounded text-[8px] border capitalize ${PLAN_COLORS[desktopLic.plan]}`}>{desktopLic.plan}</span>
                            </div>
                          )}
                          {!desktopLic && (
                            <span className="text-[10px] text-stitch-on-surface-variant/40 italic">No active license key</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleSelectTenant(t)}
                          className="px-2.5 py-1 text-xs bg-white/5 hover:bg-stitch-primary hover:text-white border border-white/10 rounded transition-all font-semibold"
                        >
                          Keys & Devices
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-xl p-6 w-full max-w-lg border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="font-bold text-white font-space flex items-center gap-2">
                <UserPlus size={16} className="text-stitch-primary" /> Add User to Tenant
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Select Tenant Shop *</label>
                <select
                  value={addUserForm.tenantId}
                  onChange={(e) => setAddUserForm({ ...addUserForm, tenantId: e.target.value })}
                  className={inputCls}
                  required
                >
                  <option value="">-- Choose Tenant Shop --</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  type="text"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  placeholder="e.g. Hammad Malik"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Username Prefix (for email) *</label>
                <input
                  type="text"
                  value={addUserForm.username}
                  onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                  placeholder="e.g. hammad"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Initial Password *</label>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className={inputCls}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className={labelCls}>User Role *</label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as Role })}
                  className={inputCls}
                  required
                >
                  <option value="owner">Owner / Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="technician">Technician</option>
                </select>
              </div>

              {/* Access Section (Checkboxes) */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <label className={labelCls}>Access Platforms</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-white select-none">
                    <input
                      type="checkbox"
                      checked={addUserForm.webAccess}
                      onChange={(e) => setAddUserForm({ ...addUserForm, webAccess: e.target.checked })}
                      className="accent-[#c0c1ff]"
                    />
                    Web Browser
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-white select-none">
                    <input
                      type="checkbox"
                      checked={addUserForm.desktopAccess}
                      onChange={(e) => setAddUserForm({ ...addUserForm, desktopAccess: e.target.checked })}
                      className="accent-[#c0c1ff]"
                    />
                    Desktop Client
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-white select-none">
                    <input
                      type="checkbox"
                      checked={addUserForm.mobileAccess}
                      onChange={(e) => setAddUserForm({ ...addUserForm, mobileAccess: e.target.checked })}
                      className="accent-[#c0c1ff]"
                    />
                    Mobile App
                  </label>
                </div>
              </div>

              {/* Desktop subscription details */}
              {addUserForm.desktopAccess && (
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-3">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Desktop Client Subscription</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Desktop Plan</label>
                      <select
                        value={addUserForm.desktopPlan}
                        onChange={(e: any) => setAddUserForm({ ...addUserForm, desktopPlan: e.target.value })}
                        className={inputCls + " py-1.5 text-xs"}
                      >
                        <option value="BASIC">Basic (1 Device)</option>
                        <option value="PREMIUM">Premium (3 Devices)</option>
                        <option value="ENTERPRISE">Enterprise (Unlimited)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Desktop Expiry</label>
                      <select
                        value={addUserForm.desktopDuration}
                        onChange={(e: any) => setAddUserForm({ ...addUserForm, desktopDuration: e.target.value })}
                        className={inputCls + " py-1.5 text-xs"}
                      >
                        <option value="1m">1 Month</option>
                        <option value="6m">6 Months</option>
                        <option value="1y">1 Year</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile subscription details */}
              {addUserForm.mobileAccess && (
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-3">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Mobile App Subscription</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Mobile Plan</label>
                      <select
                        value={addUserForm.mobilePlan}
                        onChange={(e: any) => setAddUserForm({ ...addUserForm, mobilePlan: e.target.value })}
                        className={inputCls + " py-1.5 text-xs"}
                      >
                        <option value="BASIC">Basic (1 Device)</option>
                        <option value="PREMIUM">Premium (3 Devices)</option>
                        <option value="ENTERPRISE">Enterprise (Unlimited)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Mobile Expiry</label>
                      <select
                        value={addUserForm.mobileDuration}
                        onChange={(e: any) => setAddUserForm({ ...addUserForm, mobileDuration: e.target.value })}
                        className={inputCls + " py-1.5 text-xs"}
                      >
                        <option value="1m">1 Month</option>
                        <option value="6m">6 Months</option>
                        <option value="1y">1 Year</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-stitch-on-surface-variant border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 text-sm bg-stitch-primary text-white font-bold rounded-lg hover:bg-stitch-primary/90 transition-all active:scale-95">
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* DETAIL MODAL (License & Devices Setup) — scoped to the shop (tenant),
          since licenses belong to the shop, not to any one staff member. */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-xl p-6 w-full max-w-5xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
              <div>
                <h2 className="font-bold text-white text-base font-space flex items-center gap-2">
                  <Shield className="text-stitch-primary" size={18} /> Licenses & Devices: {selectedTenant.name}
                </h2>
                <p className="text-[11px] text-stitch-on-surface-variant mt-0.5">
                  Shop: <strong className="text-white">{selectedTenant.slug}.techbill.app</strong> • Owner: <strong className="text-white">{selectedTenant.ownerEmail || '—'}</strong> • {selectedTenantUsers.length} staff account{selectedTenantUsers.length === 1 ? '' : 's'}
                </p>
              </div>
              <button onClick={() => setSelectedTenant(null)} className="text-stitch-on-surface-variant hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">

              <p className="text-[11px] text-stitch-on-surface-variant/80 -mt-1">
                A license issued here can be activated by <strong className="text-white">any staff member</strong> at this shop — up to the plan's device limit. The staff member picked below is only recorded as an audit "issued for" reference.
              </p>

              {/* Row 1: Desktop license generate/manage box — one license per shop */}
              <div className="grid grid-cols-1 gap-5">

                {/* Desktop License Box */}
                <div className="glass-card rounded-xl p-4.5 border border-white/5 flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Laptop size={16} className="text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase">Desktop App Access</h3>
                      <p className="text-[10px] text-stitch-on-surface-variant">Shared offline POS/Inventory license for this shop</p>
                    </div>
                  </div>

                  {selectedDesktopLic ? (
                    (() => {
                      const activeLic = selectedDesktopLic;
                      const isRevealed = revealedKeys[activeLic.id];
                      return (
                        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">License Key</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${STATUS_COLORS[activeLic.status]}`}>{activeLic.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={isRevealed ? activeLic.licenseKey : 'TB-DSK-••••-••••-••••'}
                              className="flex-1 bg-black/25 font-mono text-xs px-2.5 py-1.5 rounded border border-white/5 text-white/90 select-all"
                            />
                            <button
                              onClick={() => setRevealedKeys(prev => ({ ...prev, [activeLic.id]: !isRevealed }))}
                              className="p-1.5 bg-white/5 rounded border border-white/5 text-stitch-on-surface-variant hover:text-white"
                            >
                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(activeLic.licenseKey);
                                setSuccess('Copied to clipboard!');
                                setTimeout(() => setSuccess(''), 2000);
                              }}
                              className="p-1.5 bg-white/5 rounded border border-white/5 text-stitch-on-surface-variant hover:text-white"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-stitch-on-surface-variant pt-1">
                            <span>Plan: <strong className="text-white capitalize">{activeLic.plan}</strong></span>
                            <span>Expires: <strong className="text-white">{new Date(activeLic.expiresAt).toLocaleDateString()}</strong></span>
                          </div>
                          {activeLic.user && (
                            <p className="text-[9px] text-stitch-on-surface-variant/60">Issued for: {activeLic.user.name}</p>
                          )}

                          {/* License Admin Actions */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
                            <button onClick={() => handleLicenseAction(activeLic.id, 'regenerate')}
                              className="py-1 text-[9px] bg-white/5 hover:bg-indigo-500 hover:text-white rounded border border-white/5 font-semibold">
                              Re-Gen
                            </button>
                            <button onClick={() => setRenewalLicenseId(activeLic.id)}
                              className="py-1 text-[9px] bg-white/5 hover:bg-green-500 hover:text-white rounded border border-white/5 font-semibold">
                              Renew
                            </button>
                            <button onClick={() => handleLicenseAction(activeLic.id, 'suspend')}
                              className="py-1 text-[9px] bg-white/5 hover:bg-orange-500 hover:text-white rounded border border-white/5 font-semibold">
                              Suspend
                            </button>
                            <button onClick={() => handleLicenseAction(activeLic.id, 'revoke')}
                              className="py-1 text-[9px] bg-white/5 hover:bg-red-500 hover:text-white rounded border border-white/5 font-semibold">
                              Revoke
                            </button>
                          </div>
                          <div className="pt-1.5">
                            <button
                              onClick={() => handleDownloadLicenseFile(activeLic, `desktop_${selectedTenant.slug}`)}
                              className="w-full py-1 px-2 text-[9px] flex items-center justify-center gap-1 bg-white/5 hover:bg-stitch-primary text-white rounded border border-white/5 font-bold"
                            >
                              <Download size={11} /> Download Offline License File (.lic)
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-3">
                      {selectedTenantUsers.length === 0 ? (
                        <div className="flex gap-2 p-2 bg-stitch-error/5 border border-stitch-error/10 rounded-lg text-xs text-stitch-on-surface-variant/80 items-start leading-normal">
                          <ShieldOff size={15} className="text-stitch-error shrink-0 mt-0.5" />
                          <p>This shop has no staff accounts yet — add one before issuing a license.</p>
                        </div>
                      ) : (
                        <div>
                          <label className={labelCls}>Issued For (audit record only)</label>
                          <select
                            value={desktopIssueToUserId}
                            onChange={(e) => setDesktopIssueToUserId(e.target.value)}
                            className={inputCls + " py-1.5 text-xs"}
                          >
                            {selectedTenantUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelCls}>License Plan</label>
                          <select
                            value={desktopPlan}
                            onChange={(e: any) => setDesktopPlan(e.target.value)}
                            className={inputCls + " py-1.5 text-xs"}
                          >
                            <option value="BASIC">Basic (1 Client Device)</option>
                            <option value="PREMIUM">Premium (3 Client Devices)</option>
                            <option value="ENTERPRISE">Enterprise (Unlimited Devices)</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Duration Period</label>
                          <select
                            value={desktopDuration}
                            onChange={(e: any) => setDesktopDuration(e.target.value)}
                            className={inputCls + " py-1.5 text-xs"}
                          >
                            <option value="1m">1 Month</option>
                            <option value="6m">6 Months</option>
                            <option value="1y">1 Year</option>
                            <option value="lifetime">Lifetime Plan</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGenerateLicense()}
                        disabled={selectedTenantUsers.length === 0 || licenseLoading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                      >
                        <Plus size={13} /> Generate Desktop License Key
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* License Renewal Panel */}
              {renewalLicenseId && (
                <div className="glass-card rounded-xl p-4.5 border border-green-500/20 bg-green-950/10 space-y-4 animate-in slide-in-from-top-3 duration-200">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold text-white font-space flex items-center gap-1.5">
                      <RotateCw size={14} className="text-green-400" /> Renew License Subscription
                    </h4>
                    <button onClick={() => setRenewalLicenseId(null)} className="text-stitch-on-surface-variant hover:text-white">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className={labelCls}>Extension Period</label>
                      <select
                        value={renewalDuration}
                        onChange={(e: any) => setRenewalDuration(e.target.value)}
                        className={inputCls}
                      >
                        <option value="1m">Extend by 1 Month</option>
                        <option value="6m">Extend by 6 Months</option>
                        <option value="1y">Extend by 1 Year</option>
                        <option value="lifetime">Extend to Lifetime (100 Years)</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleRenewSubmit(renewalLicenseId)}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      Apply Renewal & Extend Expiry
                    </button>
                  </div>
                </div>
              )}

              {/* Row 2: Device activations list — shared across all of this shop's staff */}
              {selectedDesktopLic && (
                <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 flex-wrap gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-space">Device Activations</h3>
                      <p className="text-[10px] text-stitch-on-surface-variant mt-0.5">Hardware slots currently registered by any staff member at this shop</p>
                    </div>
                    {devices.length > 0 && (
                      <button
                        onClick={() => handleResetActivations(selectedDesktopLic.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded text-[10px] font-bold transition-all"
                      >
                        <ShieldOff size={11} /> Reset All Activations
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
                          <th className="py-2 px-3">Device Name</th>
                          <th className="py-2 px-3">Operating System</th>
                          <th className="py-2 px-3 font-mono">Machine Hash (SHA-256)</th>
                          <th className="py-2 px-3">App Ver</th>
                          <th className="py-2 px-3">Last Checkin</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {devices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-stitch-on-surface-variant italic">
                              No devices have been activated with a license from this shop yet.
                            </td>
                          </tr>
                        ) : (
                          devices.map(d => (
                            <tr key={d.id} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-medium text-white">{d.deviceName}</td>
                              <td className="py-2.5 px-3 text-stitch-on-surface-variant">{d.os}</td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-stitch-on-surface-variant/80 select-all max-w-[150px] truncate" title={d.machineHash}>
                                {d.machineHash.substring(0, 16)}...
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-white/90">{d.appVersion || '1.0.0'}</td>
                              <td className="py-2.5 px-3 text-stitch-on-surface-variant">
                                {d.lastCheckinAt ? new Date(d.lastCheckinAt).toLocaleString() : d.lastLoginAt ? new Date(d.lastLoginAt).toLocaleString() : 'Never'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => handleRemoveDevice(d.id)}
                                  className="p-1 text-stitch-on-surface-variant hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                                  title="De-register hardware"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Row 3: Audit Trails / History */}
              <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
                <div className="border-b border-white/5 pb-2.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-space">License Issuance & Renewal History</h3>
                  <p className="text-[10px] text-stitch-on-surface-variant mt-0.5">Historical log of every license this shop has held, and who it was issued for</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-bold text-stitch-on-surface-variant uppercase tracking-wider">
                        <th className="py-2 px-3">License Key</th>
                        <th className="py-2 px-3">Platform</th>
                        <th className="py-2 px-3">Plan</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Issued For</th>
                        <th className="py-2 px-3">Created At</th>
                        <th className="py-2 px-3">Expires At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedTenantLicenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-stitch-on-surface-variant italic">
                            No historical license records found.
                          </td>
                        </tr>
                      ) : (
                        selectedTenantLicenses.map(log => (
                          <tr key={log.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-white/90">{log.licenseKey}</td>
                            <td className="py-2.5 px-3 text-stitch-on-surface-variant">{log.licenseType}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize ${PLAN_COLORS[log.plan]}`}>
                                {log.plan}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize ${STATUS_COLORS[log.status]}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stitch-on-surface-variant/80">{log.user?.name || '—'}</td>
                            <td className="py-2.5 px-3 text-stitch-on-surface-variant/80">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-stitch-on-surface-variant/80">{new Date(log.expiresAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0 bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-all"
              >
                Close Portal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
