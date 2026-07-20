import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import './App.css'
import { CommerceProvider } from './commerce/CommerceContext'
import { StoreShell } from './components/StoreShell'
import { HomePage } from './pages/HomePage'
import { buildLocalizedPath, canonicalizeLocale, isLocalePathSegment, stripLocalePrefix, taiwanLocale, useLocalePath } from './utils/locale'

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })))

function AdminPageFallback() {
  return <div className="admin-page-loading">관리 화면을 불러오는 중입니다.</div>
}

function StorePageFallback() {
  return <div className="route-page-loading" role="status">페이지를 불러오는 중입니다.</div>
}

const AccountPage = lazyNamed(() => import('./pages/AccountPage'), 'AccountPage')
const ApprovalPendingPage = lazyNamed(() => import('./pages/ApprovalPendingPage'), 'ApprovalPendingPage')
const InquiryListPage = lazyNamed(() => import('./pages/InquiryListPage'), 'InquiryListPage')
const LoginPage = lazyNamed(() => import('./pages/LoginPage'), 'LoginPage')
const MyInquiriesPage = lazyNamed(() => import('./pages/MyInquiriesPage'), 'MyInquiriesPage')
const ProductDetailPage = lazyNamed(() => import('./pages/ProductDetailPage'), 'ProductDetailPage')
const ProductsPage = lazyNamed(() => import('./pages/ProductsPage'), 'ProductsPage')
const RegisterPage = lazyNamed(() => import('./pages/RegisterPage'), 'RegisterPage')
const RequestQuotePage = lazyNamed(() => import('./pages/RequestQuotePage'), 'RequestQuotePage')

const AdminPermissionGate = lazyNamed(() => import('./components/AdminPermissionGate'), 'AdminPermissionGate')
const AdminRoute = lazyNamed(() => import('./components/AdminRoute'), 'AdminRoute')
const AdminShell = lazyNamed(() => import('./components/AdminShell'), 'AdminShell')

const AdminAnalyticsPage = lazyNamed(() => import('./pages/admin/AdminAnalyticsPage'), 'AdminAnalyticsPage')
const AdminBuyerDetailPage = lazyNamed(() => import('./pages/admin/AdminBuyerDetailPage'), 'AdminBuyerDetailPage')
const AdminBuyersPage = lazyNamed(() => import('./pages/admin/AdminBuyersPage'), 'AdminBuyersPage')
const AdminCategoriesPage = lazyNamed(() => import('./pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage')
const AdminDashboardPage = lazyNamed(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage')
const AdminFxPage = lazyNamed(() => import('./pages/admin/AdminFxPage'), 'AdminFxPage')
const AdminHomeShowcasePage = lazyNamed(() => import('./pages/admin/AdminHomeShowcasePage'), 'AdminHomeShowcasePage')
const AdminHomeEditorPage = lazyNamed(() => import('./pages/admin/AdminHomeEditorPage'), 'AdminHomeEditorPage')
const AdminInquiriesPage = lazyNamed(() => import('./pages/admin/AdminInquiriesPage'), 'AdminInquiriesPage')
const AdminInquiryDetailPage = lazyNamed(() => import('./pages/admin/AdminInquiryDetailPage'), 'AdminInquiryDetailPage')
const AdminOperationsPage = lazyNamed(() => import('./pages/admin/AdminOperationsPage'), 'AdminOperationsPage')
const AdminPricesPage = lazyNamed(() => import('./pages/admin/AdminPricesPage'), 'AdminPricesPage')
const AdminProductEditorPage = lazyNamed(() => import('./pages/admin/AdminProductEditorPage'), 'AdminProductEditorPage')
const AdminProductsPage = lazyNamed(() => import('./pages/admin/AdminProductsPage'), 'AdminProductsPage')
const AdminQuotePage = lazyNamed(() => import('./pages/admin/AdminQuotePage'), 'AdminQuotePage')
const AdminQuotesPage = lazyNamed(() => import('./pages/admin/AdminQuotesPage'), 'AdminQuotesPage')
const AdminTeamPage = lazyNamed(() => import('./pages/admin/AdminTeamPage'), 'AdminTeamPage')
const AdminAuditPage = lazyNamed(() => import('./pages/admin/AdminAuditPage'), 'AdminAuditPage')

function withAdminSuspense(element, permission) {
  const content = permission ? <AdminPermissionGate permission={permission}>{element}</AdminPermissionGate> : element
  return <Suspense fallback={<AdminPageFallback />}>{content}</Suspense>
}

function AdminWorkspaceRoute() {
  return <Suspense fallback={<AdminPageFallback />}><AdminRoute><AdminShell /></AdminRoute></Suspense>
}

function LegacyInquiryDetailRedirect() {
  const { locale, orderId } = useParams()
  const canonicalLocale = isLocalePathSegment(locale) ? canonicalizeLocale(locale) : 'kr'
  return <Navigate replace to={buildLocalizedPath(`/my-inquiries/${orderId}`, canonicalLocale, Boolean(locale))} />
}

function LegacyAdminCatalogRedirect() {
  const { toLocalePath } = useLocalePath()
  return <Navigate replace to={toLocalePath('/admin/products/new')} />
}

function LocaleShell() {
  const { locale } = useParams()
  const location = useLocation()
  if (!isLocalePathSegment(locale)) return <Navigate replace to="/" />
  const canonicalLocale = canonicalizeLocale(locale)
  if (locale !== canonicalLocale) {
    return <Navigate replace to={buildLocalizedPath(`${stripLocalePrefix(location.pathname)}${location.search}${location.hash}`, canonicalLocale, true)} />
  }
  return <StoreShell />
}

function App() {
  return <BrowserRouter><CommerceProvider><Suspense fallback={<StorePageFallback />}><Routes>
    <Route element={<StoreShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/collections/:collectionId" element={<ProductsPage />} />
      <Route path="/piercing/:piercingType" element={<ProductsPage />} />
      <Route path="/material/:baseMaterial" element={<ProductsPage />} />
      <Route path="/material/:baseMaterial/piercing/:piercingType" element={<ProductsPage />} />
      <Route path="/shape/:shape" element={<ProductsPage />} />
      <Route path="/shape/:shape/piercing/:piercingType" element={<ProductsPage />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path={`/${taiwanLocale}/products/:productId`} element={<ProductDetailPage />} />
      <Route path="/inquiry-list" element={<InquiryListPage />} />
      <Route path="/request-quote" element={<RequestQuotePage />} />
      <Route path="/my-inquiries" element={<MyInquiriesPage />} />
      <Route path="/my-inquiries/:inquiryId" element={<MyInquiriesPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/approval-pending" element={<ApprovalPendingPage />} />
      <Route path="/admin" element={<AdminWorkspaceRoute />}>
        <Route index element={withAdminSuspense(<AdminDashboardPage />, 'dashboard.read')} />
        <Route path="buyers" element={withAdminSuspense(<AdminBuyersPage />, 'buyers.read')} />
        <Route path="buyers/:buyerId" element={withAdminSuspense(<AdminBuyerDetailPage />, 'buyers.read')} />
        <Route path="catalog/new" element={<LegacyAdminCatalogRedirect />} />
        <Route path="products" element={withAdminSuspense(<AdminProductsPage />, 'catalog.read')} />
        <Route path="products/new" element={withAdminSuspense(<AdminProductEditorPage />, 'catalog.write')} />
        <Route path="products/:productId/edit" element={withAdminSuspense(<AdminProductEditorPage />, 'catalog.write')} />
        <Route path="categories" element={withAdminSuspense(<AdminCategoriesPage />, 'catalog.read')} />
        <Route path="home-showcase" element={withAdminSuspense(<AdminHomeShowcasePage />, 'catalog.read')} />
        <Route path="home-editor" element={withAdminSuspense(<AdminHomeEditorPage />, 'catalog.write')} />
        <Route path="prices" element={withAdminSuspense(<AdminPricesPage />, 'prices.read')} />
        <Route path="fx" element={withAdminSuspense(<AdminFxPage />, 'prices.read')} />
        <Route path="inquiries" element={withAdminSuspense(<AdminInquiriesPage />, 'inquiries.read')} />
        <Route path="inquiries/:inquiryId" element={withAdminSuspense(<AdminInquiryDetailPage />, 'inquiries.read')} />
        <Route path="quotes" element={withAdminSuspense(<AdminQuotesPage />, 'quotes.read')} />
        <Route path="quotes/:quoteId" element={withAdminSuspense(<AdminQuotePage />, 'quotes.read')} />
        <Route path="analytics" element={withAdminSuspense(<AdminAnalyticsPage />, 'analytics.read')} />
        <Route path="operations" element={withAdminSuspense(<AdminOperationsPage />)} />
        <Route path="team" element={withAdminSuspense(<AdminTeamPage />, 'admins.read')} />
        <Route path="audit" element={withAdminSuspense(<AdminAuditPage />, 'audit.read')} />
      </Route>
      <Route path="/cart" element={<Navigate replace to="/inquiry-list" />} />
      <Route path="/order-request" element={<Navigate replace to="/request-quote" />} />
      <Route path="/orders" element={<Navigate replace to="/my-inquiries" />} />
      <Route path="/orders/:orderId" element={<LegacyInquiryDetailRedirect />} />
    </Route>
    <Route path="/:locale" element={<LocaleShell />}>
      <Route index element={<HomePage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="collections/:collectionId" element={<ProductsPage />} />
      <Route path="piercing/:piercingType" element={<ProductsPage />} />
      <Route path="material/:baseMaterial" element={<ProductsPage />} />
      <Route path="material/:baseMaterial/piercing/:piercingType" element={<ProductsPage />} />
      <Route path="shape/:shape" element={<ProductsPage />} />
      <Route path="shape/:shape/piercing/:piercingType" element={<ProductsPage />} />
      <Route path="products/:productId" element={<ProductDetailPage />} />
      <Route path="inquiry-list" element={<InquiryListPage />} />
      <Route path="request-quote" element={<RequestQuotePage />} />
      <Route path="my-inquiries" element={<MyInquiriesPage />} />
      <Route path="my-inquiries/:inquiryId" element={<MyInquiriesPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="approval-pending" element={<ApprovalPendingPage />} />
      <Route path="admin" element={<AdminWorkspaceRoute />}>
        <Route index element={withAdminSuspense(<AdminDashboardPage />, 'dashboard.read')} />
        <Route path="buyers" element={withAdminSuspense(<AdminBuyersPage />, 'buyers.read')} />
        <Route path="buyers/:buyerId" element={withAdminSuspense(<AdminBuyerDetailPage />, 'buyers.read')} />
        <Route path="catalog/new" element={<LegacyAdminCatalogRedirect />} />
        <Route path="products" element={withAdminSuspense(<AdminProductsPage />, 'catalog.read')} />
        <Route path="products/new" element={withAdminSuspense(<AdminProductEditorPage />, 'catalog.write')} />
        <Route path="products/:productId/edit" element={withAdminSuspense(<AdminProductEditorPage />, 'catalog.write')} />
        <Route path="categories" element={withAdminSuspense(<AdminCategoriesPage />, 'catalog.read')} />
        <Route path="home-showcase" element={withAdminSuspense(<AdminHomeShowcasePage />, 'catalog.read')} />
        <Route path="home-editor" element={withAdminSuspense(<AdminHomeEditorPage />, 'catalog.write')} />
        <Route path="prices" element={withAdminSuspense(<AdminPricesPage />, 'prices.read')} />
        <Route path="fx" element={withAdminSuspense(<AdminFxPage />, 'prices.read')} />
        <Route path="inquiries" element={withAdminSuspense(<AdminInquiriesPage />, 'inquiries.read')} />
        <Route path="inquiries/:inquiryId" element={withAdminSuspense(<AdminInquiryDetailPage />, 'inquiries.read')} />
        <Route path="quotes" element={withAdminSuspense(<AdminQuotesPage />, 'quotes.read')} />
        <Route path="quotes/:quoteId" element={withAdminSuspense(<AdminQuotePage />, 'quotes.read')} />
        <Route path="analytics" element={withAdminSuspense(<AdminAnalyticsPage />, 'analytics.read')} />
        <Route path="operations" element={withAdminSuspense(<AdminOperationsPage />)} />
        <Route path="team" element={withAdminSuspense(<AdminTeamPage />, 'admins.read')} />
        <Route path="audit" element={withAdminSuspense(<AdminAuditPage />, 'audit.read')} />
      </Route>
      <Route path="cart" element={<Navigate replace to="../inquiry-list" />} />
      <Route path="order-request" element={<Navigate replace to="../request-quote" />} />
      <Route path="orders" element={<Navigate replace to="../my-inquiries" />} />
      <Route path="orders/:orderId" element={<LegacyInquiryDetailRedirect />} />
    </Route>
    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes></Suspense></CommerceProvider></BrowserRouter>
}

export default App
