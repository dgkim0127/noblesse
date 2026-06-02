import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import './App.css'
import { CommerceProvider } from './commerce/CommerceContext'
import { StoreShell } from './components/StoreShell'
import { AccountPage } from './pages/AccountPage'
import { HomePage } from './pages/HomePage'
import { InquiryListPage } from './pages/InquiryListPage'
import { MyInquiriesPage } from './pages/MyInquiriesPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductsPage } from './pages/ProductsPage'
import { RequestQuotePage } from './pages/RequestQuotePage'

function LegacyInquiryDetailRedirect() {
  const { orderId } = useParams()
  return <Navigate replace to={`/my-inquiries/${orderId}`} />
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
      <Route path="/cart" element={<Navigate replace to="/inquiry-list" />} />
      <Route path="/order-request" element={<Navigate replace to="/request-quote" />} />
      <Route path="/orders" element={<Navigate replace to="/my-inquiries" />} />
      <Route path="/orders/:orderId" element={<LegacyInquiryDetailRedirect />} />
    </Route>
    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes></CommerceProvider></BrowserRouter>
}

export default App
