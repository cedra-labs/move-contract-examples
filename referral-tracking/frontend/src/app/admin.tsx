import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import { Wallet, TrendingUp, Users, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { referralClient, cedraToOctas, octasToCedra } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

interface TreasuryStats {
  balance: number
  totalDeposited: number
}

interface GlobalStats {
  admin: string
  rewardToken: string
  isActive: boolean
  totalRewardsPaid: number
  fixedReward: number
}

export default function Admin() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect, signAndSubmitTransaction } = useWallet()
  const [treasuryStats, setTreasuryStats] = useState<TreasuryStats | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [rewardTokenAddress, setRewardTokenAddress] = useState('')
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true)

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true)
  }

  const handleDisconnectWallet = async () => {
    try {
      await disconnect()
      setTreasuryStats(null)
      setGlobalStats(null)
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  // Fetch treasury stats
  const fetchTreasuryStats = async () => {
    if (!connected || !account) return

    try {
      const stats = await referralClient.getTreasuryStats()
      setTreasuryStats(stats)
    } catch (error) {
      console.error('Error fetching treasury stats:', error)
      // Set empty stats on error
      setTreasuryStats({
        balance: 0,
        totalDeposited: 0
      })
    }
  }

  // Fetch global stats
  const fetchGlobalStats = async () => {
    if (!connected || !account) return

    try {
      const stats = await referralClient.getGlobalStats()
      setGlobalStats(stats)
      setIsInitialized(stats.admin !== '' && stats.admin !== '0x0')
      
      // Check if current account is admin
      if (account?.address && stats.admin) {
        const normalizedAccountAddress = account.address.toString().toLowerCase().replace(/^0x/, '')
        const normalizedAdminAddress = stats.admin.toLowerCase().replace(/^0x/, '')
        setIsAdmin(normalizedAccountAddress === normalizedAdminAddress)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error fetching global stats:', error)
      // Contract not initialized if we get an error
      setIsInitialized(false)
      setIsAdmin(false)
      setGlobalStats({
        admin: '',
        rewardToken: '',
        isActive: false,
        totalRewardsPaid: 0,
        fixedReward: 0
      })
    } finally {
      setIsCheckingAdmin(false)
    }
  }

  useEffect(() => {
    if (connected && account) {
      setIsCheckingAdmin(true)
      fetchGlobalStats() // Fetch this first to check if initialized
      fetchTreasuryStats()
    } else {
      setIsInitialized(null)
      setIsAdmin(false)
      setIsCheckingAdmin(false)
    }
  }, [connected, account])

  const handleInitialize = async () => {
    if (!rewardTokenAddress.trim()) {
      toast.error('Please enter reward token address')
      return
    }

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: referralClient.getFunction('initialize'),
          functionArguments: [rewardTokenAddress],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await referralClient.waitForTransaction(response.hash)
        toast.success('Contract initialized successfully!')
        setRewardTokenAddress('')
        await fetchGlobalStats()
        await fetchTreasuryStats()
      }
    } catch (error: any) {
      console.error('Error initializing contract:', error)
      toast.error(error?.message || 'Failed to initialize contract')
    }
  }

  const handleDepositRewards = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      // Convert CEDRA to octas for the contract
      const amountInOctas = cedraToOctas(amount)
      
      const transactionData: InputTransactionData = {
        data: {
          function: referralClient.getFunction('deposit_rewards'),
          functionArguments: [amountInOctas],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await referralClient.waitForTransaction(response.hash)
        toast.success(`${amount} CEDRA deposited successfully!`)
        setDepositAmount('')
        await fetchTreasuryStats()
        await fetchGlobalStats()
      }
    } catch (error: any) {
      console.error('Error depositing rewards:', error)
      toast.error(error?.message || 'Failed to deposit rewards')
    }
  }

  // Calculate health status
  const getHealthStatus = () => {
    if (!treasuryStats) return { status: 'unknown', color: 'gray', message: 'Loading...' }
    
    const { balance, totalDeposited } = treasuryStats
    const percentage = (balance / totalDeposited) * 100

    if (percentage > 50) {
      return { status: 'healthy', color: 'green', message: 'Treasury is healthy' }
    } else if (percentage > 20) {
      return { status: 'warning', color: 'yellow', message: 'Treasury needs attention' }
    } else {
      return { status: 'critical', color: 'red', message: 'Treasury critically low!' }
    }
  }

  const healthStatus = getHealthStatus()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-2xl font-bold text-gray-900">
                Logo
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/" className="text-gray-600 font-medium hover:text-gray-900 transition-colors">
                  Home
                </Link>
                <Link to="/admin" className="text-gray-900 font-medium hover:text-gray-600 transition-colors">
                  Admin
                </Link>
              </nav>
            </div>
            <div>
              {connected && account ? (
                <button
                  onClick={handleDisconnectWallet}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  {(() => {
                    const address = account.address?.toString() || 'Connected'
                    return address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
                  })()}
                </button>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected ? (
          <div className="text-center py-20">
            <Wallet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Admin Wallet</h2>
            <p className="text-gray-600 mb-6">Connect your admin wallet to access the admin panel</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Connect Wallet
            </button>
          </div>
        ) : isCheckingAdmin ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Admin Access</h2>
            <p className="text-gray-600">Please wait while we verify your permissions...</p>
          </div>
        ) : isInitialized === false ? (
          <div className="space-y-6">
            {/* Initialize Contract */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Contract Not Initialized</h3>
                  <p className="text-sm text-yellow-800 mb-4">
                    The referral tracking contract needs to be initialized before use. This is a one-time setup that creates the system configuration, code registry, and treasury.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-yellow-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Initialize Contract</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reward Token Metadata Address
                    </label>
                    <input
                      type="text"
                      value={rewardTokenAddress}
                      onChange={(e) => setRewardTokenAddress(e.target.value)}
                      placeholder="0x000000000000000000000000000000000000000000000000000000000000000a"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the fungible asset metadata <strong>object address</strong> (e.g., 0xa for Cedra FA)
                    </p>
                  </div>
                  <button
                    onClick={handleInitialize}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Initialize Contract
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized Access</h2>
            <p className="text-gray-600 mb-2">You are not authorized to access this admin panel.</p>
            <Link 
              to="/"
              className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Go to Home
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Health Status Alert */}
            <div className={`rounded-lg p-4 ${
              healthStatus.status === 'healthy' ? 'bg-green-50 border border-green-200' :
              healthStatus.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              healthStatus.status === 'critical' ? 'bg-red-50 border border-red-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                {healthStatus.status === 'healthy' ? (
                  <CheckCircle className={`w-5 h-5 text-${healthStatus.color}-600`} />
                ) : (
                  <AlertCircle className={`w-5 h-5 text-${healthStatus.color}-600`} />
                )}
                <div className="flex-1">
                  <p className={`font-medium text-${healthStatus.color}-900`}>
                    {healthStatus.message}
                  </p>
                  {treasuryStats && (
                    <p className={`text-sm text-${healthStatus.color}-700 mt-1`}>
                      Treasury Balance: {octasToCedra(treasuryStats.balance).toFixed(2)} / {octasToCedra(treasuryStats.totalDeposited).toFixed(2)} CEDRA
                      ({((treasuryStats.balance / treasuryStats.totalDeposited) * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Treasury Balance</h3>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{octasToCedra(treasuryStats?.balance || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">CEDRA available for claims</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Deposited</h3>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{octasToCedra(treasuryStats?.totalDeposited || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">CEDRA all time deposits</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Paid Out</h3>
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{octasToCedra(globalStats?.totalRewardsPaid || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">CEDRA claimed by users</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Reward Amount</h3>
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{octasToCedra(globalStats?.fixedReward || 0).toFixed(4)}</p>
                <p className="text-xs text-gray-500 mt-1">CEDRA per referral</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deposit Rewards */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Deposit Rewards</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add CEDRA tokens to the treasury to fund user reward claims
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Deposit (CEDRA)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount in CEDRA"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: 100 (will be converted to octas automatically)
                    </p>
                  </div>
                  <button
                    onClick={handleDepositRewards}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Deposit to Treasury
                  </button>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Admin Address</p>
                    <p className="text-sm text-gray-900 font-mono mt-1 break-all">
                      {globalStats?.admin || 'Loading...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reward Token</p>
                    <p className="text-sm text-gray-900 font-mono mt-1 break-all">
                      {globalStats?.rewardToken || 'Loading...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${globalStats?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className="text-sm text-gray-900">
                        {globalStats?.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Treasury Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-gray-400 text-sm">Available for Claims</p>
                  <p className="text-2xl font-bold mt-1">{octasToCedra(treasuryStats?.balance || 0).toFixed(2)} CEDRA</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Already Claimed</p>
                  <p className="text-2xl font-bold mt-1">{octasToCedra(globalStats?.totalRewardsPaid || 0).toFixed(2)} CEDRA</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Deposited</p>
                  <p className="text-2xl font-bold mt-1">{octasToCedra(treasuryStats?.totalDeposited || 0).toFixed(2)} CEDRA</p>
                </div>
              </div>
              {treasuryStats && treasuryStats.totalDeposited > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Treasury Usage</span>
                    <span className="font-medium">
                      {((globalStats?.totalRewardsPaid || 0) / treasuryStats.totalDeposited * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((globalStats?.totalRewardsPaid || 0) / treasuryStats.totalDeposited * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Guide */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Admin Responsibilities</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Monitor treasury balance to ensure users can claim rewards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Deposit tokens regularly to maintain a healthy treasury</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Track total rewards paid to understand system usage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Keep treasury balance above 50% for optimal performance</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <WalletSelectorModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  )
}

