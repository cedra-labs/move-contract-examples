import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CedraWalletAdapterProvider } from './contexts/WalletProvider'
import Home from './app/home'
import Create from './app/create'
import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <CedraWalletAdapterProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </CedraWalletAdapterProvider>
    </BrowserRouter>
  )
}

export default App
