import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { CommerceProvider } from './commerce/CommerceContext'
import { StoreShell } from './components/StoreShell'
import { AccountPage } from './pages/AccountPage'
import { AdminPage } from './pages/AdminPage'
import { AuthPage } from './pages/AuthPage'
import { CartPage } from './pages/CartPage'
import { HomePage } from './pages/HomePage'
import { OrderRequestPage } from './pages/OrderRequestPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductsPage } from './pages/ProductsPage'

function App() {
  return (
    <BrowserRouter>
      <CommerceProvider>
        <Routes>
          <Route element={<StoreShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:productId" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/order-request" element={<OrderRequestPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrdersPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </CommerceProvider>
    </BrowserRouter>
  )
}

export default App
