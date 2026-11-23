import React, { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Save, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { AdminLayout } from '../components/AdminLayout';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import type { StaffRoleName, StoreSettings } from '../../types/domain';

type SettingsTab = 'profile' | 'commerce' | 'staff' | 'security';

export const AdminSettingsPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [staffDrawer, setStaffDrawer] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'Atelier Manager' as StaffRoleName,
    password: '',
  });

  useEffect(() => {
    if (adminData?.settings) {
      setSettings(structuredClone(adminData.settings));
    }
  }, [adminData?.settings]);

  if (!settings) {
    return (
      <AdminLayout title="Settings" breadcrumbs={[{ label: 'Settings' }]}>
        <div className="p-6 bg-white border border-[#D8C9B4] rounded text-xs">Loading settings...</div>
      </AdminLayout>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      await refreshAdminData();
      setSavedMsg('Store configuration saved and synced.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    try {
      await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      await refreshAdminData();
      setStaffDrawer(false);
      setNewStaff({ name: '', email: '', role: 'Atelier Manager', password: '' });
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : 'Unable to create staff account.');
    }
  };

  const toggleStaffStatus = async (staffId: string, current: 'Active' | 'Suspended') => {
    await apiRequest(`/api/admin/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: current === 'Active' ? 'Suspended' : 'Active' }),
    });
    await refreshAdminData();
  };

  return (
    <AdminLayout
      title="Atelier & System Settings"
      breadcrumbs={[{ label: 'Settings' }]}
      actions={
        <button
          type="submit"
          form="admin-settings-form"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      }
    >
      {savedMsg && (
        <div className="flex items-center gap-2 p-3 bg-[#EBF3EF] border border-[#95C1AE] text-[#1C4A3A] text-xs rounded">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="inline-flex flex-wrap p-1 bg-white border border-[#D8C9B4] rounded">
        {(
          [
            { id: 'profile', label: 'Store Profile & Regional' },
            { id: 'commerce', label: 'GST, Shipping & Payments' },
            { id: 'staff', label: 'Staff Accounts & RBAC Roles' },
            { id: 'security', label: 'Security & Notifications' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-xs font-semibold rounded cursor-pointer ${
              tab === t.id ? 'bg-[#641E32] text-white' : 'text-[#534245]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form id="admin-settings-form" onSubmit={handleSaveSettings} className="space-y-6">
        {tab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Store Profile
              </h2>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Store Name</label>
                <input
                  value={settings.storeProfile.storeName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeProfile: { ...settings.storeProfile, storeName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Brand Tagline</label>
                <input
                  value={settings.storeProfile.tagline}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeProfile: { ...settings.storeProfile, tagline: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Brand Wordmark</label>
                <input
                  value={settings.storeProfile.logoMark}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeProfile: { ...settings.storeProfile, logoMark: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Support Email</label>
                  <input
                    value={settings.storeProfile.supportEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storeProfile: { ...settings.storeProfile, supportEmail: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Support Phone</label>
                  <input
                    value={settings.storeProfile.supportPhone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storeProfile: { ...settings.storeProfile, supportPhone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Atelier Address</label>
                <input
                  value={settings.storeProfile.address}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeProfile: { ...settings.storeProfile, address: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
            </div>

            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Regional & Storefront Preferences
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Display Currency</label>
                  <select
                    value={settings.regional.currency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        regional: { ...settings.regional, currency: e.target.value as 'INR' | 'USD' },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ International)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Timezone</label>
                  <input
                    value={settings.regional.timezone}
                    onChange={(e) =>
                      setSettings({ ...settings, regional: { ...settings.regional, timezone: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Date Format</label>
                  <select
                    value={settings.regional.dateFormat}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        regional: {
                          ...settings.regional,
                          dateFormat: e.target.value as 'DD MMM YYYY' | 'YYYY-MM-DD',
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
                  >
                    <option value="DD MMM YYYY">DD MMM YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2.5 pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.storefrontPreferences.showOutOfStockSarees}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storefrontPreferences: {
                          ...settings.storefrontPreferences,
                          showOutOfStockSarees: e.target.checked,
                        },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Show out-of-stock archival sarees on storefront
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.storefrontPreferences.enableWishlist}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storefrontPreferences: { ...settings.storefrontPreferences, enableWishlist: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Enable customer wishlist saving
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.storefrontPreferences.enableBridalConcierge}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storefrontPreferences: {
                          ...settings.storefrontPreferences,
                          enableBridalConcierge: e.target.checked,
                        },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Enable Private Bridal Concierge booking on storefront
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === 'commerce' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                GST Configuration
              </h2>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.gstConfig.gstEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      gstConfig: { ...settings.gstConfig, gstEnabled: e.target.checked },
                    })
                  }
                  className="accent-[#641E32]"
                />
                Enable GST calculation on silk orders
              </label>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">GSTIN</label>
                <input
                  value={settings.gstConfig.gstin}
                  onChange={(e) =>
                    setSettings({ ...settings, gstConfig: { ...settings.gstConfig, gstin: e.target.value } })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Silk GST (%)</label>
                  <input
                    type="number"
                    value={settings.gstConfig.silkTaxRatePercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gstConfig: { ...settings.gstConfig, silkTaxRatePercent: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">HSN Code</label>
                  <input
                    value={settings.gstConfig.hsnCode}
                    onChange={(e) =>
                      setSettings({ ...settings, gstConfig: { ...settings.gstConfig, hsnCode: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Shipping & Delivery
              </h2>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Free Shipping Threshold (₹)</label>
                <input
                  type="number"
                  value={settings.shippingConfig.freeShippingThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shippingConfig: { ...settings.shippingConfig, freeShippingThreshold: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Standard Insured Fee (₹)</label>
                <input
                  type="number"
                  value={settings.shippingConfig.standardShippingFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shippingConfig: { ...settings.shippingConfig, standardShippingFee: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Domestic SLA</label>
                <input
                  value={settings.shippingConfig.estimatedDaysDomestic}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shippingConfig: { ...settings.shippingConfig, estimatedDaysDomestic: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
            </div>

            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Payment Gateways
              </h2>
              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.upiEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, upiEnabled: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  UPI Instant Settlement
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.cardsEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, cardsEnabled: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Credit & Debit Cards
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.netBankingEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, netBankingEnabled: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Net Banking
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.codEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, codEnabled: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Cash on Delivery (COD)
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">COD Max Order Cap (₹)</label>
                <input
                  type="number"
                  value={settings.paymentMethods.codMaxOrderValue}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paymentMethods: { ...settings.paymentMethods, codMaxOrderValue: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'staff' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEE7E3] pb-3">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[#24211F]">Staff Accounts</h2>
                  <p className="text-xs text-[#534245]">
                    Create role-scoped accounts verified on the server via scrypt / Supabase Auth.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffDrawer(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Staff Account
                </button>
              </div>
              <div className="divide-y divide-[#EEE7E3]">
                {(adminData?.staffAccounts || []).map((st) => (
                  <div key={st.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-[#24211F]">{st.name}</p>
                      <p className="text-[#534245]">{st.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[#641E32]">{st.role}</span>
                      <StatusBadge label={st.status} />
                      <button
                        type="button"
                        onClick={() => toggleStaffStatus(st.id, st.status)}
                        className="px-2.5 py-1 border border-[#D8C9B4] rounded hover:bg-[#FAF7F2] cursor-pointer"
                      >
                        {st.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Role-Based Access Control (RBAC) Matrix
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(adminData?.roles || []).map((role) => (
                  <div key={role.role} className="p-4 bg-[#FAF7F2] border border-[#D8C9B4] rounded space-y-2">
                    <p className="font-semibold text-sm text-[#641E32]">{role.role}</p>
                    <p className="text-xs text-[#534245]">{role.description}</p>
                    <p className="text-[11px] font-mono text-[#24211F] pt-1">
                      Modules: {role.permissions.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Security & Supabase Architecture
              </h2>
              <div className="p-4 bg-[#FAF7F2] border border-[#D8C9B4] rounded text-xs space-y-1.5">
                <p className="font-semibold text-[#1C4A3A] inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Server-Verified Authentication & RBAC Active
                </p>
                <p className="text-[#534245]">
                  Tokens are verified on every Express endpoint (`/api/admin/*`) and held solely in memory. Set{' '}
                  <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                  <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> with{' '}
                  <code className="font-mono">supabase/schema.sql</code> to cut over to Supabase Auth & RLS.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Session Timeout (Minutes)</label>
                <input
                  type="number"
                  min={15}
                  value={settings.security.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeoutMinutes: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.enforceRbacOnApi}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, enforceRbacOnApi: e.target.checked },
                    })
                  }
                  className="accent-[#641E32]"
                />
                Enforce server-side module RBAC checks on every API call
              </label>
            </div>

            <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
                Notification Preferences
              </h2>
              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.lowStockAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, lowStockAlerts: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Low-stock vault threshold alerts
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.newOrderEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, newOrderEmail: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Instant new storefront order notifications
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.enquiryAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, enquiryAlerts: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Bridal & bespoke concierge enquiry alerts
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.dailySummaryDigest}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, dailySummaryDigest: e.target.checked },
                      })
                    }
                    className="accent-[#641E32]"
                  />
                  Daily evening revenue & dispatch digest
                </label>
              </div>
            </div>
          </div>
        )}
      </form>

      <SlideOverModal open={staffDrawer} onClose={() => setStaffDrawer(false)} title="Provision Staff Account" size="md">
        <form onSubmit={handleCreateStaff} className="space-y-3">
          {staffError && (
            <div className="p-3 text-xs text-[#8B1E2D] bg-[#FBECEE] border border-[#E8A2AA] rounded">{staffError}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Staff Name</label>
            <input
              required
              value={newStaff.name}
              onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Email</label>
            <input
              required
              type="email"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Assigned Role</label>
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as StaffRoleName })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
            >
              {(adminData?.roles || []).map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Initial Password (min 8 chars)</label>
            <input
              required
              type="password"
              minLength={8}
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStaffDrawer(false)}
              className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </form>
      </SlideOverModal>
    </AdminLayout>
  );
};
