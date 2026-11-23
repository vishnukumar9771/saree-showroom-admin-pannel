import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Edit, Eye, EyeOff, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SafeImage } from '../components/SafeImage';
import type { Product, ProductStatus } from '../../types/domain';

export const AdminProductsPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'oos'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'price-asc' | 'price-desc' | 'stock-asc'>('updated');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const pageSize = 8;

  const products = adminData?.products || [];
  const categories = adminData?.categories || [];
  const collections = adminData?.collections || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const colMap = new Map(collections.map((c) => [c.id, c.name]));

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
        if (collectionFilter !== 'all' && p.collectionId !== collectionFilter) return false;
        if (stockFilter === 'oos' && p.stockQuantity !== 0) return false;
        if (stockFilter === 'low' && (p.stockQuantity === 0 || p.stockQuantity > p.lowStockThreshold)) return false;
        if (stockFilter === 'in-stock' && p.stockQuantity <= p.lowStockThreshold) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.fabric.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'stock-asc') return a.stockQuantity - b.stockQuantity;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [products, statusFilter, stockFilter, categoryFilter, collectionFilter, search, sortBy]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allVisibleSelected = paginated.length > 0 && paginated.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(paginated.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...paginated.map((p) => p.id)])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runBulkAction = async (action: 'publish' | 'unpublish' | 'archive' | 'delete') => {
    if (selectedIds.length === 0) return;
    setActionError('');
    setBulkBusy(true);
    try {
      await apiRequest('/api/admin/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      setSelectedIds([]);
      await refreshAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Bulk action failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const togglePublish = async (product: Product) => {
    setActionError('');
    const nextStatus: ProductStatus = product.status === 'Published' ? 'Draft' : 'Published';
    try {
      await apiRequest(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update product publish status.');
    }
  };

  const duplicateProduct = async (product: Product) => {
    setActionError('');
    try {
      await apiRequest('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          ...product,
          name: `${product.name} (Copy)`,
          sku: `${product.sku}-COPY-${Math.floor(100 + Math.random() * 899)}`,
          slug: `${product.slug}-copy-${Date.now().toString().slice(-4)}`,
          status: 'Draft',
        }),
      });
      await refreshAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not duplicate product.');
    }
  };

  const deleteProduct = async (product: Product) => {
    setActionError('');
    try {
      await apiRequest(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      setSelectedIds((prev) => prev.filter((id) => id !== product.id));
      await refreshAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete product.');
    }
  };

  const columns: DataColumn<Product>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={toggleSelectAll}
          aria-label="Select all visible products"
          className="accent-[#641E32] cursor-pointer"
        />
      ),
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.includes(p.id)}
            onChange={() => toggleSelectRow(p.id)}
            aria-label={`Select ${p.name}`}
            className="accent-[#641E32] cursor-pointer"
          />
        </div>
      ),
    },
    {
      key: 'saree',
      header: 'Saree',
      render: (p) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <SafeImage
            src={p.images[0]}
            alt={p.name}
            className="w-10 h-[52px] object-cover rounded border border-[#D8C9B4] shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-[#24211F] truncate max-w-[240px]">{p.name}</p>
            <p className="text-[11px] font-mono text-[#534245]">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'classification',
      header: 'Category & Collection',
      render: (p) => (
        <div className="text-xs">
          <p className="font-medium text-[#24211F]">{catMap.get(p.categoryId) || '—'}</p>
          <p className="text-[11px] text-[#534245]">{colMap.get(p.collectionId) || '—'}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price / MRP',
      align: 'right',
      render: (p) => (
        <div className="tabular-nums">
          <p className="font-semibold text-[#24211F]">{formatCurrency(p.sellingPrice, currency)}</p>
          {p.mrp > p.sellingPrice && (
            <p className="text-[11px] text-[#867275] line-through">{formatCurrency(p.mrp, currency)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (p) => (
        <span
          className={`tabular-nums font-semibold ${
            p.stockQuantity === 0
              ? 'text-[#8B1E2D]'
              : p.stockQuantity <= p.lowStockThreshold
                ? 'text-[#7A5212]'
                : 'text-[#1C4A3A]'
          }`}
        >
          {p.stockQuantity}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge label={p.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => togglePublish(p)}
            title={p.status === 'Published' ? 'Move to Draft' : 'Publish product'}
            className="p-1.5 text-[#534245] hover:text-[#641E32] cursor-pointer"
          >
            {p.status === 'Published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/products/${p.id}/edit`)}
            title="Edit saree"
            className="p-1.5 text-[#534245] hover:text-[#641E32] cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => duplicateProduct(p)}
            title="Duplicate saree"
            className="p-1.5 text-[#534245] hover:text-[#641E32] cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => deleteProduct(p)}
            title="Delete saree"
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
      title="Products Catalog"
      breadcrumbs={[{ label: 'Products' }]}
      actions={
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </Link>
      }
    >
      {actionError && (
        <div className="p-3 bg-[#FBECEE] border border-[#8B1E2D]/30 text-[#8B1E2D] text-xs rounded flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-[#D8C9B4] rounded p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#867275] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, SKU, fabric..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={collectionFilter}
          onChange={(e) => {
            setCollectionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
        >
          <option value="all">All Collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>
        <select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value as typeof stockFilter);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
        >
          <option value="all">All Stock Levels</option>
          <option value="in-stock">Healthy Stock</option>
          <option value="low">Low Stock</option>
          <option value="oos">Out of Stock</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 text-xs border border-[#D8C9B4] rounded bg-white"
        >
          <option value="updated">Recently Updated</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="stock-asc">Stock: Low to High</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#FAF3E7] border border-[#C3A46C] rounded px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#3B1422] tabular-nums">
            {selectedIds.length} saree{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulkAction('publish')}
              className="px-3 py-1.5 text-xs font-semibold bg-[#1C4A3A] text-white rounded hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              Publish Selected
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulkAction('unpublish')}
              className="px-3 py-1.5 text-xs font-semibold border border-[#D8C9B4] bg-white text-[#24211F] rounded hover:bg-[#FAF7F2] cursor-pointer disabled:opacity-50"
            >
              Move to Draft
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulkAction('archive')}
              className="px-3 py-1.5 text-xs font-semibold border border-[#D8C9B4] bg-white text-[#24211F] rounded hover:bg-[#FAF7F2] cursor-pointer disabled:opacity-50"
            >
              Archive
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulkAction('delete')}
              className="px-3 py-1.5 text-xs font-semibold bg-[#8B1E2D] text-white rounded hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              Delete Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs text-[#534245] hover:text-[#641E32] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginated}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/admin/products/${p.id}/edit`)}
        page={page}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="No sarees found"
        emptyDescription="Create a new saree listing or clear your active filters."
      />
    </AdminLayout>
  );
};
