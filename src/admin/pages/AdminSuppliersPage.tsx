import React, { useState } from 'react';
import { Edit, PackageCheck, Plus, Wallet } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency, formatDate } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { PurchaseOrder, Supplier } from '../../types/domain';

export const AdminSuppliersPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const suppliers = adminData?.suppliers || [];
  const purchaseOrders = adminData?.purchaseOrders || [];
  const products = adminData?.products || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const [tab, setTab] = useState<'po' | 'suppliers'>('po');
  const [supplierDrawer, setSupplierDrawer] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [poDrawer, setPoDrawer] = useState(false);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveCounts, setReceiveCounts] = useState<Record<string, number>>({});
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const [supForm, setSupForm] = useState({
    name: '',
    craftCluster: '',
    contactPerson: '',
    phone: '',
    email: '',
    notes: '',
    active: true,
  });

  const [poForm, setPoForm] = useState({
    supplierId: suppliers[0]?.id || '',
    productId: products[0]?.id || '',
    orderedQty: 3,
    unitCost: 45000,
    paidAmount: 45000,
    expectedDate: '2026-12-15',
    notes: '',
  });

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setSupForm({
      name: '',
      craftCluster: '',
      contactPerson: '',
      phone: '',
      email: '',
      notes: '',
      active: true,
    });
    setSupplierDrawer(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupForm({
      name: sup.name,
      craftCluster: sup.craftCluster,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      notes: sup.notes,
      active: sup.active,
    });
    setSupplierDrawer(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      await apiRequest(`/api/admin/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        body: JSON.stringify(supForm),
      });
    } else {
      await apiRequest('/api/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify(supForm),
      });
    }
    await refreshAdminData();
    setSupplierDrawer(false);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === poForm.productId);
    if (!prod) return;
    await apiRequest('/api/admin/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: poForm.supplierId,
        expectedDate: poForm.expectedDate,
        paidAmount: Number(poForm.paidAmount),
        notes: poForm.notes,
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            orderedQty: Number(poForm.orderedQty),
            receivedQty: 0,
            unitCost: Number(poForm.unitCost),
          },
        ],
      }),
    });
    await refreshAdminData();
    setPoDrawer(false);
  };

  const openReceive = (po: PurchaseOrder) => {
    setReceivePo(po);
    const init: Record<string, number> = {};
    po.items.forEach((it) => {
      init[it.productId] = Math.max(0, it.orderedQty - it.receivedQty);
    });
    setReceiveCounts(init);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivePo) return;
    await apiRequest(`/api/admin/purchase-orders/${receivePo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ receivedQuantities: receiveCounts }),
    });
    await refreshAdminData();
    setReceivePo(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier) return;
    await apiRequest(`/api/admin/suppliers/${paySupplier.id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount: payAmount }),
    });
    await refreshAdminData();
    setPaySupplier(null);
  };

  const poColumns: DataColumn<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO #',
      render: (po) => (
        <div>
          <p className="font-mono font-semibold text-[#641E32]">{po.poNumber}</p>
          <p className="text-[11px] text-[#534245]">Expected {formatDate(po.expectedDate)}</p>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Weaving Guild',
      render: (po) => <span className="font-medium text-[#24211F]">{po.supplierName}</span>,
    },
    {
      key: 'items',
      header: 'Incoming Stock',
      render: (po) => (
        <div className="text-xs">
          {po.items.map((it, i) => (
            <p key={i} className="tabular-nums">
              {it.productName} ({it.receivedQty}/{it.orderedQty})
            </p>
          ))}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Total / Paid',
      align: 'right',
      render: (po) => (
        <div className="tabular-nums text-xs">
          <p className="font-semibold">{formatCurrency(po.totalAmount, currency)}</p>
          <p className="text-[#534245]">Paid {formatCurrency(po.paidAmount, currency)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => <StatusBadge label={po.status} />,
    },
    {
      key: 'receive',
      header: 'Incoming Delivery',
      align: 'right',
      render: (po) =>
        po.status !== 'Received' && po.status !== 'Cancelled' ? (
          <button
            type="button"
            onClick={() => openReceive(po)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer whitespace-nowrap"
          >
            <PackageCheck className="w-3.5 h-3.5" /> Log Delivery
          </button>
        ) : (
          <span className="text-xs text-[#534245]">Completed</span>
        ),
    },
  ];

  const supplierColumns: DataColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Guild / Supplier',
      render: (s) => (
        <div>
          <p className="font-semibold text-[#24211F]">{s.name}</p>
          <p className="text-[11px] text-[#534245]">{s.craftCluster}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (s) => (
        <div className="text-xs">
          <p>{s.contactPerson}</p>
          <p className="text-[#534245]">{s.phone}</p>
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Total Settled',
      align: 'right',
      render: (s) => <span className="tabular-nums text-xs">{formatCurrency(s.totalPaid, currency)}</span>,
    },
    {
      key: 'balance',
      header: 'Outstanding Balance',
      align: 'right',
      render: (s) => (
        <span className={`tabular-nums font-semibold ${s.outstandingBalance > 0 ? 'text-[#8B1E2D]' : 'text-[#1C4A3A]'}`}>
          {formatCurrency(s.outstandingBalance, currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge label={s.active ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'pay',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditSupplier(s)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-[#D8C9B4] text-[#24211F] rounded hover:bg-[#FAF7F2] cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          {s.outstandingBalance > 0 ? (
            <button
              type="button"
              onClick={() => {
                setPaySupplier(s);
                setPayAmount(s.outstandingBalance);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" /> Record Payment
            </button>
          ) : (
            <StatusBadge label="Settled" tone="emerald" />
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Suppliers & Purchase Orders"
      breadcrumbs={[{ label: 'Suppliers & POs' }]}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openNewSupplier}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Weaving Guild
          </button>
          <button
            type="button"
            onClick={() => {
              setPoForm((prev) => ({
                ...prev,
                supplierId: suppliers[0]?.id || '',
                productId: products[0]?.id || '',
              }));
              setPoDrawer(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Purchase Order
          </button>
        </div>
      }
    >
      <div className="inline-flex p-1 bg-white border border-[#D8C9B4] rounded">
        <button
          type="button"
          onClick={() => setTab('po')}
          className={`px-4 py-1.5 text-xs font-semibold rounded cursor-pointer ${
            tab === 'po' ? 'bg-[#641E32] text-white' : 'text-[#534245]'
          }`}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('suppliers')}
          className={`px-4 py-1.5 text-xs font-semibold rounded cursor-pointer ${
            tab === 'suppliers' ? 'bg-[#641E32] text-white' : 'text-[#534245]'
          }`}
        >
          Master Weavers & Suppliers ({suppliers.length})
        </button>
      </div>

      {tab === 'po' ? (
        <DataTable columns={poColumns} data={purchaseOrders} rowKey={(p) => p.id} />
      ) : (
        <DataTable columns={supplierColumns} data={suppliers} rowKey={(s) => s.id} />
      )}

      {/* Receive Incoming Stock Drawer */}
      <SlideOverModal
        open={Boolean(receivePo)}
        onClose={() => setReceivePo(null)}
        title={`Receive Stock: ${receivePo?.poNumber || ''}`}
        subtitle="Receiving units automatically updates product vault inventory."
        size="md"
      >
        {receivePo && (
          <form onSubmit={handleReceiveSubmit} className="space-y-4">
            {receivePo.items.map((item) => (
              <div key={item.productId} className="p-3 border border-[#D8C9B4] rounded space-y-2 text-xs">
                <p className="font-semibold text-[#24211F]">{item.productName}</p>
                <p className="text-[#534245] tabular-nums">
                  Ordered: {item.orderedQty} · Already Received: {item.receivedQty}
                </p>
                <div>
                  <label className="block font-semibold text-[#534245] mb-1">Units Received Now</label>
                  <input
                    type="number"
                    min={0}
                    max={item.orderedQty - item.receivedQty}
                    value={receiveCounts[item.productId] ?? 0}
                    onChange={(e) =>
                      setReceiveCounts({ ...receiveCounts, [item.productId]: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceivePo(null)}
                className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
              >
                Confirm Incoming Stock
              </button>
            </div>
          </form>
        )}
      </SlideOverModal>

      {/* Supplier Payment Drawer */}
      <SlideOverModal
        open={Boolean(paySupplier)}
        onClose={() => setPaySupplier(null)}
        title={`Record Settlement: ${paySupplier?.name || ''}`}
        size="md"
      >
        {paySupplier && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-[#FAF7F2] border border-[#D8C9B4] rounded text-xs flex justify-between">
              <span>Outstanding Balance</span>
              <strong className="text-[#8B1E2D] tabular-nums">
                {formatCurrency(paySupplier.outstandingBalance, currency)}
              </strong>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Payment Amount (₹)</label>
              <input
                required
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaySupplier(null)}
                className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
              >
                Record Payment
              </button>
            </div>
          </form>
        )}
      </SlideOverModal>

      {/* Add / Edit Supplier Drawer */}
      <SlideOverModal
        open={supplierDrawer}
        onClose={() => setSupplierDrawer(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add Master Weaver / Supplier'}
        size="md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Guild / Supplier Name</label>
            <input
              required
              value={supForm.name}
              onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Craft Cluster</label>
            <input
              required
              value={supForm.craftCluster}
              onChange={(e) => setSupForm({ ...supForm, craftCluster: e.target.value })}
              placeholder="e.g. Kanchipuram, Tamil Nadu"
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Contact Person</label>
              <input
                required
                value={supForm.contactPerson}
                onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Phone</label>
              <input
                required
                value={supForm.phone}
                onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Email</label>
            <input
              required
              type="email"
              value={supForm.email}
              onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Notes</label>
            <textarea
              rows={2}
              value={supForm.notes}
              onChange={(e) => setSupForm({ ...supForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={supForm.active}
              onChange={(e) => setSupForm({ ...supForm, active: e.target.checked })}
              className="accent-[#641E32]"
            />
            Supplier guild is currently active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSupplierDrawer(false)}
              className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
            >
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </SlideOverModal>

      {/* New Purchase Order Drawer */}
      <SlideOverModal open={poDrawer} onClose={() => setPoDrawer(false)} title="Create Purchase Order" size="md">
        <form onSubmit={handleCreatePo} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Weaving Guild</label>
            <select
              value={poForm.supplierId}
              onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Saree SKU to Commission</label>
            <select
              value={poForm.productId}
              onChange={(e) => setPoForm({ ...poForm, productId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Ordered Qty</label>
              <input
                required
                type="number"
                min={1}
                value={poForm.orderedQty}
                onChange={(e) => setPoForm({ ...poForm, orderedQty: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Unit Loom Cost (₹)</label>
              <input
                required
                type="number"
                min={0}
                value={poForm.unitCost}
                onChange={(e) => setPoForm({ ...poForm, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Advance Paid (₹)</label>
              <input
                type="number"
                min={0}
                value={poForm.paidAmount}
                onChange={(e) => setPoForm({ ...poForm, paidAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Expected Delivery</label>
              <input
                type="date"
                value={poForm.expectedDate}
                onChange={(e) => setPoForm({ ...poForm, expectedDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">PO Notes</label>
            <textarea
              rows={2}
              value={poForm.notes}
              onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPoDrawer(false)}
              className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
            >
              Issue Purchase Order
            </button>
          </div>
        </form>
      </SlideOverModal>
    </AdminLayout>
  );
};
