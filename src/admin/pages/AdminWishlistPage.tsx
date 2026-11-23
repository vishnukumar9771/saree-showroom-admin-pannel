import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SafeImage } from '../components/SafeImage';
import type { Product } from '../../types/domain';

interface WishlistRow {
  product: Product;
  wishlistCount: number;
  uniqueCustomers: number;
  convertedOrders: number;
  conversionRate: number;
  weeklyTrend: number[];
}

export const AdminWishlistPage: React.FC = () => {
  const { adminData } = useStore();
  const products = adminData?.products || [];
  const insights = adminData?.wishlistInsights || [];
  const categories = adminData?.categories || [];
  const currency = adminData?.settings.regional.currency || 'INR';

  const rows: WishlistRow[] = useMemo(() => {
    return insights
      .map((ins) => {
        const product = products.find((p) => p.id === ins.productId);
        if (!product) return null;
        const conversionRate =
          ins.wishlistCount > 0 ? Math.round((ins.convertedOrders / ins.wishlistCount) * 100) : 0;
        return {
          product,
          wishlistCount: ins.wishlistCount,
          uniqueCustomers: ins.uniqueCustomers ?? ins.wishlistCount,
          convertedOrders: ins.convertedOrders,
          conversionRate,
          weeklyTrend: ins.weeklyTrend,
        };
      })
      .filter((r): r is WishlistRow => Boolean(r))
      .sort((a, b) => b.wishlistCount - a.wishlistCount);
  }, [insights, products]);

  const totals = useMemo(() => {
    const totalSaves = rows.reduce((s, r) => s + r.wishlistCount, 0);
    const totalUniqueCustomers = rows.reduce((s, r) => s + r.uniqueCustomers, 0);
    const totalConverted = rows.reduce((s, r) => s + r.convertedOrders, 0);
    const avgConv = totalSaves > 0 ? Math.round((totalConverted / totalSaves) * 100) : 0;
    const highDemandLowStock = rows.filter(
      (r) => r.wishlistCount >= 40 && r.product.stockQuantity <= r.product.lowStockThreshold
    );
    return { totalSaves, totalUniqueCustomers, totalConverted, avgConv, highDemandLowStock };
  }, [rows]);

  const categoryBreakdown = useMemo(() => {
    return categories.map((cat) => {
      const catRows = rows.filter((r) => r.product.categoryId === cat.id);
      const saves = catRows.reduce((s, r) => s + r.wishlistCount, 0);
      return { name: cat.name, saves };
    });
  }, [categories, rows]);

  const columns: DataColumn<WishlistRow>[] = [
    {
      key: 'saree',
      header: 'Saree',
      render: (r) => (
        <div className="flex items-center gap-3">
          <SafeImage
            src={r.product.images[0]}
            alt={r.product.name}
            className="w-10 h-[52px] object-cover rounded border border-[#D8C9B4] shrink-0"
          />
          <div>
            <p className="font-semibold text-[#24211F]">{r.product.name}</p>
            <p className="text-[11px] font-mono text-[#534245]">
              {r.product.sku} · {formatCurrency(r.product.sellingPrice, currency)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'saves',
      header: 'Total Saves',
      align: 'right',
      render: (r) => <span className="tabular-nums font-bold text-[#641E32]">{r.wishlistCount}</span>,
    },
    {
      key: 'unique',
      header: 'Unique Patrons',
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium text-[#24211F]">{r.uniqueCustomers}</span>,
    },
    {
      key: 'converted',
      header: 'Converted Orders',
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium">{r.convertedOrders}</span>,
    },
    {
      key: 'rate',
      header: 'Wishlist → Order',
      align: 'right',
      render: (r) => <span className="tabular-nums font-semibold text-[#1C4A3A]">{r.conversionRate}%</span>,
    },
    {
      key: 'trend',
      header: '6-Week Demand',
      render: (r) => (
        <div className="flex items-end gap-1 h-6">
          {r.weeklyTrend.map((val, idx) => {
            const max = Math.max(...r.weeklyTrend, 1);
            const h = Math.max(4, Math.round((val / max) * 22));
            return (
              <span
                key={idx}
                style={{ height: `${h}px` }}
                className="w-2 bg-[#C3A46C] rounded-t-sm inline-block"
                title={`Week ${idx + 1}: ${val} saves`}
              />
            );
          })}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Health',
      render: (r) => (
        <StatusBadge
          label={
            r.product.stockQuantity === 0
              ? 'Out of Stock'
              : r.product.stockQuantity <= r.product.lowStockThreshold
                ? `Low (${r.product.stockQuantity})`
                : `${r.product.stockQuantity} in vault`
          }
          tone={r.product.stockQuantity <= r.product.lowStockThreshold ? 'crimson' : 'emerald'}
        />
      ),
    },
  ];

  return (
    <AdminLayout title="Wishlist & Demand Analytics" breadcrumbs={[{ label: 'Wishlist Analytics' }]}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Wishlist Saves" value={totals.totalSaves} subtext="Across active catalog" goldAccent />
        <MetricCard label="Unique Customers" value={totals.totalUniqueCustomers} subtext="Distinct patrons saving items" />
        <MetricCard label="Wishlist Conversions" value={totals.totalConverted} subtext="Converted to paid orders" />
        <MetricCard label="Conversion Rate" value={`${totals.avgConv}%`} subtext="Wishlist-to-order ratio" />
        <MetricCard
          label="High-Demand Low Stock"
          value={totals.highDemandLowStock.length}
          subtext="Urgent loom restocks"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* High Wishlist + Low Stock Alert Panel */}
        <div className="lg:col-span-7 bg-white border border-[#D8C9B4] rounded p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#EEE7E3]">
            <h2 className="font-serif text-base font-semibold text-[#24211F] inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8B1E2D]" />
              High Wishlist Demand & Low Stock
            </h2>
            <Link to="/admin/inventory" className="text-xs font-semibold text-[#641E32] hover:underline inline-flex items-center gap-1">
              Restock Vault <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {totals.highDemandLowStock.length === 0 ? (
            <p className="text-xs text-[#534245]">No high-demand shortages right now.</p>
          ) : (
            <div className="divide-y divide-[#EEE7E3]">
              {totals.highDemandLowStock.map((r) => (
                <div key={r.product.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#24211F] truncate">{r.product.name}</p>
                    <p className="text-[11px] text-[#534245] tabular-nums">
                      {r.wishlistCount} patrons wishlisted · Only {r.product.stockQuantity} unit(s) left
                    </p>
                  </div>
                  <Link
                    to="/admin/suppliers"
                    className="px-3 py-1.5 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] whitespace-nowrap"
                  >
                    Create PO
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Insights */}
        <div className="lg:col-span-5 bg-white border border-[#D8C9B4] rounded p-5 space-y-3">
          <h2 className="font-serif text-base font-semibold text-[#24211F] pb-2 border-b border-[#EEE7E3]">
            Category Demand Breakdown
          </h2>
          <div className="space-y-3">
            {categoryBreakdown.map((c) => {
              const max = Math.max(...categoryBreakdown.map((x) => x.saves), 1);
              const pct = Math.round((c.saves / max) * 100);
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#24211F]">{c.name}</span>
                    <span className="tabular-nums text-[#641E32] font-semibold">{c.saves} saves</span>
                  </div>
                  <div className="h-2 bg-[#FAF7F2] border border-[#EEE7E3] rounded overflow-hidden">
                    <div className="h-full bg-[#641E32]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={rows} rowKey={(r) => r.product.id} />
    </AdminLayout>
  );
};
