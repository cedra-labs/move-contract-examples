/**
 * WalletConnect Component
 *
 * Provides wallet connection functionality using Cedra Wallet Standard.
 * Supports multiple AIP-62 compatible wallets (Nightly, Petra, etc.)
 *
 * Features:
 * - Wallet detection via Cedra wallet standard
 * - Connection modal with wallet selection
 * - Wallet status display in header
 * - Disconnect functionality
 * - Profile dropdown menu
 */

import React, { useState, useRef, useEffect } from 'react';
import { Wallet, X, ChevronDown, ArrowLeft, User } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useWallet } from '../contexts/CedraWalletProvider';
import type { CedraWallet } from '@cedra-labs/wallet-standard';
import { useAlert } from './alert/AlertContext';
import { truncateAddress } from '../utils/addressUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelected: (wallet: CedraWallet) => void;
  wallets: CedraWallet[];
}

interface WalletConnectButtonProps {
  onProfileClick?: () => void;
}

// ============================================================================
// WALLET MODAL COMPONENT
// ============================================================================

/**
 * Modal component for wallet selection and connection
 * Shows list of detected wallets and handles the connection flow
 */
const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onWalletSelected,
  wallets,
}) => {
  // ========== State Management ==========
  const [selectedWallet, setSelectedWallet] = useState<CedraWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout | null>(null);

  const { showAlert } = useAlert();
  const { connected, account } = useWallet();
  const isDarkTheme = true;

  // ========== Effects ==========

  /**
   * Monitor wallet connection state and auto-close modal on success
   */
  useEffect(() => {
    if (isConnecting && connected && account && selectedWallet) {

      // Clear connection timeout
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        setTimeoutRef(null);
      }

      setIsConnecting(false);
      showAlert('Wallet connected', 'success');
      onClose();
    }
  }, [connected, account, isConnecting, selectedWallet, showAlert, onClose, timeoutRef]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [timeoutRef]);

  // ========== Event Handlers ==========

  /**
   * Handle wallet selection and initiate connection
   */
  const handleWalletSelected = async (wallet: CedraWallet) => {
    setSelectedWallet(wallet);
    setIsConnecting(true);
    setError(null);

    try {
      await onWalletSelected(wallet);

      // Set connection timeout (15 seconds)
      const timeoutId = setTimeout(() => {
        if (isConnecting && !connected) {
          setIsConnecting(false);
          setError('Connection timeout - please try again');
        }
      }, 15000);

      setTimeoutRef(timeoutId);

    } catch (e: any) {
      console.error('Wallet connection error:', e);

      // Clear timeout on error
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        setTimeoutRef(null);
      }

      // Handle user rejection silently, show alert for other errors
      if (e?.message?.includes('User rejected') || e?.message?.includes('rejected')) {
        setIsConnecting(false);
        setError(null);
      } else {
        showAlert('Connection failed: ' + (e?.message || 'Unknown error'), 'error');
        setError('Connection failed');
        setIsConnecting(false);
      }
    }
  };

  /**
   * Handle wallet installation redirect
   */
  const handleWalletInstall = (wallet: CedraWallet) => {
    showAlert('Wallet not installed. Please install and try again.', 'error');
    if (wallet.url) {
      window.open(wallet.url, '_blank');
    } else {
      window.open(`https://www.google.com/search?q=${wallet.name}+wallet+install`, '_blank');
    }
  };

  /**
   * Reset modal state and close
   */
  const handleClose = () => {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
      setTimeoutRef(null);
    }
    setSelectedWallet(null);
    setIsConnecting(false);
    setError(null);
    onClose();
  };

  /**
   * Handle back button click (returns to wallet list)
   */
  const handleBackClick = () => {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
      setTimeoutRef(null);
    }
    setSelectedWallet(null);
    setIsConnecting(false);
    setError(null);
  };

  // ========== Early Returns ==========

  if (!isOpen) return null;

  // ========== Render: Connection View ==========

  if (selectedWallet) {
    const isWalletReady = true; // All detected Cedra wallets are ready

    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="modal-container" style={{
          background: isDarkTheme ? '#0f0f11' : '#ffffff',
          color: isDarkTheme ? '#f5f5f5' : '#111827',
          borderRadius: 20,
          minWidth: 360,
          maxWidth: 400,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
        }}>

          {/* Back Button */}
          <button
            onClick={handleBackClick}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <ArrowLeft size={20} />
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>

            {/* Wallet Icon with Loading Animation */}
            <div className="wallet-icon-container">
              {selectedWallet.icon ? (
                <img
                  src={selectedWallet.icon}
                  alt={selectedWallet.name}
                  width={64}
                  height={64}
                  className={isConnecting ? 'wallet-icon-pulse' : ''}
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: 2
                  }}
                />
              ) : (
                <div
                  className={isConnecting ? 'wallet-icon-pulse' : ''}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: 2
                  }}>
                  🔮
                </div>
              )}

              {/* Square Loader Animation */}
              {isConnecting && (
                <div className="square-loader">
                  <svg viewBox="0 0 100 100">
                    <rect x="10" y="10" width="80" height="80" rx="18" ry="18" className="square-progress" pathLength="100" />
                  </svg>
                </div>
              )}
            </div>

            {/* Wallet Name and Status */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--text)',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
              }}>
                {selectedWallet.name}
              </h3>
              <p style={{
                fontSize: 16,
                color: 'var(--text-dim)',
                margin: 0,
                lineHeight: 1.4
              }}>
                {isConnecting ? 'Connecting to your wallet...' :
                  isWalletReady ? 'Ready to connect' : 'Installation required'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 12,
                padding: 16,
                color: '#f87171',
                fontSize: 14,
                textAlign: 'center',
                width: '100%'
              }}>
                {error}
              </div>
            )}

            {/* Action Button */}
            {!isConnecting && (
              <button
                onClick={() => isWalletReady ? handleWalletSelected(selectedWallet) : handleWalletInstall(selectedWallet)}
                style={{
                  background: isWalletReady
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: 'var(--text)',
                  padding: '14px 32px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: 200
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isWalletReady ? 'Connect Wallet' : 'Install Wallet'}
              </button>
            )}

          </div>
        </div>
      </div>
    );
  }

  // ========== Render: Wallet Selection View ==========

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="modal-container" style={{
        background: isDarkTheme ? '#0f0f11' : '#ffffff',
        color: isDarkTheme ? '#f5f5f5' : '#111827',
        borderRadius: 20,
        minWidth: 360,
        maxWidth: 420,
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
      }}>

        {/* Modal Header */}
        <div className="modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: 24
        }}>
          <h3 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#e1fd6a',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Connect Wallet
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#e1fd6a',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Wallet List */}
        <div className="modal-content" style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="wallet-list" style={{ flex: 1 }}>
            <div className="wallet-items" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wallets?.map((wallet) => (
                <div
                  key={wallet.name}
                  className="wallet-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    background: isDarkTheme ? '#161618' : '#f8fafc',
                    transition: 'all 0.2s ease',
                    boxShadow: isDarkTheme ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                  onClick={() => handleWalletSelected(wallet)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkTheme ? '#1e1e22' : '#eef2f7';
                    e.currentTarget.style.borderColor = isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDarkTheme ? '#161618' : '#f8fafc';
                    e.currentTarget.style.borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Wallet Icon */}
                    {wallet.icon ? (
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        width={32}
                        height={32}
                        style={{ borderRadius: 8 }}
                      />
                    ) : (
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16
                      }}>
                        🔮
                      </div>
                    )}

                    {/* Wallet Info */}
                    <div>
                      <span style={{
                        fontWeight: 600,
                        color: 'var(--text)',
                        fontSize: 16,
                        display: 'block'
                      }}>
                        {wallet.name}
                      </span>
                      <span style={{
                        fontSize: 14,
                        color: 'var(--text-dim)',
                        display: 'block'
                      }}>
                        Ready to connect
                      </span>
                    </div>
                  </div>

                  {/* Connect Badge */}
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'transparent',
                    color: '#e1fd6a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Connect
                  </div>
                </div>
              ))}
            </div>

            {/* No Wallets Message */}
            {wallets.length === 0 && (
              <div className="no-wallets-message" style={{
                marginTop: 24,
                color: isDarkTheme ? '#9ca3af' : '#6b7280',
                textAlign: 'center',
                padding: 24,
                background: isDarkTheme ? '#161618' : '#f8fafc',
                borderRadius: 16,
                border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
              }}>
                <p style={{ margin: 0, fontSize: 16 }}>
                  No wallets detected. Please install a supported wallet extension.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            flexShrink: 0
          }}>
            <p style={{
              fontSize: 12,
              color: '#e1fd6a',
              margin: 0,
              lineHeight: 1.4
            }}>
              Powered by Cedra Network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WALLET CONNECT BUTTON COMPONENT
// ============================================================================

/**
 * Main wallet connect button component
 * Shows in header and provides wallet connection/disconnect functionality
 */
const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ onProfileClick }) => {
  // ========== State Management ==========
  const { connect, disconnect, wallets, account, wallet, connected } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [modalKey, setModalKey] = useState(0); // Force modal reset on reopen
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showAlert } = useAlert();
  const isDarkTheme = true;

  // ========== Styles ==========
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    border: 'none',
    background: '#e1fd6a',
    borderRadius: '12px',
    height: 'auto',
    minWidth: 120,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: '#000000',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  };

  // ========== Effects ==========

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========== Helper Functions ==========

  /**
   * Get wallet icon or fallback
   */
  const getWalletIcon = () => {
    if (wallet && wallet.icon) {
      return <img src={wallet.icon} alt={wallet.name} width={18} height={18} style={{ borderRadius: 4, background: 'none' }} />;
    }
    return <span style={{ fontSize: 16 }}>🔮</span>;
  };

  // ========== Event Handlers ==========

  /**
   * Handle wallet connection
   */
  const handleConnect = async (wallet: CedraWallet) => {
    try {

      // Clear stale connection if exists
      if (connected && !account) {
        await disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await connect(wallet);
    } catch (e) {
      console.error('Wallet connection error:', e);
      throw e;
    }
  };

  /**
   * Handle wallet disconnect
   */
  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await disconnect();
      setModalKey((k) => k + 1);
      showAlert('Wallet disconnected', 'info');
    } catch (e) {
      showAlert('Network error on disconnect', 'error');
    }
  };

  /**
   * Open wallet modal
   */
  const handleOpenModal = () => {
    setModalKey((k) => k + 1);
    setShowModal(true);
  };

  /**
   * Handle button click - open modal or toggle dropdown
   */
  const handleButtonClick = () => {
    if (!connected || !account) {
      handleOpenModal();
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  // ========== Render ==========

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>

        {/* Main Button */}
        <button
          className="header-wallet-btn"
          style={buttonStyle}
          onClick={handleButtonClick}
          tabIndex={0}
        >
          {connected && account ? (
            <>
              {getWalletIcon()}
              <span style={{
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#000000',
                fontWeight: 600,
                letterSpacing: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {truncateAddress(account.address)}
              </span>
              <ChevronDown
                size={16}
                style={{
                  marginLeft: 4,
                  color: '#000000',
                  transition: 'transform 0.2s',
                  transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" style={{ color: '#000000' }} />
              <span style={{ color: '#000000' }}>Connect</span>
            </>
          )}
        </button>

        {/* Wallet Modal */}
        {typeof window !== 'undefined' && ReactDOM.createPortal(
          <WalletModal
            key={modalKey}
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onWalletSelected={handleConnect}
            wallets={wallets}
          />,
          document.body
        )}

        {/* Dropdown Menu */}
        {connected && account && showDropdown && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: isDarkTheme ? '#252527' : '#ffffff',
              border: isDarkTheme ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              padding: 8,
              minWidth: 160,
              boxShadow: isDarkTheme ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
              zIndex: 1001
            }}
          >
            {/* Profile Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onProfileClick) {
                  onProfileClick();
                }
                setShowDropdown(false);
              }}
              onMouseEnter={() => setHoveredItem('profile')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: hoveredItem === 'profile' ? (isDarkTheme ? '#2f3033' : '#f3f4f6') : (isDarkTheme ? '#252527' : '#ffffff'),
                border: 'none',
                color: isDarkTheme ? '#f5f5f5' : '#111827',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'background 0.2s',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <User size={16} />
              Profile
            </button>

            {/* Disconnect Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnect(e);
                setShowDropdown(false);
              }}
              onMouseEnter={() => setHoveredItem('disconnect')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: hoveredItem === 'disconnect' ? (isDarkTheme ? '#2f3033' : '#f3f4f6') : (isDarkTheme ? '#252527' : '#ffffff'),
                border: 'none',
                color: isDarkTheme ? '#f5f5f5' : '#111827',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'background 0.2s',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <X size={16} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default WalletConnectButton;
