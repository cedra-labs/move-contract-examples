import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import { Copy, Gift, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { referralClient, stringToBytes, cedraToOctas, octasToCedra } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

interface UserStats {
  code: string
  referrer: string
  referredCount: number
  pendingRewards: number
  totalEarned: number
}

export default function Home() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect, signAndSubmitTransaction } = useWallet()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  
  // Form states
  const [newCode, setNewCode] = useState('')
  const [referralCodeToUse, setReferralCodeToUse] = useState('')
  const [claimAmount, setClaimAmount] = useState('')

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true)
  }

  const handleDisconnectWallet = async () => {
    try {
      await disconnect()
      setUserStats(null)
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!connected || !account) return
    
    try {
      const userAddress = account.address?.toString()
      if (!userAddress) return

      const stats = await referralClient.getUserStats(userAddress)
      setUserStats(stats)
    } catch (error) {
      console.error('Error fetching user stats:', error)
      // Set empty stats instead of showing error for new users
      setUserStats({
        code: '',
        referrer: '0x0',
        referredCount: 0,
        pendingRewards: 0,
        totalEarned: 0
      })
    }
  }

  useEffect(() => {
    if (connected && account) {
      fetchUserStats()
    }
  }, [connected, account])

  const handleRegisterCode = async () => {
    if (!newCode.trim()) {
      toast.error('Please enter a referral code')
      return
    }
    
    if (newCode.length < 3 || newCode.length > 20) {
      toast.error('Code must be 3-20 characters')
      return
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(newCode)) {
      toast.error('Code must be alphanumeric only')
      return
    }

    try {
      const codeBytes = stringToBytes(newCode)
      
      const transactionData: InputTransactionData = {
        data: {
          function: referralClient.getFunction('register_code'),
          functionArguments: [codeBytes],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await referralClient.waitForTransaction(response.hash)
        toast.success('Code registered successfully!')
        setNewCode('')
        await fetchUserStats()
      }
    } catch (error: any) {
      console.error('Error registering code:', error)
      toast.error(error?.message || 'Failed to register code')
    }
  }

  const handleUseReferralCode = async () => {
    if (!referralCodeToUse.trim()) {
      toast.error('Please enter a referral code')
      return
    }

    try {
      const codeBytes = stringToBytes(referralCodeToUse)
      
      const transactionData: InputTransactionData = {
        data: {
          function: referralClient.getFunction('register_with_code'),
          functionArguments: [codeBytes],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await referralClient.waitForTransaction(response.hash)
        toast.success('Successfully registered with referral code!')
        setReferralCodeToUse('')
        await fetchUserStats()
      }
    } catch (error: any) {
      console.error('Error using referral code:', error)
      toast.error(error?.message || 'Failed to use referral code')
    }
  }

  const handleClaimRewards = async () => {
    const amount = parseFloat(claimAmount)
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const amountInOctas = cedraToOctas(amount)
    const amountInOctasNum = parseInt(amountInOctas)
    
    if (userStats && amountInOctasNum > userStats.pendingRewards) {
      toast.error('Insufficient pending rewards')
      return
    }

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: referralClient.getFunction('claim_rewards'),
          functionArguments: [amountInOctasNum.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await referralClient.waitForTransaction(response.hash)
        toast.success(`${amount.toFixed(4)} CEDRA claimed successfully!`)
        setClaimAmount('')
        await fetchUserStats()
      }
    } catch (error: any) {
      console.error('Error claiming rewards:', error)
      toast.error(error?.message || 'Failed to claim rewards')
    }
  }

  const handleClaimAll = async () => {
    if (!userStats?.pendingRewards || userStats.pendingRewards === 0) {
      toast.error('No pending rewards to claim')
      return
    }
    
    // Claim the exact amount in octas
    try {
      const transactionData: InputTransactionData = {
        data: {
          function: referralClient.getFunction('claim_rewards'),
          functionArguments: [userStats.pendingRewards.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await referralClient.waitForTransaction(response.hash)
        toast.success(`${octasToCedra(userStats.pendingRewards).toFixed(4)} CEDRA claimed successfully!`)
        setClaimAmount('')
        await fetchUserStats()
      }
    } catch (error: any) {
      console.error('Error claiming all rewards:', error)
      toast.error(error?.message || 'Failed to claim rewards')
    }
  }

  const copyReferralLink = () => {
    if (userStats?.code) {
      const link = `${window.location.origin}?ref=${userStats.code}`
      navigator.clipboard.writeText(link)
      toast.success('Referral link copied!')
    }
  }

  const copyCode = () => {
    if (userStats?.code) {
      navigator.clipboard.writeText(userStats.code)
      toast.success('Code copied!')
    }
  }

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
                <Link to="/" className="text-gray-900 font-medium hover:text-gray-600 transition-colors">
                  Home
                </Link>
                <Link to="/admin" className="text-gray-600 font-medium hover:text-gray-900 transition-colors">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">Connect your wallet to start using the referral system</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Pending Rewards</h3>
                  <Gift className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{octasToCedra(userStats?.pendingRewards || 0).toFixed(4)}</p>
                <p className="text-xs text-gray-500 mt-1">CEDRA</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Earned</h3>
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{octasToCedra(userStats?.totalEarned || 0).toFixed(4)}</p>
                <p className="text-xs text-gray-500 mt-1">CEDRA</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Referrals</h3>
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{userStats?.referredCount || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Your Referral Code */}
                {userStats?.code ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Referral Code</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-lg font-bold text-gray-900">
                        {userStats.code}
                      </div>
                      <button
                        onClick={copyCode}
                        className="p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={copyReferralLink}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Copy Referral Link
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Register Your Code</h3>
                    <p className="text-sm text-gray-600 mb-4">Create your unique referral code (3-20 alphanumeric characters)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        maxLength={20}
                      />
                      <button
                        onClick={handleRegisterCode}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                )}

                {/* Use Referral Code */}
                {!userStats?.referrer || userStats.referrer === '0x0' ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Use a Referral Code</h3>
                    <p className="text-sm text-gray-600 mb-4">Have a referral code? Enter it to get started</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralCodeToUse}
                        onChange={(e) => setReferralCodeToUse(e.target.value)}
                        placeholder="Enter referral code"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        onClick={handleUseReferralCode}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Claim Rewards */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Claim Rewards</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Available: <span className="font-bold text-gray-900">{octasToCedra(userStats?.pendingRewards || 0).toFixed(4)}</span> CEDRA
                  </p>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="number"
                      step="0.0001"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder="Amount in CEDRA"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      min="0"
                      max={octasToCedra(userStats?.pendingRewards || 0)}
                    />
                    <button
                      onClick={handleClaimRewards}
                      disabled={!userStats?.pendingRewards || userStats.pendingRewards === 0}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Claim
                    </button>
                  </div>
                  <button
                    onClick={handleClaimAll}
                    disabled={!userStats?.pendingRewards || userStats.pendingRewards === 0}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Claim all
                  </button>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">How it works</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Create your unique referral code</li>
                    <li>• Share it with friends</li>
                    <li>• Earn 0.0001 CEDRA per referral</li>
                    <li>• Claim your rewards anytime</li>
                  </ul>
                </div>
              </div>
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

