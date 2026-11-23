import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency, formatDate } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Expense, ExpenseCategory } from '../../types/domain';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Inventory',
  'Shipping',
  'Packaging',
  'Marketing',
  'Rent',
  'Staff',
  'Technology',
  'Miscellaneous',
];

export const AdminExpensesPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const expenses = adminData?.expenses || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const [catFilter, setCatFilter] = useState<'All' | ExpenseCategory>('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    category: 'Inventory' as ExpenseCategory,
    vendor: '',
    amount: 25000,
    date: new Date().toISOString().slice(0, 10),
    paymentStatus: 'Paid' as Expense['paymentStatus'],
    paymentMethod: 'Bank Transfer' as Expense['paymentMethod'],
    notes: '',
    attachmentRef: '',
  });

  const summary = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const paid = expenses.filter((e) => e.paymentStatus === 'Paid').reduce((s, e) => s + e.amount, 0);
    const pending = expenses.filter((e) => e.paymentStatus !== 'Paid').reduce((s, e) => s + e.amount, 0);
    return { total, paid, pending };
  }, [expenses]);

  const filtered = useMemo(() => {
    return catFilter === 'All' ? expenses : expenses.filter((e) => e.category === catFilter);
  }, [expenses, catFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({
      category: 'Inventory',
      vendor: '',
      amount: 25000,
      date: new Date().toISOString().slice(0, 10),
      paymentStatus: 'Paid',
      paymentMethod: 'Bank Transfer',
      notes: '',
      attachmentRef: '',
    });
    setDrawerOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      category: exp.category,
      vendor: exp.vendor,
      amount: exp.amount,
      date: exp.date,
      paymentStatus: exp.paymentStatus,
      paymentMethod: exp.paymentMethod,
      notes: exp.notes,
      attachmentRef: exp.attachmentRef || '',
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiRequest(`/api/admin/expenses/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest('/api/admin/expenses', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    await refreshAdminData();
    setDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    await refreshAdminData();
    if (editing?.id === id) setDrawerOpen(false);
  };

  const columns: DataColumn<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (e) => <span className="text-xs tabular-nums text-[#534245]">{formatDate(e.date)}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => <span className="font-semibold text-[#641E32] text-xs">{e.category}</span>,
    },
    {
      key: 'vendor',
      header: 'Vendor & Notes',
      render: (e) => (
        <div>
          <p className="font-medium text-[#24211F]">{e.vendor}</p>
          <p className="text-[11px] text-[#534245] truncate max-w-xs">{e.notes}</p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method / Ref',
      render: (e) => (
        <div className="text-xs">
          <p>{e.paymentMethod}</p>
          {e.attachmentRef && <p className="font-mono text-[10px] text-[#534245]">{e.attachmentRef}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (e) => <span className="tabular-nums font-semibold">{formatCurrency(e.amount, currency)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge label={e.paymentStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            handleDelete(e.id);
          }}
          aria-label={`Delete ${e.vendor}`}
          className="p-1.5 text-[#8B1E2D] hover:bg-[#FBECEE] rounded cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Atelier Expenses Ledger"
      breadcrumbs={[{ label: 'Expenses' }]}
      actions={
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Log Expense
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Recorded Expenses" value={formatCurrency(summary.total, currency)} goldAccent />
        <MetricCard label="Settled Payments" value={formatCurrency(summary.paid, currency)} />
        <MetricCard label="Pending / Due" value={formatCurrency(summary.pending, currency)} />
      </div>

      <div className="bg-white border border-[#D8C9B4] rounded p-3 flex flex-wrap gap-1.5">
        {(['All', ...EXPENSE_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
              catFilter === cat
                ? 'bg-[#641E32] text-white border-[#641E32]'
                : 'bg-[#FAF7F2] text-[#534245] border-[#D8C9B4]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(e) => e.id} onRowClick={openEdit} />

      <SlideOverModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit Expense: ${editing.vendor}` : 'Record New Expense'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Date</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Vendor / Payee</label>
            <input
              required
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Amount (₹)</label>
              <input
                required
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Payment Status</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as Expense['paymentStatus'] })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as Expense['paymentMethod'] })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Corporate Card">Corporate Card</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Invoice / Receipt Attachment Reference</label>
            <div className="flex gap-2">
              <input
                value={form.attachmentRef}
                onChange={(e) => setForm({ ...form, attachmentRef: e.target.value })}
                placeholder="e.g. INV-2026-884 or receipt.pdf"
                className="flex-1 px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Attach File</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setForm((prev) => ({ ...prev, attachmentRef: file.name }));
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              {editing && (
                <button
                  type="button"
                  onClick={() => handleDelete(editing.id)}
                  className="px-3 py-2 text-xs font-semibold text-[#8B1E2D] border border-[#E8A2AA] rounded hover:bg-[#FBECEE] cursor-pointer"
                >
                  Delete Expense
                </button>
              )}
            </div>
            <div className="flex gap-2">
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
                Save Expense
              </button>
            </div>
          </div>
        </form>
      </SlideOverModal>
    </AdminLayout>
  );
};
