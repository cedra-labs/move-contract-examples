import React, { createContext, useContext, useState } from 'react';

// --------------------
// Global Alert Context
// --------------------
// Provides a global alert system for the app
interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}
const AlertContext = createContext<AlertContextType>({ showAlert: () => {} });
export const useAlert = () => useContext(AlertContext);

// AlertProvider component to wrap your app (put in main.tsx or App.tsx)
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  // Show alert for 2.5s
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 2500);
  };
  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#252527',
          color: '#ffffff',
          padding: '10px 16px',
          fontWeight: 600,
          fontSize: 14,
          zIndex: 2000,
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16 }}>
            {alert.type === 'success' ? '✓' : alert.type === 'error' ? '⚠' : 'ℹ'}
          </span>
          <span>{alert.message}</span>
        </div>
      )}
    </AlertContext.Provider>
  );
}; 