import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderTree,
  Heart,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import type { AdminModuleKey } from '../../types/domain';

interface NavItem {
  key: AdminModuleKey;
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', path: '/admin/products', icon: Package },
  { key: 'collections', label: 'Collections', path: '/admin/collections', icon: Layers },
  { key: 'categories', label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { key: 'inventory', label: 'Inventory', path: '/admin/inventory', icon: Warehouse },
  { key: 'orders', label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { key: 'customers', label: 'Customers', path: '/admin/customers', icon: Users },
  { key: 'wishlist', label: 'Wishlist Analytics', path: '/admin/wishlist', icon: Heart },
  { key: 'coupons', label: 'Coupons & Offers', path: '/admin/coupons', icon: Tag },
  { key: 'content', label: 'Website Content', path: '/admin/content', icon: FileText },
  { key: 'enquiries', label: 'Enquiries', path: '/admin/enquiries', icon: MessageSquare },
  { key: 'reports', label: 'Sales & Reports', path: '/admin/reports', icon: BarChart3 },
  { key: 'expenses', label: 'Expenses', path: '/admin/expenses', icon: Receipt },
  { key: 'suppliers', label: 'Suppliers & POs', path: '/admin/suppliers', icon: Truck },
  { key: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings },
];

interface AdminLayoutProps {
  title: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  title,
  breadcrumbs = [],
  actions,
  children,
}) => {
  const { user, hasPermission, logout } = useAuth();
  const { adminData, isPreviewSampleData } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => hasPermission(item.key));

  const notifications = useMemo(() => {
    if (!adminData) return [];
    const items: { id: string; title: string; detail: string; to: string }[] = [];
    adminData.products
      .filter((p) => p.stockQuantity <= p.lowStockThreshold)
      .slice(0, 3)
      .forEach((p) => {
        items.push({
          id: `low-${p.id}`,
          title: p.stockQuantity === 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
          detail: `${p.name} (${p.stockQuantity} left)`,
          to: '/admin/inventory',
        });
      });
    adminData.orders
      .filter((o) => o.fulfillmentStatus === 'Pending')
      .slice(0, 2)
      .forEach((o) => {
        items.push({
          id: `ord-${o.id}`,
          title: `Pending Order ${o.orderNumber}`,
          detail: `${o.customerName} · ₹${o.totalAmount.toLocaleString('en-IN')}`,
          to: '/admin/orders',
        });
      });
    adminData.enquiries
      .filter((e) => e.status === 'New')
      .slice(0, 2)
      .forEach((e) => {
        items.push({
          id: `enq-${e.id}`,
          title: `New ${e.enquiryType} Enquiry`,
          detail: e.customerName,
          to: '/admin/enquiries',
        });
      });
    return items;
  }, [adminData]);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || !adminData) return [];
    const results: { label: string; meta: string; to: string }[] = [];
    adminData.products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((p) =>
        results.push({ label: p.name, meta: `Product · ${p.sku}`, to: `/admin/products/${p.id}/edit` })
      );
    adminData.orders
      .filter((o) => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((o) =>
        results.push({ label: o.orderNumber, meta: `Order · ${o.customerName}`, to: '/admin/orders' })
      );
    adminData.customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((c) => results.push({ label: c.name, meta: `Customer · ${c.city}`, to: '/admin/customers' }));
    return results;
  }, [searchTerm, adminData]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#3B1422] text-[#F5F0E8] select-none">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 shrink-0">
        {(!collapsed || isMobile) && (
          <Link to="/admin/dashboard" className="min-w-0">
            <span className="font-serif text-lg font-semibold tracking-[0.14em] text-white block leading-none">
              AARANYA
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#C3A46C] block mt-1 truncate">
              The House of Indian Silks
            </span>
          </Link>
        )}
        {!isMobile ? (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-[#D8C9B4] hover:text-white rounded cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-[#D8C9B4] hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path ||
            (item.path === '/admin/products' && location.pathname.startsWith('/admin/products'));
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => isMobile && setMobileOpen(false)}
              title={collapsed && !isMobile ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#641E32] text-white border border-[#C3A46C]/45'
                  : 'text-[#D8C9B4] hover:bg-white/[0.06] hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C3A46C]' : 'text-[#D8C9B4]'}`} />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile & Logout */}
      <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
        {(!collapsed || isMobile) && user && (
          <div className="px-2 py-1.5 bg-[#2A0E18] rounded border border-white/10">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-[#C3A46C] truncate">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium text-[#D8C9B4] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F0E8] text-[#24211F]">
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:block shrink-0 sticky top-0 h-screen transition-all duration-200 border-r border-[#C3A46C]/25 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex bg-[#3B1422]/40 backdrop-blur-[4px]">
          <div className="w-[260px] h-full">{renderSidebarContent(true)}</div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#D8C9B4] px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-[#534245] hover:text-[#641E32] cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              {breadcrumbs.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-[#534245] truncate">
                  <Link to="/admin/dashboard" className="hover:text-[#641E32]">
                    Atelier Admin
                  </Link>
                  {breadcrumbs.map((b, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight className="w-3 h-3 shrink-0 text-[#867275]" />
                      {b.to ? (
                        <Link to={b.to} className="hover:text-[#641E32] truncate">
                          {b.label}
                        </Link>
                      ) : (
                        <span className="text-[#641E32] font-medium truncate">{b.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <h1 className="font-serif text-lg sm:text-xl font-semibold text-[#24211F] truncate">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Global Quick Search */}
            <div className="relative hidden lg:block w-64">
              <Search className="w-3.5 h-3.5 text-[#867275] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU, order, patron..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
              />
              {searchFocused && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#D8C9B4] rounded shadow-lg py-1 z-30">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => {
                        navigate(res.to);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#FAF7F2] text-xs cursor-pointer"
                    >
                      <div className="font-semibold text-[#24211F] truncate">{res.label}</div>
                      <div className="text-[11px] text-[#534245] truncate">{res.meta}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
                className="relative p-2 border border-[#D8C9B4] rounded text-[#534245] hover:text-[#641E32] hover:border-[#C3A46C] cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#641E32] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {notifications.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D8C9B4] rounded shadow-lg z-30">
                  <div className="px-4 py-2.5 border-b border-[#D8C9B4] bg-[#FAF7F2] text-xs font-semibold text-[#641E32]">
                    Atelier Alerts ({notifications.length})
                  </div>
                  <div className="divide-y divide-[#EEE7E3] max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-xs text-[#534245]">All operations nominal.</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(n.to);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#FAF7F2] cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-[#24211F]">{n.title}</p>
                          <p className="text-[11px] text-[#534245] mt-0.5">{n.detail}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 border border-[#D8C9B4] rounded hover:border-[#C3A46C] cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#641E32] text-white text-[11px] font-semibold flex items-center justify-center">
                  {(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-[#24211F] max-w-[110px] truncate">
                  {user?.name || 'Administrator'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#534245]" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#D8C9B4] rounded shadow-lg z-30 py-1 text-xs">
                  <div className="px-4 py-2 border-b border-[#EEE7E3]">
                    <p className="font-semibold text-[#24211F] truncate">{user?.name}</p>
                    <p className="text-[11px] text-[#534245] truncate">{user?.email}</p>
                    <p className="text-[10px] text-[#7A5212] mt-1 font-medium">
                      {isPreviewSampleData ? 'Preview Sample Data' : 'Supabase Live'}
                    </p>
                  </div>
                  {hasPermission('settings') && (
                    <Link
                      to="/admin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-[#24211F] hover:bg-[#FAF7F2]"
                    >
                      Store & Security Settings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-[#8B1E2D] hover:bg-[#FBECEE] cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {actions && <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div>}
          {children}
        </main>
      </div>
    </div>
  );
};
