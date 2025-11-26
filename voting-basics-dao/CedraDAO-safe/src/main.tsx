import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';
import App from './App.tsx';
import './index.css';
import { CedraWalletProvider } from './contexts/CedraWalletProvider';
import { AlertProvider } from './components/alert/AlertContext';
import { DAOStateProvider } from './contexts/DAOStateContext';

// Polyfill Buffer for mobile wallets
window.Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <CedraWalletProvider autoConnect={false}>
          <DAOStateProvider>
            <App />
          </DAOStateProvider>
        </CedraWalletProvider>
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>
);
