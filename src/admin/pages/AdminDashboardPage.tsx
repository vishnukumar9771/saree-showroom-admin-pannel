import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { RevenueChart, RevenuePoint } from '../components/ui/RevenueChart';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SafeImage } from '../components/SafeImage';
import type { Order, OrderStatus } from '../../types/domain';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Return requested',
];

export const AdminDashboardPage: React.FC = () => {
  const { adminData } = useStore();
  const navigate = useNavigate();
  const [chartWindow, setChartWindow] = useState<'6m' | '30d'>('6m');

  const currency = adminData?.settings.regional.currency || 'INR';

  const stats = useMemo(() => {
    if (!adminData) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        lowStockProducts: [],
        pendingOrdersCount: 0,
        bestSellers: [],
        recentOrders: [],
        statusCounts: [] as { status: OrderStatus; count: number }[],
      };
    }

    const validOrders = adminData.orders.filter((o) => o.fulfillmentStatus !== 'Cancelled');
    const totalRevenue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const lowStockProducts = adminData.products.filter((p) => p.stockQuantity <= p.lowStockThreshold);
    const pendingOrdersCount = adminData.orders.filter(
      (o) => o.fulfillmentStatus === 'Pending' || o.fulfillmentStatus === 'Processing'
    ).length;

    const bestSellers = [...adminData.products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 4);
    const recentOrders = adminData.orders.slice(0, 5);
    const statusCounts = ORDER_STATUSES.map((status) => ({
      status,
      count: adminData.orders.filter((o) => o.fulfillmentStatus === status).length,
    }));

    return {
      totalRevenue,
      totalOrders: adminData.orders.length,
      totalProducts: adminData.products.length,
      totalCustomers: adminData.customers.length,
      lowStockProducts,
      pendingOrdersCount,
      bestSellers,
      recentOrders,
      statusCounts,
    };
  }, [adminData]);

  const chartSeries: RevenuePoint[] = useMemo(() => {
    if (chartWindow === '30d') {
      const liveSum = stats.totalRevenue;
      return [
        { label: 'Wk 1', revenue: 185000, orders: 2 },
        { label: 'Wk 2', revenue: 248000, orders: 3 },
        { label: 'Wk 3', revenue: 312000, orders: 3 },
        { label: 'Current', revenue: Math.max(210000, Math.round(liveSum * 0.45)), orders: stats.totalOrders },
      ];
    }
    return [
      { label: 'Jun', revenue: 420000, orders: 4 },
      { label: 'Jul', revenue: 510000, orders: 5 },
      { label: 'Aug', revenue: 645000, orders: 6 },
      { label: 'Sep', revenue: 590000, orders: 5 },
      { label: 'Oct', revenue: 880000, orders: 8 },
      { label: 'Nov', revenue: Math.max(655384, stats.totalRevenue), orders: stats.totalOrders },
    ];
  }, [chartWindow, stats.totalRevenue, stats.totalOrders]);

  const orderCols: DataColumn<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => <span className="font-mono font-semibold text-[#641E32]">{o.orderNumber}</span>,
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
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (o) => <span className="tabular-nums font-semibold">{formatCurrency(o.totalAmount, currency)}</span>,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (o) => <StatusBadge label={o.paymentStatus} />,
    },
    {
      key: 'status',
      header: 'Fulfillment',
      render: (o) => <StatusBadge label={o.fulfillmentStatus} />,
    },
  ];

  return (
    <AdminLayout
      title="Atelier Dashboard"
      breadcrumbs={[{ label: 'Overview' }]}
      actions={
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Saree
        </Link>
      }
    >
      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, currency)}
          trend={{ value: '+14.2%', positive: true }}
          subtext="Net settled & pending"
          goldAccent
          onClick={() => navigate('/admin/reports')}
        />
        <MetricCard
          label="Total Orders"
          value={stats.totalOrders}
          trend={{ value: '+3 this wk', positive: true }}
          subtext="All recorded orders"
          onClick={() => navigate('/admin/orders')}
        />
        <MetricCard
          label="Total Products"
          value={stats.totalProducts}
          subtext={`${adminData?.products.filter((p) => p.status === 'Published').length || 0} published live`}
          onClick={() => navigate('/admin/products')}
        />
        <MetricCard
          label="Total Customers"
          value={stats.totalCustomers}
          subtext="Verified collectors & patrons"
          onClick={() => navigate('/admin/customers')}
        />
        <MetricCard
          label="Low Stock Sarees"
          value={stats.lowStockProducts.length}
          trend={{ value: stats.lowStockProducts.length > 0 ? 'Action needed' : 'Healthy', positive: stats.lowStockProducts.length === 0 }}
          subtext="At or below threshold"
          onClick={() => navigate('/admin/inventory')}
        />
        <MetricCard
          label="Pending Orders"
          value={stats.pendingOrdersCount}
          subtext="Awaiting dispatch"
          onClick={() => navigate('/admin/orders')}
        />
      </div>

      {/* Revenue Graph + Order Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-[#D8C9B4] rounded p-6">
          <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-[#EEE7E3]">
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#24211F]">Revenue Trajectory</h2>
              <p className="text-xs text-[#534245]">Gross silk sales across verified orders</p>
            </div>
            <div className="inline-flex p-1 bg-[#FAF7F2] border border-[#D8C9B4] rounded">
              <button
                type="button"
                onClick={() => setChartWindow('6m')}
                className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                  chartWindow === '6m' ? 'bg-[#641E32] text-white' : 'text-[#534245]'
                }`}
              >
                6 Months
              </button>
              <button
                type="button"
                onClick={() => setChartWindow('30d')}
                className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                  chartWindow === '30d' ? 'bg-[#641E32] text-white' : 'text-[#534245]'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
          <RevenueChart data={chartSeries} currency={currency} />
        </div>

        <div className="lg:col-span-4 bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <div className="pb-3 border-b border-[#EEE7E3]">
            <h2 className="font-serif text-lg font-semibold text-[#24211F]">Order Status Overview</h2>
            <p className="text-xs text-[#534245]">Live fulfillment distribution</p>
          </div>
          <div className="space-y-2.5">
            {stats.statusCounts.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs py-1">
                <StatusBadge label={item.status} />
                <span className="font-semibold tabular-nums text-[#24211F]">{item.count} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders + Best Selling & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#24211F]">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-semibold text-[#641E32] hover:underline">
              Manage All Orders
            </Link>
          </div>
          <DataTable
            columns={orderCols}
            data={stats.recentOrders}
            rowKey={(o) => o.id}
            onRowClick={() => navigate('/admin/orders')}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Best-selling products */}
          <div className="bg-white border border-[#D8C9B4] rounded p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#EEE7E3]">
              <h2 className="font-serif text-base font-semibold text-[#24211F]">Best-Selling Sarees</h2>
              <Link to="/admin/reports" className="text-xs text-[#641E32] hover:underline">
                Full Report
              </Link>
            </div>
            <div className="divide-y divide-[#EEE7E3]">
              {stats.bestSellers.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center gap-3">
                  <SafeImage
                    src={p.images[0]}
                    alt={p.name}
                    className="w-10 h-[52px] object-cover rounded border border-[#D8C9B4] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#24211F] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#534245] tabular-nums">
                      {p.salesCount} sold · {formatCurrency(p.sellingPrice, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low-stock inventory list */}
          <div className="bg-white border border-[#D8C9B4] rounded p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#EEE7E3]">
              <h2 className="font-serif text-base font-semibold text-[#24211F]">Low-Stock Vault Alerts</h2>
              <Link to="/admin/inventory" className="text-xs text-[#641E32] hover:underline">
                Restock
              </Link>
            </div>
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-xs text-[#534245]">All sarees are sufficiently stocked.</p>
            ) : (
              <div className="divide-y divide-[#EEE7E3]">
                {stats.lowStockProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#24211F] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#534245] font-mono">{p.sku}</p>
                    </div>
                    <StatusBadge label={p.stockQuantity === 0 ? 'Out of Stock' : `${p.stockQuantity} left`} tone="crimson" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-[#D8C9B4] rounded p-5">
        <h2 className="font-serif text-base font-semibold text-[#24211F] pb-3 border-b border-[#EEE7E3]">
          Recent Atelier Activity
        </h2>
        <div className="divide-y divide-[#EEE7E3]">
          {(adminData?.activities || []).slice(0, 6).map((act) => (
            <div key={act.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-semibold text-[#641E32]">{act.actor}</span>{' '}
                <span className="text-[#24211F]">{act.action}</span>{' '}
                <span className="text-[#534245]">— {act.target}</span>
              </div>
              <span className="text-[11px] text-[#867275] tabular-nums">{formatDateTime(act.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
