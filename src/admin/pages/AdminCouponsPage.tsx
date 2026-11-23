import React, { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency, formatDate } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Coupon } from '../../types/domain';

export const AdminCouponsPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const coupons = adminData?.coupons || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'Percentage' as 'Percentage' | 'Fixed',
    discountValue: 10,
    minOrderValue: 50000,
    maxDiscountAmount: 15000,
    usageLimit: 100,
    perCustomerLimit: 1,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: '2027-03-31',
    active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      code: '',
      description: '',
      discountType: 'Percentage',
      discountValue: 10,
      minOrderValue: 50000,
      maxDiscountAmount: 15000,
      usageLimit: 100,
      perCustomerLimit: 1,
      startDate: new Date().toISOString().slice(0, 10),
      expiryDate: '2027-03-31',
      active: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (cpn: Coupon) => {
    setEditing(cpn);
    setForm({
      code: cpn.code,
      description: cpn.description,
      discountType: cpn.discountType,
      discountValue: cpn.discountValue,
      minOrderValue: cpn.minOrderValue,
      maxDiscountAmount: cpn.maxDiscountAmount ?? 0,
      usageLimit: cpn.usageLimit,
      perCustomerLimit: cpn.perCustomerLimit,
      startDate: cpn.startDate || new Date().toISOString().slice(0, 10),
      expiryDate: cpn.expiryDate,
      active: cpn.active,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      maxDiscountAmount: form.maxDiscountAmount > 0 ? Number(form.maxDiscountAmount) : null,
    };
    if (editing) {
      await apiRequest(`/api/admin/coupons/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    await refreshAdminData();
    setDrawerOpen(false);
  };

  const toggleActive = async (cpn: Coupon) => {
    await apiRequest(`/api/admin/coupons/${cpn.id}`, {
      method: 'PUT',
      body: JSON.stringify({ active: !cpn.active }),
    });
    await refreshAdminData();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    await refreshAdminData();
  };

  const columns: DataColumn<Coupon>[] = [
    {
      key: 'code',
      header: 'Privilege Code',
      render: (c) => (
        <div>
          <p className="font-mono font-bold text-[#641E32]">{c.code}</p>
          <p className="text-[11px] text-[#534245] max-w-xs truncate">{c.description}</p>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) => (
        <span className="tabular-nums font-semibold">
          {c.discountType === 'Percentage'
            ? `${c.discountValue}%`
            : formatCurrency(c.discountValue, currency)}
        </span>
      ),
    },
    {
      key: 'rules',
      header: 'Min Order / Cap',
      render: (c) => (
        <div className="text-xs tabular-nums">
          <p>Min: {formatCurrency(c.minOrderValue, currency)}</p>
          <p className="text-[#534245]">
            Max Cap: {c.maxDiscountAmount ? formatCurrency(c.maxDiscountAmount, currency) : 'None'}
          </p>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums text-xs">
          {c.usedCount} / {c.usageLimit} ({c.perCustomerLimit}/patron)
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Validity Window',
      render: (c) => (
        <span className="text-xs tabular-nums text-[#534245]">
          {c.startDate ? `${formatDate(c.startDate)} → ` : ''}
          {formatDate(c.expiryDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <button type="button" onClick={() => toggleActive(c)} className="cursor-pointer">
          <StatusBadge label={c.active ? 'Active' : 'Inactive'} />
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(c)}
            className="p-1.5 text-[#534245] hover:text-[#641E32] cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c.id)}
            className="p-1.5 text-[#8B1E2D] hover:bg-[#FBECEE] rounded cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Coupons & Privilege Offers"
      breadcrumbs={[{ label: 'Coupons & Offers' }]}
      actions={
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Create Privilege Code
        </button>
      }
    >
      <DataTable columns={columns} data={coupons} rowKey={(c) => c.id} />

      <SlideOverModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit Coupon: ${editing.code}` : 'Create Privilege Coupon'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Coupon Code</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. TROUSSEAU15"
              className="w-full px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Description</label>
            <input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as 'Percentage' | 'Fixed' })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Discount Value</label>
              <input
                required
                type="number"
                min={1}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                min={0}
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Max Discount Cap (₹)</label>
              <input
                type="number"
                min={0}
                value={form.maxDiscountAmount}
                onChange={(e) => setForm({ ...form, maxDiscountAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Total Usage Limit</label>
              <input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Per-Customer Limit</label>
              <input
                type="number"
                min={1}
                value={form.perCustomerLimit}
                onChange={(e) => setForm({ ...form, perCustomerLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-[#641E32]"
            />
            Coupon is currently active for redemption
          </label>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
            >
              Save Coupon
            </button>
          </div>
        </form>
      </SlideOverModal>
    </AdminLayout>
  );
};
