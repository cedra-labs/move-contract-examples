import React, { useState } from 'react';
import { Vault, Plus, ArrowUpRight, ArrowDownRight, AlertCircle, RotateCcw } from 'lucide-react';
import { useVault } from '../hooks/useVault';

interface VaultManagerProps {
  daoId: string;
  treasuryObject?: string;
}

const VaultManager: React.FC<VaultManagerProps> = ({ daoId, treasuryObject }) => {
  const {
    vaults,
    error,
    isAdmin,
    createVault,
    depositToVault,
    withdrawFromVault,
    refreshData,
    KNOWN_TOKENS
  } = useVault(daoId, treasuryObject);

  const isDark = true;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [createTokenAddress, setCreateTokenAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleCreateVault = async () => {
    if (!createTokenAddress.trim()) {
      setModalError('Please enter a token metadata address');
      return;
    }

    try {
      setIsProcessing(true);
      setModalError(null);
      await createVault(createTokenAddress.trim());
      setShowCreateModal(false);
      setCreateTokenAddress('');
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedVault || !depositAmount) {
      setModalError('Please enter a valid amount');
      return;
    }

    try {
      setIsProcessing(true);
      setModalError(null);
      const amount = parseFloat(depositAmount);
      await depositToVault(selectedVault.address, amount, selectedVault.decimals);
      setShowDepositModal(false);
      setDepositAmount('');
      setSelectedVault(null);
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedVault || !withdrawAmount) {
      setModalError('Please enter a valid amount');
      return;
    }

    try {
      setIsProcessing(true);
      setModalError(null);
      const amount = parseFloat(withdrawAmount);
      await withdrawFromVault(selectedVault.address, amount, selectedVault.decimals);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedVault(null);
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openDepositModal = (vault: any) => {
    setSelectedVault(vault);
    setShowDepositModal(true);
    setModalError(null);
  };

  const openWithdrawModal = (vault: any) => {
    setSelectedVault(vault);
    setShowWithdrawModal(true);
    setModalError(null);
  };

  const getKnownTokenInfo = (metadataAddress: string): any => {
    return (KNOWN_TOKENS as any)[metadataAddress as any];
  };


  // Remove loading animation completely

  return (
    <div className="bg-transparent">
      <div className="border border-white/10 rounded-xl py-4 px-4 space-y-4" style={{ background: 'transparent' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Vault className="w-5 h-5" style={{ color: '#e1fd6a' }} />
            <h3 className="text-lg font-semibold text-white">DAO Vaults</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => refreshData()}
              className="flex items-center justify-center p-2 bg-gray-700/50 hover:bg-gray-600/70 text-white rounded-lg transition-all duration-200 border border-gray-600/30"
              title="Refresh vault data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-slate-900 hover:opacity-90"
                style={{ background: '#e1fd6a' }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create Vault</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}

        {vaults.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Vault className="w-12 h-12 mx-auto mb-3" style={{ color: '#e1fd6a' }} />
            <h4 className="text-base font-medium text-white mb-2">No Vaults Created</h4>
            <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
              {isAdmin
                ? "Create your first vault to manage FA tokens like USDC and USDT."
                : "No vaults have been created by the DAO admins yet."
              }
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 px-3 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider w-1/2 sm:w-auto">Token</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Vault</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden xl:table-cell">FA Address</th>
                  <th className="text-right py-3 px-3 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider w-16 sm:w-auto">Total</th>
                  <th className="text-right py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Available</th>
                  <th className="text-right py-3 px-3 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider w-12 sm:w-auto">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {vaults.map((vault) => {
                  const knownToken = getKnownTokenInfo(vault.metadata);
                  const tokenSymbol = vault.tokenSymbol || knownToken?.symbol || 'UNKNOWN';
                  const tokenName = vault.tokenName || knownToken?.name || 'Unknown Token';

                  return (
                    <tr key={vault.address} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-3 sm:px-4 align-top">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#e1fd6a', color: '#0f172a' }}>
                            {vault.iconUrl ? (
                              <img
                                src={vault.iconUrl}
                                alt={`${tokenSymbol} icon`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : null}
                            {!vault.iconUrl && tokenSymbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium text-sm truncate">{tokenSymbol}</div>
                            <div className="text-gray-400 text-xs truncate">{tokenName}</div>
                            {/* Strategy UI removed – not in treasury ABI */}
                          </div>
                        </div>
                        {/* Mobile info */}
                        <div className="mt-2 lg:hidden space-y-1">
                          <div className="text-gray-500 text-xs font-mono">
                            <div>Vault: {vault.address.slice(0, 8)}...{vault.address.slice(-6)}</div>
                            <div className="xl:hidden">FA: {vault.metadata.slice(0, 8)}...{vault.metadata.slice(-6)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-green-400 md:hidden">Available: {vault.idleAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 hidden lg:table-cell">
                        <div className="text-gray-300 font-mono text-xs">
                          {vault.address.slice(0, 8)}...{vault.address.slice(-6)}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(vault.address)}
                          className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                          title="Copy vault address"
                        >
                          Copy
                        </button>
                      </td>
                      <td className="py-3 px-3 sm:px-4 hidden xl:table-cell">
                        <div className="text-gray-300 font-mono text-xs">
                          {vault.metadata.slice(0, 8)}...{vault.metadata.slice(-6)}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(vault.metadata)}
                          className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                          title="Copy FA address"
                        >
                          Copy
                        </button>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right w-20 sm:w-auto">
                        <div className="text-white font-medium text-sm">
                          {vault.totalAssets.toLocaleString(undefined, {
                            maximumFractionDigits: 2
                          })}
                        </div>
                        {tokenSymbol !== 'UNKNOWN' && (
                          <div className="text-gray-400 text-xs">{tokenSymbol}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right hidden md:table-cell">
                        <div className="text-green-400 font-medium text-sm">
                          {vault.idleAssets.toLocaleString(undefined, {
                            maximumFractionDigits: 2
                          })}
                        </div>
                        {tokenSymbol !== 'UNKNOWN' && (
                          <div className="text-gray-400 text-xs">{tokenSymbol}</div>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-3 sm:px-4 w-12 sm:w-auto">
                        <div className="flex justify-end space-x-1">
                          <button
                            onClick={() => openDepositModal(vault)}
                            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                            title="Deposit"
                          >
                            <ArrowDownRight className="w-4 h-4 text-green-400" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => openWithdrawModal(vault)}
                              className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                              title="Withdraw"
                            >
                              <ArrowUpRight className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* Create Vault Modal - Dark theme to match deposit modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }} onClick={() => setShowCreateModal(false)}>
          <div
            className={`${isDark ? 'border-white/10' : 'bg-white border-black/10'} rounded-xl p-5 w-full max-w-md border shadow-2xl`}
            style={isDark ? { backgroundColor: '#101010' } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Fungible Address (Create Vault)</h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>FA (Fungible Token) Metadata Address</label>
                <input
                  type="text"
                  value={createTokenAddress}
                  onChange={(e) => setCreateTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  Enter the FA metadata address (e.g., USDC, USDT)
                </p>
              </div>

              <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Note:</strong> You can find metadata addresses in your network's token registry or from deployments.
                </p>
              </div>

              {modalError && (
                <div className={`rounded-lg p-3 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{modalError}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateTokenAddress('');
                    setModalError(null);
                  }}
                  className={`flex-1 h-11 px-6 rounded-xl font-semibold transition-colors ${isDark ? 'bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVault}
                  disabled={isProcessing}
                  className="flex-1 h-11 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 hover:opacity-90"
                  style={{ background: '#e1fd6a' }}
                >
                  {isProcessing ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal - Dark theme background */}
      {showDepositModal && selectedVault && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }} onClick={() => setShowDepositModal(false)}>
          <div
            className={`${isDark ? 'border-white/10' : 'bg-white border-black/10'} rounded-xl p-5 w-full max-w-md border shadow-2xl`}
            style={isDark ? { backgroundColor: '#101010' } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Deposit to {selectedVault.tokenSymbol} Vault</h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount</label>
                <input
                  type="text"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  Amount in {selectedVault.tokenSymbol}
                </p>
              </div>

              {/* Balance summary removed as requested */}

              {modalError && (
                <div className={`rounded-lg p-3 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{modalError}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing || !depositAmount}
                  className="flex-1 h-11 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 hover:opacity-90"
                  style={{ background: '#e1fd6a' }}
                >
                  {isProcessing ? 'Depositing...' : 'Deposit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal - Dark theme background */}
      {showWithdrawModal && selectedVault && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }} onClick={() => setShowWithdrawModal(false)}>
          <div
            className={`${isDark ? 'border-white/10' : 'bg-white border-black/10'} rounded-xl p-5 w-full max-w-md border shadow-2xl`}
            style={isDark ? { backgroundColor: '#101010' } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Withdraw from {selectedVault.tokenSymbol} Vault</h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount</label>
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  Amount in {selectedVault.tokenSymbol} (max: {selectedVault.idleAssets.toLocaleString()})
                </p>
              </div>

              {/* Admin note retained without balance summary */}

              {modalError && (
                <div className={`rounded-lg p-3 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{modalError}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleWithdraw}
                  disabled={isProcessing || !withdrawAmount}
                  className="flex-1 h-11 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 hover:opacity-90"
                  style={{ background: '#e1fd6a' }}
                >
                  {isProcessing ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultManager;