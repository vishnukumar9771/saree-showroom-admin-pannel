import React, { useMemo, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatDate, formatDateTime } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Enquiry, EnquiryPriority, EnquiryStatus } from '../../types/domain';

const ENQUIRY_STATUSES: ('All' | EnquiryStatus)[] = [
  'All',
  'New',
  'In Progress',
  'Follow-up',
  'Converted',
  'Resolved',
  'Closed',
];

export const AdminEnquiriesPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const enquiries = adminData?.enquiries || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | EnquiryStatus>('All');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'New' as EnquiryStatus,
    priority: 'High' as EnquiryPriority,
    assignedStaff: 'Concierge Executive',
    followUpDate: '',
    newNote: '',
  });

  const filtered = useMemo(() => {
    return enquiries.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.customerName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.productName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enquiries, statusFilter, search]);

  const openEnquiry = (enq: Enquiry) => {
    setSelected(enq);
    setEditForm({
      status: enq.status,
      priority: enq.priority,
      assignedStaff: enq.assignedStaff,
      followUpDate: enq.followUpDate || '',
      newNote: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const res = await apiRequest<{ enquiry: Enquiry }>(`/api/admin/enquiries/${selected.id}`, {
      method: 'PUT',
      body: JSON.stringify(editForm),
    });
    setSelected(res.enquiry);
    setEditForm((prev) => ({ ...prev, newNote: '' }));
    await refreshAdminData();
  };

  const columns: DataColumn<Enquiry>[] = [
    {
      key: 'patron',
      header: 'Patron',
      render: (e) => (
        <div>
          <p className="font-semibold text-[#24211F]">{e.customerName}</p>
          <p className="text-[11px] text-[#534245]">{e.phone} · {e.email}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type & Saree',
      render: (e) => (
        <div className="text-xs">
          <p className="font-medium text-[#641E32]">{e.enquiryType}</p>
          <p className="text-[#534245] truncate max-w-[220px]">{e.productName || 'General Salon Consultation'}</p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (e) => (
        <StatusBadge label={e.priority} tone={e.priority === 'High' ? 'crimson' : e.priority === 'Medium' ? 'ochre' : 'neutral'} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge label={e.status} />,
    },
    {
      key: 'assigned',
      header: 'Assigned To',
      render: (e) => <span className="text-xs text-[#24211F]">{e.assignedStaff}</span>,
    },
    {
      key: 'date',
      header: 'Logged',
      render: (e) => <span className="text-xs text-[#534245] tabular-nums">{formatDate(e.createdAt)}</span>,
    },
  ];

  return (
    <AdminLayout title="Bridal & Bespoke Enquiries" breadcrumbs={[{ label: 'Enquiries' }]}>
      <div className="bg-white border border-[#D8C9B4] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#867275] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patron or saree..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#D8C9B4] rounded"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENQUIRY_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#641E32] text-white border-[#641E32]'
                  : 'bg-[#FAF7F2] text-[#534245] border-[#D8C9B4]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(e) => e.id} onRowClick={openEnquiry} />

      <SlideOverModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Enquiry: ${selected.customerName}` : ''}
        subtitle={selected ? `${selected.enquiryType} · ${formatDateTime(selected.createdAt)}` : ''}
      >
        {selected && (
          <div className="space-y-5">
            <div className="p-4 bg-[#FAF7F2] border border-[#D8C9B4] rounded space-y-2 text-xs">
              <p className="font-semibold text-[#641E32] inline-flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Patron Message
              </p>
              <p className="text-sm text-[#24211F] leading-relaxed">{selected.message}</p>
              <p className="text-[#534245]">
                Contact: {selected.phone} · {selected.email}
              </p>
              {selected.productName && <p className="text-[#641E32] font-medium">Saree: {selected.productName}</p>}
            </div>

            <form onSubmit={handleSave} className="space-y-3 border border-[#D8C9B4] rounded p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as EnquiryStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
                  >
                    {ENQUIRY_STATUSES.filter((s) => s !== 'All').map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as EnquiryPriority })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Assigned Staff</label>
                  <input
                    value={editForm.assignedStaff}
                    onChange={(e) => setEditForm({ ...editForm, assignedStaff: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={editForm.followUpDate}
                    onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Add Follow-up Note</label>
                <textarea
                  rows={2}
                  value={editForm.newNote}
                  onChange={(e) => setEditForm({ ...editForm, newNote: e.target.value })}
                  placeholder="Log call summary, blouse measurement status, or appointment details..."
                  className="w-full px-3 py-2 text-xs border border-[#D8C9B4] rounded"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
                >
                  Save & Log Update
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#641E32]">Follow-up Notes ({selected.notes.length})</p>
              <div className="divide-y divide-[#EEE7E3] border border-[#D8C9B4] rounded">
                {selected.notes.length === 0 ? (
                  <p className="p-4 text-xs text-[#534245]">No notes logged yet.</p>
                ) : (
                  selected.notes.map((n) => (
                    <div key={n.id} className="p-3 text-xs space-y-1">
                      <div className="flex justify-between text-[11px] text-[#534245]">
                        <strong>{n.author}</strong>
                        <span className="tabular-nums">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p className="text-[#24211F]">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverModal>
    </AdminLayout>
  );
};
