import React, { useState } from 'react';
import { Edit, Layers, Plus, Star, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { SAREE_IMAGES } from '../../data/seedData';
import { slugify } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SafeImage } from '../components/SafeImage';
import type { Collection } from '../../types/domain';

const COVER_OPTIONS = [
  { label: 'Banarasi Burgundy', url: SAREE_IMAGES.banarasiBurgundy },
  { label: 'Kanjeevaram Ivory', url: SAREE_IMAGES.kanjeevaramIvory },
  { label: 'Tussar Ochre', url: SAREE_IMAGES.tussarOchre },
  { label: 'Chanderi Emerald', url: SAREE_IMAGES.chanderiEmerald },
  { label: 'Atelier Heritage', url: SAREE_IMAGES.heroAtelier },
];

export const AdminCollectionsPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const collections = [...(adminData?.collections || [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const products = adminData?.products || [];

  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Hidden'>('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const visibleCollections =
    statusFilter === 'All' ? collections : collections.filter((c) => c.status === statusFilter);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    coverImage: SAREE_IMAGES.banarasiBurgundy,
    displayOrder: 1,
    featured: true,
    status: 'Active' as 'Active' | 'Hidden',
    productIds: [] as string[],
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      coverImage: SAREE_IMAGES.banarasiBurgundy,
      displayOrder: collections.length + 1,
      featured: true,
      status: 'Active',
      productIds: [],
    });
    setDrawerOpen(true);
  };

  const openEdit = (col: Collection) => {
    setEditing(col);
    const assigned = products.filter((p) => p.collectionId === col.id).map((p) => p.id);
    setForm({
      name: col.name,
      slug: col.slug,
      description: col.description,
      coverImage: col.coverImage,
      displayOrder: col.displayOrder,
      featured: col.featured,
      status: col.status,
      productIds: assigned.length > 0 ? assigned : col.productIds,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiRequest(`/api/admin/collections/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest('/api/admin/collections', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    await refreshAdminData();
    setDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/collections/${id}`, { method: 'DELETE' });
    await refreshAdminData();
  };

  const toggleProduct = (pid: string) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter((id) => id !== pid)
        : [...prev.productIds, pid],
    }));
  };

  return (
    <AdminLayout
      title="Collections Management"
      breadcrumbs={[{ label: 'Collections' }]}
      actions={
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Collection
        </button>
      }
    >
      <div className="inline-flex p-1 bg-white border border-[#D8C9B4] rounded">
        {(['All', 'Active', 'Hidden'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded cursor-pointer ${
              statusFilter === tab ? 'bg-[#641E32] text-white' : 'text-[#534245]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleCollections.map((col) => {
          const assignedCount = products.filter((p) => p.collectionId === col.id).length;
          return (
            <div key={col.id} className="bg-white border border-[#D8C9B4] rounded overflow-hidden flex flex-col">
              <div className="aspect-[16/9] bg-[#FAF7F2] relative">
                <SafeImage src={col.coverImage} alt={col.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <StatusBadge label={col.status} />
                </div>
                <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#3B1422]/85 text-[#C3A46C] text-[10px] font-mono rounded">
                  Order #{col.displayOrder}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-lg font-semibold text-[#24211F]">{col.name}</h3>
                    {col.featured && <Star className="w-4 h-4 text-[#C3A46C] fill-[#C3A46C] shrink-0" />}
                  </div>
                  <p className="text-xs text-[#534245] mt-1.5 line-clamp-2">{col.description}</p>
                  <p className="text-[11px] text-[#641E32] font-medium mt-2 tabular-nums">
                    {assignedCount} sarees assigned
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#EEE7E3]">
                  <button
                    type="button"
                    onClick={() => openEdit(col)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#641E32] hover:underline cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit & Assign Sarees
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(col.id)}
                    className="p-1.5 text-[#8B1E2D] hover:bg-[#FBECEE] rounded cursor-pointer"
                    aria-label="Delete collection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SlideOverModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit Collection: ${editing.name}` : 'Create Collection'}
        subtitle="Configure curatorial details, order, and assigned sarees."
      >
        <form id="collection-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Collection Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Display Order</label>
              <input
                type="number"
                min={1}
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Hidden' })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Active">Active</option>
                <option value="Hidden">Hidden</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#534245]">Cover Image</label>
            <select
              value={COVER_OPTIONS.some((o) => o.url === form.coverImage) ? form.coverImage : ''}
              onChange={(e) => {
                if (e.target.value) setForm({ ...form, coverImage: e.target.value });
              }}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
            >
              <option value="">Choose studio preset or enter custom URL below...</option>
              {COVER_OPTIONS.map((opt) => (
                <option key={opt.url} value={opt.url}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="Or paste custom cover image URL / path..."
              className="w-full px-3 py-1.5 text-xs font-mono border border-[#D8C9B4] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[#24211F] cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="accent-[#641E32]"
            />
            Feature this collection on Homepage
          </label>

          <div className="border-t border-[#EEE7E3] pt-4">
            <p className="text-xs font-semibold text-[#641E32] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Assign Sarees to Collection
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto border border-[#D8C9B4] rounded p-3">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-3 text-xs cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="accent-[#641E32]"
                  />
                  <span className="font-medium text-[#24211F] flex-1 truncate">{p.name}</span>
                  <span className="font-mono text-[11px] text-[#534245]">{p.sku}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="collection-form"
            className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
          >
            Save Collection
          </button>
        </div>
      </SlideOverModal>
    </AdminLayout>
  );
};
