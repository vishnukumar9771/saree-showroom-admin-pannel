import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';

import { AdminGuard } from './admin/components/AdminGuard';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { AccessDeniedPage } from './admin/pages/AccessDeniedPage';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { AdminProductsPage } from './admin/pages/AdminProductsPage';
import { AdminProductFormPage } from './admin/pages/AdminProductFormPage';
import { AdminCollectionsPage } from './admin/pages/AdminCollectionsPage';
import { AdminCategoriesPage } from './admin/pages/AdminCategoriesPage';
import { AdminInventoryPage } from './admin/pages/AdminInventoryPage';
import { AdminOrdersPage } from './admin/pages/AdminOrdersPage';
import { AdminCustomersPage } from './admin/pages/AdminCustomersPage';
import { AdminWishlistPage } from './admin/pages/AdminWishlistPage';
import { AdminCouponsPage } from './admin/pages/AdminCouponsPage';
import { AdminContentPage } from './admin/pages/AdminContentPage';
import { AdminEnquiriesPage } from './admin/pages/AdminEnquiriesPage';
import { AdminReportsPage } from './admin/pages/AdminReportsPage';
import { AdminExpensesPage } from './admin/pages/AdminExpensesPage';
import { AdminSuppliersPage } from './admin/pages/AdminSuppliersPage';
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <Routes>
            {/* Admin Panel Entry & Authentication Routes */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/access-denied"
              element={
                <AdminGuard>
                  <AccessDeniedPage />
                </AdminGuard>
              }
            />

            {/* Protected Admin Panel Modules */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminGuard requiredModule="dashboard">
                  <AdminDashboardPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminGuard requiredModule="products">
                  <AdminProductsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/products/new"
              element={
                <AdminGuard requiredModule="products">
                  <AdminProductFormPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/products/:id/edit"
              element={
                <AdminGuard requiredModule="products">
                  <AdminProductFormPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/collections"
              element={
                <AdminGuard requiredModule="collections">
                  <AdminCollectionsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <AdminGuard requiredModule="categories">
                  <AdminCategoriesPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <AdminGuard requiredModule="inventory">
                  <AdminInventoryPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminGuard requiredModule="orders">
                  <AdminOrdersPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <AdminGuard requiredModule="customers">
                  <AdminCustomersPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/wishlist"
              element={
                <AdminGuard requiredModule="wishlist">
                  <AdminWishlistPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <AdminGuard requiredModule="coupons">
                  <AdminCouponsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/content"
              element={
                <AdminGuard requiredModule="content">
                  <AdminContentPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/enquiries"
              element={
                <AdminGuard requiredModule="enquiries">
                  <AdminEnquiriesPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminGuard requiredModule="reports">
                  <AdminReportsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/expenses"
              element={
                <AdminGuard requiredModule="expenses">
                  <AdminExpensesPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/suppliers"
              element={
                <AdminGuard requiredModule="suppliers">
                  <AdminSuppliersPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminGuard requiredModule="settings">
                  <AdminSettingsPage />
                </AdminGuard>
              }
            />

            {/* Fallback to Admin Portal */}
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
