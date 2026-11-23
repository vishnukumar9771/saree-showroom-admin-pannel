import React, { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { SAREE_IMAGES } from '../../data/seedData';
import { slugify } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SafeImage } from '../components/SafeImage';
import type { Category } from '../../types/domain';

const IMAGE_OPTIONS = [
  { label: 'Kanjeevaram Ivory', url: SAREE_IMAGES.kanjeevaramIvory },
  { label: 'Banarasi Burgundy', url: SAREE_IMAGES.banarasiBurgundy },
  { label: 'Tussar Ochre', url: SAREE_IMAGES.tussarOchre },
  { label: 'Chanderi Emerald', url: SAREE_IMAGES.chanderiEmerald },
];

export const AdminCategoriesPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const categories = [...(adminData?.categories || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const products = adminData?.products || [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: SAREE_IMAGES.kanjeevaramIvory,
    sortOrder: 1,
    status: 'Active' as 'Active' | 'Inactive',
    productIds: [] as string[],
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      image: SAREE_IMAGES.kanjeevaramIvory,
      sortOrder: categories.length + 1,
      status: 'Active',
      productIds: [],
    });
    setDrawerOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      sortOrder: cat.sortOrder,
      status: cat.status || 'Active',
      productIds: products.filter((p) => p.categoryId === cat.id).map((p) => p.id),
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiRequest(`/api/admin/categories/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    await refreshAdminData();
    setDrawerOpen(false);
  };

  const toggleStatus = async (cat: Category) => {
    await apiRequest(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: cat.status === 'Active' ? 'Inactive' : 'Active' }),
    });
    await refreshAdminData();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' });
    await refreshAdminData();
  };

  const columns: DataColumn<Category>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (c) => (
        <div className="flex items-center gap-3">
          <SafeImage
            src={c.image}
            alt={c.name}
            className="w-10 h-[52px] object-cover rounded border border-[#D8C9B4] shrink-0"
          />
          <div>
            <p className="font-semibold text-[#24211F]">{c.name}</p>
            <p className="text-[11px] font-mono text-[#534245]">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (c) => <p className="text-xs text-[#534245] max-w-md line-clamp-2">{c.description}</p>,
    },
    {
      key: 'count',
      header: 'Sarees',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums font-semibold">
          {products.filter((p) => p.categoryId === c.id).length}
        </span>
      ),
    },
    {
      key: 'sort',
      header: 'Sort Order',
      align: 'right',
      render: (c) => <span className="tabular-nums font-mono">{c.sortOrder}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <button type="button" onClick={() => toggleStatus(c)} className="cursor-pointer" title="Toggle status">
          <StatusBadge label={c.status || 'Active'} />
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEdit(c)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#641E32] hover:underline cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c.id)}
            aria-label={`Delete ${c.name}`}
            className="p-1.5 text-[#8B1E2D] hover:bg-[#FBECEE] rounded cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Silk Categories"
      breadcrumbs={[{ label: 'Categories' }]}
      actions={
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      }
    >
      <DataTable columns={columns} data={categories} rowKey={(c) => c.id} />

      <SlideOverModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit Category: ${editing.name}` : 'New Silk Category'}
      >
        <form id="category-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#534245] mb-1">Category Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Sort Order</label>
              <input
                type="number"
                min={1}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#534245]">Category Image</label>
            <select
              value={IMAGE_OPTIONS.some((o) => o.url === form.image) ? form.image : ''}
              onChange={(e) => {
                if (e.target.value) setForm({ ...form, image: e.target.value });
              }}
              className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
            >
              <option value="">Choose studio preset or enter custom URL below...</option>
              {IMAGE_OPTIONS.map((opt) => (
                <option key={opt.url} value={opt.url}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="Or paste custom image URL / path..."
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
          <div className="border-t border-[#EEE7E3] pt-3">
            <p className="text-xs font-semibold text-[#641E32] mb-2">Assigned Products</p>
            <div className="space-y-2 max-h-56 overflow-y-auto border border-[#D8C9B4] rounded p-3">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-3 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p.id)}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        productIds: prev.productIds.includes(p.id)
                          ? prev.productIds.filter((id) => id !== p.id)
                          : [...prev.productIds, p.id],
                      }))
                    }
                    className="accent-[#641E32]"
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-mono text-[#534245]">{p.sku}</span>
                </label>
              ))}
            </div>
          </div>
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
              Save Category
            </button>
          </div>
        </form>
      </SlideOverModal>
    </AdminLayout>
  );
};
