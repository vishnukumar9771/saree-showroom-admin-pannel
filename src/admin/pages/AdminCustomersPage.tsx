import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency, formatDate } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Customer, CustomerSegment } from '../../types/domain';

export const AdminCustomersPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const customers = adminData?.customers || [];
  const orders = adminData?.orders || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'All' | CustomerSegment>('All');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [notes, setNotes] = useState('');
  const [segment, setSegment] = useState<CustomerSegment>('New');

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (segmentFilter !== 'All' && c.segment !== segmentFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, segmentFilter, search]);

  const openProfile = (c: Customer) => {
    setSelected(c);
    setNotes(c.notes);
    setSegment(c.segment);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const res = await apiRequest<{ customer: Customer }>(`/api/admin/customers/${selected.id}`, {
      method: 'PUT',
      body: JSON.stringify({ notes, segment }),
    });
    setSelected(res.customer);
    await refreshAdminData();
  };

  const customerOrders = useMemo(() => {
    if (!selected) return [];
    return orders.filter((o) => o.customerId === selected.id || o.customerEmail === selected.email);
  }, [selected, orders]);

  const columns: DataColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Patron',
      render: (c) => (
        <div>
          <p className="font-semibold text-[#24211F]">{c.name}</p>
          <p className="text-[11px] text-[#534245]">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Phone & City',
      render: (c) => (
        <div className="text-xs">
          <p>{c.phone}</p>
          <p className="text-[#534245]">{c.city}</p>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (c) => <StatusBadge label={c.segment} tone={c.segment === 'VIP Collector' ? 'emerald' : 'slate'} />,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (c) => <span className="tabular-nums font-medium">{c.ordersCount}</span>,
    },
    {
      key: 'spent',
      header: 'Total Spending',
      align: 'right',
      render: (c) => <span className="tabular-nums font-semibold">{formatCurrency(c.totalSpent, currency)}</span>,
    },
    {
      key: 'last',
      header: 'Last Order',
      render: (c) => <span className="text-xs text-[#534245] tabular-nums">{formatDate(c.lastOrderDate)}</span>,
    },
  ];

  return (
    <AdminLayout title="Customers & Collectors" breadcrumbs={[{ label: 'Customers' }]}>
      <div className="bg-white border border-[#D8C9B4] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#867275] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patron, email, city..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#D8C9B4] rounded"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'VIP Collector', 'Bridal Patron', 'Repeat Buyer', 'New'] as const).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => setSegmentFilter(seg)}
              className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                segmentFilter === seg
                  ? 'bg-[#641E32] text-white border-[#641E32]'
                  : 'bg-[#FAF7F2] text-[#534245] border-[#D8C9B4]'
              }`}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(c) => c.id} onRowClick={openProfile} />

      <SlideOverModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        subtitle={selected ? `${selected.city} · Member since ${formatDate(selected.createdAt)}` : ''}
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 bg-[#FAF7F2] border border-[#D8C9B4] rounded p-4 text-xs">
              <div>
                <span className="text-[#534245] block">Total Spent</span>
                <strong className="text-base tabular-nums text-[#641E32]">
                  {formatCurrency(selected.totalSpent, currency)}
                </strong>
              </div>
              <div>
                <span className="text-[#534245] block">Orders</span>
                <strong className="text-base tabular-nums">{selected.ordersCount}</strong>
              </div>
              <div>
                <span className="text-[#534245] block">Last Order</span>
                <strong className="text-sm tabular-nums">{formatDate(selected.lastOrderDate)}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 border border-[#D8C9B4] rounded p-4">
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Patron Segment</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as CustomerSegment)}
                  className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
                >
                  <option value="VIP Collector">VIP Collector</option>
                  <option value="Bridal Patron">Bridal Patron</option>
                  <option value="Repeat Buyer">Repeat Buyer</option>
                  <option value="New">New</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Concierge & Preference Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
                >
                  Save Profile Notes
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#641E32]">Order History ({customerOrders.length})</p>
              <div className="divide-y divide-[#EEE7E3] border border-[#D8C9B4] rounded">
                {customerOrders.map((o) => (
                  <div key={o.id} className="px-4 py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-mono font-semibold text-[#641E32]">{o.orderNumber}</p>
                      <p className="text-[#534245]">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold tabular-nums">{formatCurrency(o.totalAmount, currency)}</p>
                      <StatusBadge label={o.fulfillmentStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverModal>
    </AdminLayout>
  );
};
