import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/useWallet';

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const { wallets, notDetectedWallets, connect, isLoading } = useWallet();

  // Disable page scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const handleWalletClick = async (walletName: string) => {
    setIsConnecting(walletName);
    
    try {
      await connect(walletName);
      onClose();
    } catch (error) {
      // Error handled in WalletProvider
    } finally {
      setIsConnecting(null);
    }
  };

  const installedWalletNames = new Set(wallets.map(w => w.name));
  const uniqueNotDetectedWallets = notDetectedWallets.filter(w => !installedWalletNames.has(w.name));
  
  const filteredWallets = wallets.filter(w => {
    const name = w.name.toLowerCase();
    return !name.includes('google') && !name.includes('apple');
  });
  
  const filteredNotDetectedWallets = uniqueNotDetectedWallets.filter(w => {
    const name = w.name.toLowerCase();
    return !name.includes('google') && !name.includes('apple');
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Connect Wallet
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto px-2 pt-2">
                {isLoading && filteredWallets.length === 0 && filteredNotDetectedWallets.length === 0 ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>Loading wallets...</span>
                  </div>
                ) : filteredWallets.length === 0 && filteredNotDetectedWallets.length === 0 && !isLoading ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💼</div>
                    <p className="text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>No Cedra wallets available</p>
                  </div>
                ) : (
                  <>
                    {[...filteredWallets].sort((a, b) => a.name.localeCompare(b.name)).map((wallet) => (
                      <motion.button
                        key={wallet.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleWalletClick(wallet.name)}
                        disabled={isConnecting === wallet.name || isLoading}
                        className="w-full p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-blue-500 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 flex-shrink-0">
                            <img 
                              src={wallet.icon} 
                              alt={`${wallet.name} icon`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                            <div className="w-full h-full text-2xl flex items-center justify-center" style={{ display: 'none' }}>🔷</div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-gray-900 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {wallet.name}
                            </h3>
                          </div>
                          {isConnecting === wallet.name && (
                            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                      </motion.button>
                    ))}

                    {[...filteredNotDetectedWallets].sort((a, b) => a.name.localeCompare(b.name)).map((wallet) => (
                      <motion.div
                        key={wallet.name}
                        className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 flex-shrink-0">
                            <img 
                              src={wallet.icon} 
                              alt={`${wallet.name} icon`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                            <div className="w-full h-full text-2xl flex items-center justify-center" style={{ display: 'none' }}>💼</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-gray-900 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {wallet.name}
                              </h3>
                              <span className="text-orange-600 text-xs px-2 py-1 bg-orange-100 rounded-full" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Not Installed
                              </span>
                            </div>
                          </div>
                          <a
                            href={wallet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 text-sm hover:text-blue-600 transition-colors font-medium"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            Install
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-gray-500 text-xs text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                  By connecting a wallet, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WalletSelectorModal;

