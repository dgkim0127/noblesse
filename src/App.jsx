import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import './App.css'
import { CommerceProvider } from './commerce/CommerceContext'
import { StoreShell } from './components/StoreShell'

const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })))
const AdminCatalogPage = lazy(() => import('./pages/AdminCatalogPage').then((module) => ({ default: module.AdminCatalogPage })))
const AdminQuotesPage = lazy(() => import('./pages/AdminQuotesPage').then((module) => ({ default: module.AdminQuotesPage })))
const ApprovalPendingPage = lazy(() => import('./pages/ApprovalPendingPage').then((module) => ({ default: module.ApprovalPendingPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const InquiryListPage = lazy(() => import('./pages/InquiryListPage').then((module) => ({ default: module.InquiryListPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const MyInquiriesPage = lazy(() => import('./pages/MyInquiriesPage').then((module) => ({ default: module.MyInquiriesPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const RequestQuotePage = lazy(() => import('./pages/RequestQuotePage').then((module) => ({ default: module.RequestQuotePage })))

function LegacyInquiryDetailRedirect() {
  const { orderId } = useParams()
  return <Navigate replace to={`/my-inquiries/${orderId}`} />
}

function LoadingPage() {
  return <main className="route-loading" aria-live="polite">Loading Noblesse catalog...</main>
}

function App() {
  return <BrowserRouter><CommerceProvider><Suspense fallback={<LoadingPage />}><Routes>
    <Route element={<StoreShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path="/inquiry-list" element={<InquiryListPage />} />
      <Route path="/request-quote" element={<RequestQuotePage />} />
      <Route path="/my-inquiries" element={<MyInquiriesPage />} />
      <Route path="/my-inquiries/:inquiryId" element={<MyInquiriesPage />} />
      <Route path="/admin/catalog" element={<AdminCatalogPage />} />
      <Route path="/admin/quotes" element={<AdminQuotesPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/approval-pending" element={<ApprovalPendingPage />} />
      <Route path="/cart" element={<Navigate replace to="/inquiry-list" />} />
      <Route path="/order-request" element={<Navigate replace to="/request-quote" />} />
      <Route path="/orders" element={<Navigate replace to="/my-inquiries" />} />
      <Route path="/orders/:orderId" element={<LegacyInquiryDetailRedirect />} />
    </Route>
    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes></Suspense></CommerceProvider></BrowserRouter>
}

export default App
