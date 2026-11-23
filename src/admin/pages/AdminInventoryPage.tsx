import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { SafeImage } from '../components/SafeImage';
import type { Product, StockMovement } from '../../types/domain';

export const AdminInventoryPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const products = adminData?.products || [];
  const categories = adminData?.categories || [];
  const movements = adminData?.stockMovements || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'oos' | 'healthy'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    mode: 'Add' as 'Add' | 'Remove' | 'Set',
    quantity: 3,
    lowStockThreshold: 3,
    reason: 'Weaving Guild Restock',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.stockQuantity, 0);
    const totalValuation = products.reduce((s, p) => s + p.stockQuantity * p.sellingPrice, 0);
    const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;
    const outOfStock = products.filter((p) => p.stockQuantity === 0).length;
    return { totalUnits, totalValuation, lowStock, outOfStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (stockFilter === 'oos' && p.stockQuantity !== 0) return false;
      if (stockFilter === 'low' && (p.stockQuantity === 0 || p.stockQuantity > p.lowStockThreshold)) return false;
      if (stockFilter === 'healthy' && p.stockQuantity <= p.lowStockThreshold) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, stockFilter, search]);

  const openAdjust = (product: Product) => {
    setSelectedProduct(product);
    setAdjustForm({
      mode: 'Add',
      quantity: 3,
      lowStockThreshold: product.lowStockThreshold,
      reason: 'Loom Restock Delivery',
      notes: '',
    });
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await apiRequest('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          ...adjustForm,
        }),
      });
      await refreshAdminData();
      setSelectedProduct(null);
    } finally {
      setSaving(false);
    }
  };

  const productColumns: DataColumn<Product>[] = [
    {
      key: 'saree',
      header: 'Saree',
      render: (p) => (
        <div className="flex items-center gap-3">
          <SafeImage
            src={p.images[0]}
            alt={p.name}
            className="w-10 h-[52px] object-cover rounded border border-[#D8C9B4] shrink-0"
          />
          <div>
            <p className="font-semibold text-[#24211F]">{p.name}</p>
            <p className="text-[11px] font-mono text-[#534245]">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => <span className="text-xs text-[#534245]">{catMap.get(p.categoryId) || '—'}</span>,
    },
    {
      key: 'stock',
      header: 'Current Stock',
      align: 'right',
      render: (p) => <span className="tabular-nums font-bold text-base">{p.stockQuantity}</span>,
    },
    {
      key: 'threshold',
      header: 'Alert Threshold',
      align: 'right',
      render: (p) => <span className="tabular-nums text-[#534245]">{p.lowStockThreshold}</span>,
    },
    {
      key: 'value',
      header: 'Vault Value',
      align: 'right',
      render: (p) => (
        <span className="tabular-nums font-medium">{formatCurrency(p.stockQuantity * p.sellingPrice, currency)}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Last Updated',
      render: (p) => <span className="text-xs text-[#534245] tabular-nums">{formatDateTime(p.updatedAt)}</span>,
    },
    {
      key: 'health',
      header: 'Status',
      render: (p) => (
        <StatusBadge
          label={p.stockQuantity === 0 ? 'Out of Stock' : p.stockQuantity <= p.lowStockThreshold ? 'Low Stock' : 'Active'}
        />
      ),
    },
    {
      key: 'action',
      header: 'Adjustment',
      align: 'right',
      render: (p) => (
        <button
          type="button"
          onClick={() => openAdjust(p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer whitespace-nowrap"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Adjust / Restock
        </button>
      ),
    },
  ];

  const movementColumns: DataColumn<StockMovement>[] = [
    {
      key: 'date',
      header: 'Timestamp',
      render: (m) => <span className="text-xs text-[#534245] tabular-nums">{formatDateTime(m.createdAt)}</span>,
    },
    {
      key: 'product',
      header: 'Saree / SKU',
      render: (m) => (
        <div>
          <p className="font-medium text-[#24211F]">{m.productName}</p>
          <p className="text-[11px] font-mono text-[#534245]">{m.sku}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Movement',
      render: (m) => <StatusBadge label={m.type} />,
    },
    {
      key: 'delta',
      header: 'Delta',
      align: 'right',
      render: (m) => (
        <span className={`tabular-nums font-bold ${m.quantityDelta >= 0 ? 'text-[#1C4A3A]' : 'text-[#8B1E2D]'}`}>
          {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Before → After',
      align: 'right',
      render: (m) => (
        <span className="tabular-nums font-mono text-xs">
          {m.previousStock} → <strong>{m.newStock}</strong>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason & Notes',
      render: (m) => (
        <div className="text-xs">
          <p className="font-medium text-[#24211F]">{m.reason}</p>
          {m.notes && <p className="text-[#534245]">{m.notes}</p>}
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Performed By',
      render: (m) => <span className="text-xs text-[#534245]">{m.performedBy}</span>,
    },
  ];

  return (
    <AdminLayout title="Inventory & Stock Vault" breadcrumbs={[{ label: 'Inventory' }]}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Sarees in Vault" value={summary.totalUnits} subtext="Across all collections" goldAccent />
        <MetricCard
          label="Vault Retail Valuation"
          value={formatCurrency(summary.totalValuation, currency)}
          subtext="Current stock value"
        />
        <MetricCard label="Low Stock Alerts" value={summary.lowStock} subtext="At or below threshold" />
        <MetricCard label="Out of Stock" value={summary.outOfStock} subtext="Requires loom restock" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#D8C9B4] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#867275] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or saree name..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#D8C9B4] rounded"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: 'All Stock' },
              { id: 'low', label: 'Low Stock' },
              { id: 'oos', label: 'Out of Stock' },
              { id: 'healthy', label: 'Healthy' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStockFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                stockFilter === tab.id
                  ? 'bg-[#641E32] text-white border-[#641E32]'
                  : 'bg-[#FAF7F2] text-[#534245] border-[#D8C9B4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={productColumns} data={filteredProducts} rowKey={(p) => p.id} />

      <div className="space-y-3 pt-2">
        <h2 className="font-serif text-lg font-semibold text-[#24211F]">Stock Movement Audit History</h2>
        <DataTable columns={movementColumns} data={movements} rowKey={(m) => m.id} />
      </div>

      <SlideOverModal
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title="Adjust Stock Quantity"
        subtitle={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : ''}
        size="md"
      >
        {selectedProduct && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="p-3 bg-[#FAF7F2] border border-[#D8C9B4] rounded flex items-center justify-between text-xs">
              <span>Current Vault Stock</span>
              <strong className="text-base tabular-nums text-[#641E32]">{selectedProduct.stockQuantity} units</strong>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Adjustment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Add', 'Remove', 'Set'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, mode: m })}
                    className={`py-2 text-xs font-semibold rounded border cursor-pointer ${
                      adjustForm.mode === m
                        ? 'bg-[#641E32] text-white border-[#641E32]'
                        : 'bg-white text-[#24211F] border-[#D8C9B4]'
                    }`}
                  >
                    {m} Stock
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Quantity</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Low-Stock Alert Threshold</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={adjustForm.lowStockThreshold}
                  onChange={(e) => setAdjustForm({ ...adjustForm, lowStockThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Reason</label>
              <select
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Loom Restock Delivery">Loom Restock Delivery</option>
                <option value="Physical Vault Audit">Physical Vault Audit</option>
                <option value="Exhibition / Trunk Show Allocation">Exhibition / Trunk Show Allocation</option>
                <option value="Damaged / Quality Hold">Damaged / Quality Hold</option>
                <option value="Patron Return Restock">Patron Return Restock</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Notes</label>
              <textarea
                rows={3}
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                placeholder="Optional batch, loom, or audit notes..."
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 text-xs border border-[#D8C9B4] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer"
              >
                {saving ? 'Updating...' : 'Apply Stock Update'}
              </button>
            </div>
          </form>
        )}
      </SlideOverModal>
    </AdminLayout>
  );
};
