import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import './App.css'
import { CommerceProvider } from './commerce/CommerceContext'
import { AdminRoute } from './components/AdminRoute'
import { AdminShell } from './components/AdminShell'
import { StoreShell } from './components/StoreShell'
import { AccountPage } from './pages/AccountPage'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage'
import { AdminBuyerDetailPage } from './pages/admin/AdminBuyerDetailPage'
import { AdminBuyersPage } from './pages/admin/AdminBuyersPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminInquiriesPage } from './pages/admin/AdminInquiriesPage'
import { AdminInquiryDetailPage } from './pages/admin/AdminInquiryDetailPage'
import { AdminPricesPage } from './pages/admin/AdminPricesPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminQuotePage } from './pages/admin/AdminQuotePage'
import { AdminQuotesPage } from './pages/admin/AdminQuotesPage'
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
        <Route index element={<AdminDashboardPage />} />
        <Route path="buyers" element={<AdminBuyersPage />} />
        <Route path="buyers/:buyerId" element={<AdminBuyerDetailPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="prices" element={<AdminPricesPage />} />
        <Route path="inquiries" element={<AdminInquiriesPage />} />
        <Route path="inquiries/:inquiryId" element={<AdminInquiryDetailPage />} />
        <Route path="quotes" element={<AdminQuotesPage />} />
        <Route path="quotes/:inquiryId" element={<AdminQuotePage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
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
        <Route index element={<AdminDashboardPage />} />
        <Route path="buyers" element={<AdminBuyersPage />} />
        <Route path="buyers/:buyerId" element={<AdminBuyerDetailPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="prices" element={<AdminPricesPage />} />
        <Route path="inquiries" element={<AdminInquiriesPage />} />
        <Route path="inquiries/:inquiryId" element={<AdminInquiryDetailPage />} />
        <Route path="quotes" element={<AdminQuotesPage />} />
        <Route path="quotes/:inquiryId" element={<AdminQuotePage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
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
