import React, { useMemo, useState } from 'react';
import { FileText, Printer, Search, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { SafeImage } from '../components/SafeImage';
import type { Order, OrderStatus, PaymentStatus } from '../../types/domain';

const ALL_STATUSES: ('All' | OrderStatus)[] = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Return requested',
];

export const AdminOrdersPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const orders = adminData?.orders || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | OrderStatus>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const [editState, setEditState] = useState({
    fulfillmentStatus: 'Pending' as OrderStatus,
    paymentStatus: 'Paid' as PaymentStatus,
    trackingNumber: '',
    courierPartner: '',
    cancellationReason: '',
    note: '',
  });

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusTab !== 'All' && o.fulfillmentStatus !== statusTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusTab, search]);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditState({
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber || '',
      courierPartner: order.courierPartner || 'BlueDart Heritage Insured',
      cancellationReason: order.cancellationReason || '',
      note: '',
    });
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const res = await apiRequest<{ order: Order }>(`/api/admin/orders/${selectedOrder.id}`, {
      method: 'PUT',
      body: JSON.stringify(editState),
    });
    setSelectedOrder(res.order);
    await refreshAdminData();
  };

  const columns: DataColumn<Order>[] = [
    {
      key: 'order',
      header: 'Order ID',
      render: (o) => (
        <div>
          <p className="font-mono font-semibold text-[#641E32]">{o.orderNumber}</p>
          <p className="text-[11px] text-[#534245] tabular-nums">{formatDate(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Patron',
      render: (o) => (
        <div>
          <p className="font-medium text-[#24211F]">{o.customerName}</p>
          <p className="text-[11px] text-[#534245]">{o.shippingAddress.city}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Sarees',
      render: (o) => (
        <span className="text-xs text-[#534245] tabular-nums">
          {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Total',
      align: 'right',
      render: (o) => <span className="tabular-nums font-semibold">{formatCurrency(o.totalAmount, currency)}</span>,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (o) => (
        <div className="space-y-0.5">
          <StatusBadge label={o.paymentStatus} />
          <p className="text-[10px] text-[#534245]">{o.paymentMethod}</p>
        </div>
      ),
    },
    {
      key: 'fulfillment',
      header: 'Fulfillment',
      render: (o) => <StatusBadge label={o.fulfillmentStatus} />,
    },
    {
      key: 'actions',
      header: 'Invoice',
      align: 'right',
      render: (o) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInvoiceOrder(o);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#641E32] hover:underline cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" /> Invoice
        </button>
      ),
    },
  ];

  return (
    <AdminLayout title="Orders & Fulfillment" breadcrumbs={[{ label: 'Orders' }]}>
      <div className="bg-white border border-[#D8C9B4] rounded p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#867275] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, patron, email..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusTab(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer whitespace-nowrap ${
                  statusTab === st
                    ? 'bg-[#641E32] text-white border-[#641E32]'
                    : 'bg-[#FAF7F2] text-[#534245] border-[#D8C9B4]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(o) => o.id} onRowClick={openOrder} />

      {/* Order Details Slide-Over */}
      <SlideOverModal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : ''}
        subtitle={selectedOrder ? `Placed ${formatDateTime(selectedOrder.createdAt)}` : ''}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF7F2] border border-[#D8C9B4] rounded p-4 text-xs">
              <div>
                <p className="font-semibold text-[#641E32] mb-1">Patron Details</p>
                <p className="font-semibold text-[#24211F]">{selectedOrder.customerName}</p>
                <p className="text-[#534245]">{selectedOrder.customerEmail}</p>
                <p className="text-[#534245]">{selectedOrder.customerPhone}</p>
              </div>
              <div>
                <p className="font-semibold text-[#641E32] mb-1">Shipping Destination</p>
                <p className="text-[#24211F]">{selectedOrder.shippingAddress.line1}</p>
                <p className="text-[#534245]">
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                  {selectedOrder.shippingAddress.postalCode}
                </p>
                <p className="text-[#534245]">{selectedOrder.shippingAddress.country}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-[#D8C9B4] rounded overflow-hidden">
              <div className="px-4 py-2 bg-[#FAF7F2] border-b border-[#D8C9B4] text-xs font-semibold text-[#641E32]">
                Order Line Items
              </div>
              <div className="divide-y divide-[#EEE7E3]">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="p-3 flex items-center gap-3 text-xs">
                    <SafeImage
                      src={item.image}
                      alt={item.productName}
                      className="w-10 h-[52px] object-cover rounded border border-[#D8C9B4] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#24211F] truncate">{item.productName}</p>
                      <p className="font-mono text-[11px] text-[#534245]">
                        {item.sku} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="tabular-nums font-semibold">
                      {formatCurrency(item.price * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#FAF7F2] border-t border-[#D8C9B4] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(selectedOrder.subtotal, currency)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-[#1C4A3A]">
                    <span>Discount ({selectedOrder.couponCode})</span>
                    <span className="tabular-nums">−{formatCurrency(selectedOrder.discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST</span>
                  <span className="tabular-nums">{formatCurrency(selectedOrder.gstAmount, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#D8C9B4]">
                  <span>Total Amount</span>
                  <span className="tabular-nums text-[#641E32]">
                    {formatCurrency(selectedOrder.totalAmount, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fulfillment & Tracking Form */}
            <form onSubmit={handleSaveOrder} className="border border-[#D8C9B4] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#641E32] inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> Fulfillment, Tracking & Status
                </p>
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(selectedOrder)}
                  className="text-xs font-semibold text-[#641E32] hover:underline cursor-pointer"
                >
                  Open GST Invoice
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Fulfillment Status</label>
                  <select
                    value={editState.fulfillmentStatus}
                    onChange={(e) => setEditState({ ...editState, fulfillmentStatus: e.target.value as OrderStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
                  >
                    {ALL_STATUSES.filter((s) => s !== 'All').map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Payment Status</label>
                  <select
                    value={editState.paymentStatus}
                    onChange={(e) => setEditState({ ...editState, paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="COD Due">COD Due</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Courier Partner</label>
                  <input
                    value={editState.courierPartner}
                    onChange={(e) => setEditState({ ...editState, courierPartner: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Tracking Number</label>
                  <input
                    value={editState.trackingNumber}
                    onChange={(e) => setEditState({ ...editState, trackingNumber: e.target.value })}
                    placeholder="e.g. BD-884910234IN"
                    className="w-full px-3 py-2 text-xs font-mono border border-[#D8C9B4] rounded"
                  />
                </div>
              </div>
              {editState.fulfillmentStatus === 'Cancelled' && (
                <div>
                  <label className="block text-xs font-semibold text-[#8B1E2D] mb-1">Cancellation Reason</label>
                  <input
                    value={editState.cancellationReason}
                    onChange={(e) => setEditState({ ...editState, cancellationReason: e.target.value })}
                    placeholder="Reason for order cancellation..."
                    className="w-full px-3 py-2 text-xs border border-[#E8A2AA] rounded"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Audit Note</label>
                <input
                  value={editState.note}
                  onChange={(e) => setEditState({ ...editState, note: e.target.value })}
                  placeholder="Optional log entry for order timeline..."
                  className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
                >
                  Update Order
                </button>
              </div>
            </form>

            {/* Order Timeline */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#641E32]">Order Audit History</p>
              <div className="divide-y divide-[#EEE7E3] border border-[#D8C9B4] rounded">
                {selectedOrder.history.map((h, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#24211F]">{h.status}</span>
                      <span className="text-[#534245]"> — {h.note}</span>
                      <span className="text-[11px] text-[#867275] ml-2">({h.updatedBy})</span>
                    </div>
                    <span className="text-[11px] text-[#867275] tabular-nums">{formatDateTime(h.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverModal>

      {/* Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1422]/45 backdrop-blur-[4px] p-4">
          <div className="bg-white border border-[#C3A46C] rounded max-w-2xl w-full p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-[#D8C9B4] pb-4">
              <div>
                <p className="font-serif text-2xl font-semibold tracking-[0.12em] text-[#3B1422]">AARANYA</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#C3A46C]">
                  The House of Indian Silks · Tax Invoice
                </p>
                <p className="text-xs text-[#534245] mt-2">
                  GSTIN: {adminData?.settings.gstConfig.gstin} · HSN: {adminData?.settings.gstConfig.hsnCode}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono font-bold text-[#641E32]">{invoiceOrder.orderNumber}</p>
                <p className="text-[#534245]">{formatDate(invoiceOrder.createdAt)}</p>
              </div>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-[#534245]">Billed & Shipped To:</p>
              <p className="font-semibold text-[#24211F] mt-1">{invoiceOrder.customerName}</p>
              <p className="text-[#534245]">
                {invoiceOrder.shippingAddress.line1}, {invoiceOrder.shippingAddress.city},{' '}
                {invoiceOrder.shippingAddress.state} {invoiceOrder.shippingAddress.postalCode}
              </p>
            </div>
            <table className="w-full text-xs border-t border-b border-[#D8C9B4]">
              <thead>
                <tr className="bg-[#FAF7F2] text-[#641E32]">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEE7E3]">
                {invoiceOrder.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5">
                      {it.productName} <span className="font-mono text-[#534245]">({it.sku})</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{it.quantity}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(it.price * it.quantity, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs space-y-1 text-right">
              <p>Subtotal: {formatCurrency(invoiceOrder.subtotal, currency)}</p>
              {invoiceOrder.discountAmount > 0 && (
                <p className="text-[#1C4A3A]">Discount: −{formatCurrency(invoiceOrder.discountAmount, currency)}</p>
              )}
              <p>Silk GST ({adminData?.settings.gstConfig.silkTaxRatePercent}%): {formatCurrency(invoiceOrder.gstAmount, currency)}</p>
              <p className="text-base font-bold text-[#641E32] pt-1">
                Invoice Total: {formatCurrency(invoiceOrder.totalAmount, currency)}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
