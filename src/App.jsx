import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import './App.css'
import { CommerceProvider } from './commerce/CommerceContext'
import { AdminRoute } from './components/AdminRoute'
import { AdminShell } from './components/AdminShell'
import { StoreShell } from './components/StoreShell'
import { AccountPage } from './pages/AccountPage'
import { ApprovalPendingPage } from './pages/ApprovalPendingPage'
import { HomePage } from './pages/HomePage'
import { InquiryListPage } from './pages/InquiryListPage'
import { LoginPage } from './pages/LoginPage'
import { MyInquiriesPage } from './pages/MyInquiriesPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductsPage } from './pages/ProductsPage'
import { RegisterPage } from './pages/RegisterPage'
import { RequestQuotePage } from './pages/RequestQuotePage'
import { buildLocalizedPath, supportedLocales } from './utils/locale'

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })))

function AdminPageFallback() {
  return <div className="admin-page-loading">Loading admin view...</div>
}

function AdminUnavailablePage() {
  return <section className="admin-card admin-access-card">
    <p className="eyebrow">Admin API Required</p>
    <h1>Admin is not connected yet</h1>
    <p>Release mode requires server-side authentication, role checks, and admin API responses before this screen can be used.</p>
  </section>
}

const AdminAnalyticsPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminAnalyticsPage'), 'AdminAnalyticsPage') : AdminUnavailablePage
const AdminBuyerDetailPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminBuyerDetailPage'), 'AdminBuyerDetailPage') : AdminUnavailablePage
const AdminBuyersPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminBuyersPage'), 'AdminBuyersPage') : AdminUnavailablePage
const AdminDashboardPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage') : AdminUnavailablePage
const AdminInquiriesPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminInquiriesPage'), 'AdminInquiriesPage') : AdminUnavailablePage
const AdminInquiryDetailPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminInquiryDetailPage'), 'AdminInquiryDetailPage') : AdminUnavailablePage
const AdminPricesPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminPricesPage'), 'AdminPricesPage') : AdminUnavailablePage
const AdminProductsPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminProductsPage'), 'AdminProductsPage') : AdminUnavailablePage
const AdminQuotePage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminQuotePage'), 'AdminQuotePage') : AdminUnavailablePage
const AdminQuotesPage = import.meta.env.DEV ? lazyNamed(() => import('./pages/admin/AdminQuotesPage'), 'AdminQuotesPage') : AdminUnavailablePage

function withAdminSuspense(element) {
  return <Suspense fallback={<AdminPageFallback />}>{element}</Suspense>
}

function LegacyInquiryDetailRedirect() {
  const { locale, orderId } = useParams()
  return <Navigate replace to={buildLocalizedPath(`/my-inquiries/${orderId}`, supportedLocales.includes(locale) ? locale : 'kr', Boolean(locale))} />
}

function LocaleShell() {
  const { locale } = useParams()
  if (!supportedLocales.includes(locale)) return <Navigate replace to="/" />
  return <StoreShell />
}

function App() {
  return <BrowserRouter><CommerceProvider><Routes>
    <Route element={<StoreShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path="/inquiry-list" element={<InquiryListPage />} />
      <Route path="/request-quote" element={<RequestQuotePage />} />
      <Route path="/my-inquiries" element={<MyInquiriesPage />} />
      <Route path="/my-inquiries/:inquiryId" element={<MyInquiriesPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/approval-pending" element={<ApprovalPendingPage />} />
      <Route path="/admin" element={<AdminRoute><AdminShell /></AdminRoute>}>
        <Route index element={withAdminSuspense(<AdminDashboardPage />)} />
        <Route path="buyers" element={withAdminSuspense(<AdminBuyersPage />)} />
        <Route path="buyers/:buyerId" element={withAdminSuspense(<AdminBuyerDetailPage />)} />
        <Route path="products" element={withAdminSuspense(<AdminProductsPage />)} />
        <Route path="prices" element={withAdminSuspense(<AdminPricesPage />)} />
        <Route path="inquiries" element={withAdminSuspense(<AdminInquiriesPage />)} />
        <Route path="inquiries/:inquiryId" element={withAdminSuspense(<AdminInquiryDetailPage />)} />
        <Route path="quotes" element={withAdminSuspense(<AdminQuotesPage />)} />
        <Route path="quotes/:inquiryId" element={withAdminSuspense(<AdminQuotePage />)} />
        <Route path="analytics" element={withAdminSuspense(<AdminAnalyticsPage />)} />
      </Route>
      <Route path="/cart" element={<Navigate replace to="/inquiry-list" />} />
      <Route path="/order-request" element={<Navigate replace to="/request-quote" />} />
      <Route path="/orders" element={<Navigate replace to="/my-inquiries" />} />
      <Route path="/orders/:orderId" element={<LegacyInquiryDetailRedirect />} />
    </Route>
    <Route path="/:locale" element={<LocaleShell />}>
      <Route index element={<HomePage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="products/:productId" element={<ProductDetailPage />} />
      <Route path="inquiry-list" element={<InquiryListPage />} />
      <Route path="request-quote" element={<RequestQuotePage />} />
      <Route path="my-inquiries" element={<MyInquiriesPage />} />
      <Route path="my-inquiries/:inquiryId" element={<MyInquiriesPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="approval-pending" element={<ApprovalPendingPage />} />
      <Route path="admin" element={<AdminRoute><AdminShell /></AdminRoute>}>
        <Route index element={withAdminSuspense(<AdminDashboardPage />)} />
        <Route path="buyers" element={withAdminSuspense(<AdminBuyersPage />)} />
        <Route path="buyers/:buyerId" element={withAdminSuspense(<AdminBuyerDetailPage />)} />
        <Route path="products" element={withAdminSuspense(<AdminProductsPage />)} />
        <Route path="prices" element={withAdminSuspense(<AdminPricesPage />)} />
        <Route path="inquiries" element={withAdminSuspense(<AdminInquiriesPage />)} />
        <Route path="inquiries/:inquiryId" element={withAdminSuspense(<AdminInquiryDetailPage />)} />
        <Route path="quotes" element={withAdminSuspense(<AdminQuotesPage />)} />
        <Route path="quotes/:inquiryId" element={withAdminSuspense(<AdminQuotePage />)} />
        <Route path="analytics" element={withAdminSuspense(<AdminAnalyticsPage />)} />
      </Route>
      <Route path="cart" element={<Navigate replace to="../inquiry-list" />} />
      <Route path="order-request" element={<Navigate replace to="../request-quote" />} />
      <Route path="orders" element={<Navigate replace to="../my-inquiries" />} />
      <Route path="orders/:orderId" element={<LegacyInquiryDetailRedirect />} />
    </Route>
    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes></CommerceProvider></BrowserRouter>
}

export default App
