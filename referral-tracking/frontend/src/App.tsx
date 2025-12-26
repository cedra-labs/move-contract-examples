import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CedraWalletAdapterProvider } from './contexts/WalletProvider'
import Home from './app/home'
import Admin from './app/admin'
import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <CedraWalletAdapterProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </CedraWalletAdapterProvider>
    </BrowserRouter>
  )
}

export default App
