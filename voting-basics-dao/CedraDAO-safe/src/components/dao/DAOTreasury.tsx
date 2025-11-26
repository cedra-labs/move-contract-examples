import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Plus, Minus, Clock, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTreasury } from '../../hooks/useTreasury';
import { DAO } from '../../types/dao';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { BalanceService } from '../../useServices/useBalance';
import { truncateAddress } from '../../utils/addressUtils';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { useAlert } from '../alert/AlertContext';
import VaultManager from '../VaultManager';
import { useSectionLoader } from '../../hooks/useSectionLoader';
// import SectionLoader from '../common/SectionLoader';

interface DAOTreasuryProps {
  dao: DAO;
}

const DAOTreasury: React.FC<DAOTreasuryProps> = ({ dao }) => {
  const { account } = useWallet();
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [amount, setAmount] = useState('');
  // Render both sections sequentially (no tabs)
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { showAlert } = useAlert();
  const [isTogglingPublicDeposits, setIsTogglingPublicDeposits] = useState(false);
  const [movePrice, setMovePrice] = useState<number | null>(null);
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const [showDepositDetails, setShowDepositDetails] = useState<boolean>(false);
  const [showWithdrawDetails, setShowWithdrawDetails] = useState<boolean>(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 10;
  const isWalletConnected = !!account?.address;

  // Session cache for Treasury (instant tab switches)
  // @ts-ignore
  const treasurySessionCache: Map<string, any> = (window as any).__treasuryCache || ((window as any).__treasuryCache = new Map());
  const SESSION_TTL_MS = 5 * 60 * 1000;
  const MAX_STALE_MS = 10 * 60 * 1000;

  // Section loader for Treasury tab
  const sectionLoader = useSectionLoader();

  // Use the treasury hook
  const {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    togglePublicDeposits,
    refreshData
  } = useTreasury(dao.id);


  // Initialize section loading
  useEffect(() => {
    // Hydrate from session cache if present
    const cached = treasurySessionCache.get(dao.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < SESSION_TTL_MS) {
      if (typeof cached.movePrice === 'number') setMovePrice(cached.movePrice);
      if (typeof cached.totalStaked === 'number') setTotalStaked(cached.totalStaked);
    } else if (cached && (now - cached.timestamp) < MAX_STALE_MS) {
      if (typeof cached.movePrice === 'number') setMovePrice(cached.movePrice);
      if (typeof cached.totalStaked === 'number') setTotalStaked(cached.totalStaked);
      // Silent background refresh will run below
    }
    const loadTreasuryData = async () => {
      await refreshData();

      // Also fetch MOVE price with CORS proxy
      try {
        // Use CORS proxy to bypass CORS restrictions
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const apiUrl = encodeURIComponent('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');

        const response = await fetch(corsProxy + apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const price = data?.movement?.usd;

        if (typeof price === 'number' && isFinite(price) && price > 0) {
          setMovePrice(price);
          treasurySessionCache.set(dao.id, { ...(treasurySessionCache.get(dao.id) || {}), movePrice: price, timestamp: Date.now() });
        } else {
          throw new Error('No valid price in response');
        }
      } catch (error: any) {
        // Silent fallback to recent MOVE price
        setMovePrice(0.08566);
      }
    };

    sectionLoader.executeWithLoader(loadTreasuryData);
  }, [dao.id, account?.address]);

  const retryTreasuryData = () => {
    const loadTreasuryData = async () => {
      await refreshData();
    };
    sectionLoader.executeWithLoader(loadTreasuryData);
  };

  // Test function to create a small treasury deposit for testing
  const testTreasuryDeposit = async () => {
    if (!account?.address) {
      showAlert('Please connect your wallet first', 'error');
      return;
    }

    try {
      await deposit(0.001); // Deposit 0.001 MOVE for testing
      showAlert('Test deposit successful! Check treasury activities.', 'success');
    } catch (error: any) {
      console.error('Test deposit failed:', error);
      showAlert(`Test deposit failed: ${error.message}`, 'error');
    }
  };

  // Original MOVE price fetch logic (now part of loading)
  const fetchMovePrice = async () => {
    try {
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const apiUrl = encodeURIComponent('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');

      const response = await fetch(corsProxy + apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const price = data?.movement?.usd;
      if (typeof price === 'number' && isFinite(price) && price > 0) {
        setMovePrice(price);
        treasurySessionCache.set(dao.id, {
          ...(treasurySessionCache.get(dao.id) || {}),
          movePrice: price,
          totalStaked,
          timestamp: Date.now(),
        });
      } else {
        throw new Error('No valid price in response');
      }
    } catch (error) {
      setMovePrice(0.08566); // Use recent MOVE price as fallback
    }
  };

  // Old useEffect cleanup
  useEffect(() => {
    // Refresh price every 5 minutes
    const interval = setInterval(fetchMovePrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch total staked amount
  React.useEffect(() => {
    const fetchTotalStaked = async () => {
      try {
        const totalStakedRes = await cedraClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::staking::get_total_staked`, 
            functionArguments: [dao.id] 
          } 
        });
        const totalStakedAmount = BalanceService.octasToCedra(Number(totalStakedRes?.[0] || 0));
        setTotalStaked(totalStakedAmount);
        treasurySessionCache.set(dao.id, {
          ...(treasurySessionCache.get(dao.id) || {}),
          totalStaked: totalStakedAmount,
          movePrice,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.warn('Failed to fetch total staked:', error);
        setTotalStaked(0);
      }
    };

    fetchTotalStaked();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTotalStaked, 30 * 1000);
    return () => clearInterval(interval);
  }, [dao.id]);

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const cached = treasurySessionCache.get(dao.id);
      const now = Date.now();
      if (cached && (now - cached.timestamp) >= SESSION_TTL_MS && (now - cached.timestamp) < MAX_STALE_MS) {
        refreshData();
        fetchMovePrice();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid amount', 'error');
      return;
    }

    let mounted = true;

    try {
      setIsDepositing(true);

      const depositAmount = parseFloat(amount);
      await deposit(depositAmount);

      if (mounted) {
        showAlert(`Successfully deposited ${depositAmount.toFixed(3)} CEDRA to treasury`, 'success');
        setShowDepositForm(false);
        setAmount('');
      }
    } catch (error: any) {
      console.error('Deposit failed:', error);
      if (mounted) {
        showAlert(error.message || 'Failed to deposit tokens', 'error');
      }
    } finally {
      if (mounted) {
        setIsDepositing(false);
      }
    }

    return () => { mounted = false; };
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid amount', 'error');
      return;
    }

    let mounted = true;

    try {
      setIsWithdrawing(true);

      const withdrawAmount = parseFloat(amount);
      await withdraw(withdrawAmount);

      if (mounted) {
        showAlert(`Successfully withdrew ${withdrawAmount.toFixed(3)} CEDRA from treasury`, 'success');
        setShowWithdrawForm(false);
        setAmount('');
      }
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      if (mounted) {
        showAlert(error.message || 'Failed to withdraw tokens', 'error');
      }
    } finally {
      if (mounted) {
        setIsWithdrawing(false);
      }
    }

    return () => { mounted = false; };
  };

  const handleTogglePublicDeposits = async (allow: boolean) => {
    try {
      setIsTogglingPublicDeposits(true);
      
      await togglePublicDeposits(allow);
      
      showAlert(
        allow 
          ? 'Public deposits enabled - anyone can now deposit to this treasury' 
          : 'Public deposits disabled - only members and admins can deposit',
        'success'
      );
    } catch (error: any) {
      console.error('Toggle public deposits failed:', error);
      showAlert(error.message || 'Failed to update public deposit settings', 'error');
    } finally {
      setIsTogglingPublicDeposits(false);
    }
  };

  // Tabs removed – show Overview and Transactions together

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Main wrapper with border */}
      <div className="border border-white/10 rounded-xl py-4 px-4 space-y-6" style={{ background: 'transparent' }}>
        {/* Treasury value calculated from tokens */}
        <div className="text-left">
          <div className="text-5xl font-extrabold text-white">
            {(() => {
              const tokenMove = Math.max(0, treasuryData?.balance || 0);
              const stakedMove = Math.max(0, totalStaked || 0);
              const totalMove = tokenMove + stakedMove;
              const price = movePrice ?? 0.08566;
              return `$${(totalMove * price).toLocaleString(undefined,{ maximumFractionDigits: 2 })}`;
            })()}
          </div>
          <div className="text-lg font-bold text-gray-400">Treasury Value</div>
        </div>

        {/* Progress bars and chart side by side */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Assets left - compact list with progress */}
          <div className="w-full lg:flex-1 space-y-2">
            {(() => {
              const tokenAmount = Math.max(0, treasuryData?.balance ?? 0);
              const stakingAmount = Math.max(0, totalStaked);
              const total = Math.max(0.000001, tokenAmount + stakingAmount);
              const items = [
                { id: 'tokens', label: 'Tokens', value: tokenAmount, pct: (tokenAmount / total) * 100, bar: '#22d3ee' },
                { id: 'staking', label: 'Staking', value: stakingAmount, pct: (stakingAmount / total) * 100, bar: '#10b981' }
              ];
              return items.map((a) => (
                <div key={a.id} className={`relative overflow-hidden rounded-xl p-4 bg-white/5 border border-white/10`}>
                  {/* Progress fill using the card's gray tone */}
                  <div className="absolute left-0 top-0 h-full bg-white/10" style={{ width: `${Math.min(Math.max(a.pct, 0), 100)}%` }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{a.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {`$${(a.value * (movePrice ?? 0.08566)).toLocaleString(undefined,{maximumFractionDigits:2})}`}
                      </div>
                      <div className="text-sm text-gray-300 flex items-center justify-end space-x-1 mb-1">
                        <span>{a.value.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
                        <img
                          src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27"
                          alt="MOVE"
                          className="w-3 h-3 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <span className="hidden">MOVE</span>
                      </div>
                      {/* Percentage removed per request */}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Donut chart right - Made responsive */}
          <div className="w-full lg:w-auto lg:flex-shrink-0 flex flex-col items-center">
            <div
              className="w-full max-w-[280px] min-h-[224px]"
              style={{ height: '224px' }}
            >
            <ResponsiveContainer width="100%" height={224} minWidth={280} minHeight={224}>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={[
                    { name: 'Tokens', value: Math.max(0.01, treasuryData?.balance ?? 0.01) },
                    { name: 'Staking', value: Math.max(0.01, totalStaked || 0.01) }
                  ]}
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={1}
                  stroke="none"
                  isAnimationActive={false}
                  animationBegin={0}
                  animationDuration={0}
                  onClick={undefined}
                  onMouseEnter={undefined}
                  onMouseLeave={undefined}
                >
                  {["#e1fd6a", "#f59e0b"].map((c, idx) => (
                    <Cell
                      key={idx}
                      fill={c}
                      stroke="none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            </div>
            <div className="text-center text-gray-300 mt-2 text-sm">Tokens breakdown</div>
          </div>
        </div>

        {/* Public Deposits Toggle and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Admin-only section: Deposit status info and toggle */}
        {isAdmin && (
          <div>
            <div className="text-white font-medium mb-1">
              {treasuryData.allowsPublicDeposits ? 'Public Deposits Enabled' : 'Member-Only Deposits'}
            </div>
            <div className="text-sm text-gray-400">
              {treasuryData.allowsPublicDeposits
                ? 'Anyone can deposit tokens'
                : 'Only members can deposit'}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* Deposit Icon Button - Show if wallet connected AND (public deposits OR admin) */}
          {isWalletConnected && (treasuryData.allowsPublicDeposits || isAdmin) && (
            <button
              onClick={() => setShowDepositForm(true)}
              className="p-2 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/10 transition-all"
              title="Deposit"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* Withdraw Icon Button - Admin only */}
          {isWalletConnected && isAdmin && (
            <button
              onClick={() => setShowWithdrawForm(true)}
              className="p-2 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all"
              title="Withdraw"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}

          {/* Public/Members Toggle - Admin only */}
          {isAdmin && (
            <>
              <button
                onClick={() => handleTogglePublicDeposits(true)}
                disabled={treasuryData.allowsPublicDeposits || isTogglingPublicDeposits}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: treasuryData.allowsPublicDeposits ? '#e1fd6a' : 'rgba(255, 255, 255, 0.1)',
                  color: treasuryData.allowsPublicDeposits ? '#000000' : 'rgba(156, 163, 175, 1)'
                }}
              >
                Public
              </button>

              <button
                onClick={() => handleTogglePublicDeposits(false)}
                disabled={!treasuryData.allowsPublicDeposits || isTogglingPublicDeposits}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: !treasuryData.allowsPublicDeposits ? '#e1fd6a' : 'rgba(255, 255, 255, 0.1)',
                  color: !treasuryData.allowsPublicDeposits ? '#000000' : 'rgba(156, 163, 175, 1)'
                }}
              >
                Members
              </button>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Deposit Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }} onClick={() => setShowDepositForm(false)}>
          <div className={`border-white/10 rounded-xl p-5 w-full max-w-md border shadow-2xl`} style={{ backgroundColor: '#101010' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-lg font-semibold text-white`}>Deposit Tokens</h3>
              <button onClick={() => setShowDepositForm(false)} className={`text-gray-400 hover:text-white`}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 text-gray-400`}>Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/5 border border-white/10 text-white placeholder-gray-500`}
                  placeholder="0.000"
                />
                <p className={`text-xs mt-1 text-gray-500`}>Available: {userBalance.toFixed(3)} CEDRA</p>
              </div>

              {(() => {
                const amt = parseFloat(amount || '0');
                const octas = Number.isFinite(amt) && amt > 0 ? Math.floor(amt * 1e8) : 0;
                const objectAddress = (() => {
                  const obj = (treasuryData?.treasuryObject as any);
                  if (!obj) return undefined;
                  return typeof obj === 'string' ? obj : (obj?.inner || obj?.value || obj);
                })();
                const payloadPreview = objectAddress ? {
                  function: `${MODULE_ADDRESS}::treasury::deposit_to_object_typed`,
                  type_arguments: ['0x1::cedra_coin::CedraCoin'],
                  typeArguments: ['0x1::cedra_coin::CedraCoin'],
                  functionArguments: [objectAddress, String(octas)],
                  arguments: [objectAddress, String(octas)],
                } : {
                  function: `${MODULE_ADDRESS}::treasury::deposit`,
                  typeArguments: [],
                  functionArguments: [dao.id, String(octas)],
                };
                return (
                  <div className={`bg-white/5 border-white/10 border rounded-lg p-3 space-y-2`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`text-gray-300`}>From Wallet</span>
                      <span className="font-semibold text-red-400">-{Number.isFinite(amt) ? amt.toFixed(3) : '0.000'} CEDRA</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`text-gray-300`}>To Treasury</span>
                      <span className="font-semibold text-green-400">+{Number.isFinite(amt) ? amt.toFixed(3) : '0.000'} CEDRA</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDepositDetails(v => !v)}
                      className={`mt-1 text-xs text-gray-400 hover:text-white`}
                    >
                      {showDepositDetails ? 'Hide' : 'Show'} payload
                    </button>
                    {showDepositDetails && (
                      <pre className={`text-xs overflow-x-auto p-2 rounded bg-black/40 text-gray-300`}>
{JSON.stringify(payloadPreview, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeposit}
                  disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
                  className="flex-1 h-11 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: '#e1fd6a',
                    color: '#000000'
                  }}
                >
                  {isDepositing ? 'Depositing…' : 'Confirm Deposit'}
                </button>
                {/* Cancel button removed per request */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawForm && isAdmin && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }} onClick={() => setShowWithdrawForm(false)}>
          <div className={`border-white/10 rounded-xl p-5 w-full max-w-md border shadow-2xl`} style={{ backgroundColor: '#101010' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-lg font-semibold text-white`}>Withdraw Tokens</h3>
              <button onClick={() => setShowWithdrawForm(false)} className={`text-gray-400 hover:text-white`}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 text-gray-400`}>Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white/5 border border-white/10 text-white placeholder-gray-500`}
                  placeholder="0.000"
                />
                <div className={`text-xs mt-1 space-y-1 text-gray-500`}>
                  <p>Treasury balance: {treasuryData.balance.toFixed(3)} CEDRA</p>
                  <p>Daily limit remaining: {treasuryData.remainingDaily.toFixed(3)} CEDRA</p>
                  <p>Max withdrawal: {Math.min(treasuryData.remainingDaily, treasuryData.balance).toFixed(3)} CEDRA</p>
                </div>
              </div>

              {(() => {
                const amt = parseFloat(amount || '0');
                const octas = Number.isFinite(amt) && amt > 0 ? Math.floor(amt * 1e8) : 0;
                const objectAddress = (() => {
                  const obj = (treasuryData?.treasuryObject as any);
                  if (!obj) return undefined;
                  return typeof obj === 'string' ? obj : (obj?.inner || obj?.value || obj);
                })();
                const payloadPreview = objectAddress ? {
                  function: `${MODULE_ADDRESS}::treasury::withdraw_from_object`,
                  typeArguments: [],
                  functionArguments: [dao.id, objectAddress, String(octas)],
                } : {
                  function: `${MODULE_ADDRESS}::treasury::withdraw`,
                  typeArguments: [],
                  functionArguments: [dao.id, String(octas)],
                };
                return (
                  <div className={`bg-white/5 border-white/10 border rounded-lg p-3 space-y-2`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`text-gray-300`}>From Treasury</span>
                      <span className="font-semibold text-red-400">-{Number.isFinite(amt) ? amt.toFixed(3) : '0.000'} CEDRA</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`text-gray-300`}>To Wallet</span>
                      <span className="font-semibold text-green-400">+{Number.isFinite(amt) ? amt.toFixed(3) : '0.000'} CEDRA</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawDetails(v => !v)}
                      className={`mt-1 text-xs text-gray-400 hover:text-white`}
                    >
                      {showWithdrawDetails ? 'Hide' : 'Show'} payload
                    </button>
                    {showWithdrawDetails && (
                      <pre className={`text-xs overflow-x-auto p-2 rounded bg-black/40 text-gray-300`}>
{JSON.stringify(payloadPreview, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleWithdraw}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > Math.min(treasuryData.remainingDaily, treasuryData.balance) || isWithdrawing}
                  className="flex-1 h-11 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-slate-900"
                  style={{ backgroundColor: '#e1ff62' }}
                >
                  {isWithdrawing ? 'Withdrawing…' : 'Confirm Withdraw'}
                </button>
                {/* Cancel button removed per request */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treasury Info removed per request */}
    </div>
  );

  const renderTransactions = () => {
    // Use the utility function for consistent address truncation
    const startIndex = (transactionPage - 1) * TRANSACTIONS_PER_PAGE;
    const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);
    const totalPages = Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE);
    const hasNextPage = transactionPage < totalPages;
    const hasPrevPage = transactionPage > 1;

    return (
      <div className="bg-white/3 border border-white/5 rounded-t-xl rounded-b-none p-3 sm:p-4 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Recent Transactions</span>
            </h3>
          </div>

          {/* Pagination Controls */}
          {transactions.length > TRANSACTIONS_PER_PAGE && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                disabled={!hasPrevPage}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <span className="text-xs text-gray-400">
                Page {transactionPage} of {totalPages}
              </span>
              <button
                onClick={() => setTransactionPage(p => p + 1)}
                disabled={!hasNextPage}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto w-full max-w-full">
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3 font-medium text-gray-300">Transaction</th>
                <th className="text-left py-3 px-3 font-medium text-gray-300">Type</th>
                <th className="text-left py-3 px-3 font-medium text-gray-300">Amount</th>
                <th className="text-left py-3 px-3 font-medium text-gray-300">Address</th>
                <th className="text-left py-3 px-3 font-medium text-gray-300">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No transactions yet</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Treasury transactions will appear here
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    {/* Transaction */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {tx.type === 'deposit' ? (
                            <ArrowDownRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white font-medium text-sm leading-tight capitalize">{tx.type}</h4>
                          <p className="text-gray-400 text-xs leading-tight">Treasury {tx.type}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Type */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs border whitespace-nowrap ${
                        tx.type === 'deposit' 
                          ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                          : 'text-red-400 border-red-500/30 bg-red-500/10'
                      }`}>
                        {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </span>
                    </td>
                    
                    {/* Amount */}
                    <td className="py-3 px-3">
                      <div className={`text-sm font-medium ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(3)} CEDRA
                      </div>
                    </td>
                    
                    {/* Address */}
                    <td className="py-3 px-3">
                      <span className="text-sm text-gray-300 font-mono">
                        {tx.type === 'deposit' 
                          ? truncateAddress(tx.from || '')
                          : truncateAddress(tx.to || '')
                        }
                      </span>
                    </td>
                    
                    {/* Time */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{new Date(tx.timestamp).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No transactions yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Treasury transactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {paginatedTransactions.map((tx, index) => (
                <div
                  key={index}
                  className="rounded-lg p-2.5 hover:bg-white/5 transition-all border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium text-sm leading-tight capitalize">{tx.type}</h4>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border flex-shrink-0 ${
                            tx.type === 'deposit' 
                              ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                              : 'text-red-400 border-red-500/30 bg-red-500/10'
                          }`}>
                            {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span className="font-mono">
                            {tx.type === 'deposit' 
                              ? truncateAddress(tx.from || '')
                              : truncateAddress(tx.to || '')
                            }
                          </span>
                          <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-medium ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(3)} CEDRA
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };



  return (
    <div className="w-full max-w-full px-4 sm:px-6 space-y-4 overflow-hidden">
      {/* Main wrapper with border - same as Overview and Proposals */}
      <div className="border border-white/10 rounded-xl py-4 px-2 space-y-6 overflow-hidden max-w-full" style={{ background: 'transparent' }}>

      {/* Top-right status - only show if there's content */}
       {/* Removed previous status block to avoid duplicate */}

      {treasuryData.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-red-300 font-medium mb-1">Treasury Error</h3>
            <p className="text-red-200 text-sm">{treasuryData.error}</p>
          </div>
          {/* Refresh icon removed per request */}
        </div>
      )}
      
      {/* Header - Made responsive */}
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Inline status aligned to the right on the same line as title */}
        {sectionLoader.error && (
          <div className="absolute right-4 sm:right-8 top-0 text-right">
            {sectionLoader.error && (
              <div className="text-xs text-red-300 cursor-pointer" onClick={retryTreasuryData}>
                Error - Click to retry
              </div>
            )}
          </div>
        )}

        {/* Treasury header wrapper */}
        <div className="border border-white/10 rounded-xl py-2 px-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 w-full" style={{ background: 'transparent' }}>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white">Treasury</h1>
          </div>

          {/* Mobile KPIs - Show as compact cards */}
          <div className="lg:hidden w-full grid grid-cols-2 gap-2 text-xs">
            {isWalletConnected && (
              <div className="bg-white/5 rounded-lg p-1.5 text-center">
                <div className="text-gray-400 mb-0.5 text-[10px]">Balance</div>
                <div className="font-semibold text-white text-xs">{userBalance.toFixed(3)}</div>
              </div>
            )}
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <div className="text-gray-400 mb-0.5 text-[10px]">Used</div>
              <div className="font-semibold text-white text-xs">{treasuryData.dailyWithdrawn.toFixed(3)}</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto">
            {/* Desktop KPIs - Show as cards */}
            <div className={`hidden lg:grid gap-1.5 text-xs ${isWalletConnected ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {isWalletConnected && (
                <div className="bg-white/5 rounded-lg p-1 text-center w-20 h-9 flex flex-col items-center justify-center">
                  <div className="text-gray-400 mb-0.5 text-[9px]">Balance</div>
                  <div className="font-semibold text-white text-[11px]">{userBalance.toFixed(3)}</div>
                </div>
              )}
              <div className="bg-white/5 rounded-lg p-1 text-center w-20 h-9 flex flex-col items-center justify-center">
                <div className="text-gray-400 mb-0.5 text-[9px]">Used</div>
                <div className="font-semibold text-white text-[11px]">{treasuryData.dailyWithdrawn.toFixed(3)}</div>
              </div>
            </div>

            {/* Status indicators + refresh */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isWalletConnected && (
                <div className="bg-gray-500/20 text-gray-300 rounded-lg border border-gray-500/30 text-[11px] w-16 h-9 flex items-center justify-center text-center">
                  Guest
                </div>
              )}
              {isWalletConnected && isAdmin && (
                <div className="bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 text-[11px] w-16 h-9 flex items-center justify-center text-center">
                  Admin
                </div>
              )}
              {/* Refresh icon removed per request */}
            </div>
          </div>
        </div>
      </div>

      {/* Content (tabs removed) */}
      {renderOverview()}

      {/* Vault Manager Component */}
      <VaultManager
        daoId={dao.id}
        treasuryObject={treasuryData.treasuryObject}
      />

      {renderTransactions()}
      </div>
    </div>
  );
};

export default DAOTreasury;