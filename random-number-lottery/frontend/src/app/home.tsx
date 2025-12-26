import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import LotteryCard from '../components/LotteryCard'
import { Ticket, Wallet, RefreshCw, PlusCircle, Sparkles } from 'lucide-react'
import { lotteryClient, type Lottery } from '../utils/contract'

export default function Home() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect } = useWallet()
  const [lotteries, setLotteries] = useState<Lottery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'mine'>('all')

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true)
  }

  const handleDisconnectWallet = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  const fetchLotteries = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const lotteriesList = await lotteryClient.getLotteries(100)
      lotteriesList.sort((a, b) => b.id - a.id)
      setLotteries(lotteriesList)
    } catch (error) {
      console.error('Error fetching lotteries:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLotteries()
  }, [])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLotteries(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleActionSuccess = () => {
    fetchLotteries(true)
  }

  const handleRefresh = () => {
    fetchLotteries(true)
  }

  const activeLotteries = lotteries.filter(l => !l.hasEnded && !l.isDrawn)
  const endedLotteries = lotteries.filter(l => l.hasEnded || l.isDrawn)
  const myLotteries = connected && account 
    ? lotteries.filter(l => l.organizer === account.address?.toString())
    : []

  // Apply filter
  const getFilteredLotteries = () => {
    switch (filter) {
      case 'active':
        return activeLotteries
      case 'ended':
        return endedLotteries
      case 'mine':
        return myLotteries
      default:
        return lotteries
    }
  }

  const filteredLotteries = getFilteredLotteries()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Ticket className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">Logo</span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className="text-gray-900 font-medium hover:text-purple-600 transition-colors"
                >
                  Lotteries
                </Link>
                <Link 
                  to="/create" 
                  className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                  Create
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
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
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Random Number Lottery
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Fair and transparent lottery powered by cedra blockchain
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                to="/create"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Create Lottery
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Lotteries</p>
                  <p className="text-2xl font-bold text-gray-900">{lotteries.length}</p>
                </div>
                <Ticket className="w-8 h-8 text-gray-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{activeLotteries.length}</p>
                </div>
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ended</p>
                  <p className="text-2xl font-bold text-gray-900">{endedLotteries.length}</p>
                </div>
                <Ticket className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">My Lotteries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {connected ? myLotteries.length : '-'}
                  </p>
                </div>
                <Wallet className={`w-8 h-8 ${connected ? 'text-purple-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex items-center gap-2 bg-white rounded-lg shadow p-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              All ({lotteries.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Active ({activeLotteries.length})
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'ended'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Ended ({endedLotteries.length})
            </button>
            <button
              onClick={() => setFilter('mine')}
              disabled={!connected}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'mine'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              My Lotteries ({connected ? myLotteries.length : '-'})
            </button>
          </div>
        </div>

        {/* Lotteries Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Lotteries</h2>
            <p className="text-gray-600">Fetching data from blockchain...</p>
          </div>
        ) : filteredLotteries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Ticket className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {filter === 'mine' && !connected && 'Connect Wallet to View Your Lotteries'}
              {filter === 'mine' && connected && 'You Have No Lotteries'}
              {filter === 'active' && 'No Active Lotteries'}
              {filter === 'ended' && 'No Ended Lotteries'}
              {filter === 'all' && 'No Lotteries Available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'mine' && connected && 'Create your first lottery to get started'}
              {filter === 'mine' && !connected && 'Connect your wallet to see lotteries you created'}
              {filter === 'active' && 'Check back later for new lotteries'}
              {filter === 'ended' && 'No lotteries have ended yet'}
              {filter === 'all' && 'Be the first to create a lottery'}
            </p>
            {((filter === 'mine' && connected) || filter === 'all') && (
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <PlusCircle className="w-5 h-5" />
                Create Lottery
              </Link>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {filter === 'all' && 'All Lotteries'}
              {filter === 'active' && 'Active Lotteries'}
              {filter === 'ended' && 'Ended Lotteries'}
              {filter === 'mine' && 'My Lotteries'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLotteries.map((lottery) => (
                <LotteryCard
                  key={lottery.id}
                  lottery={lottery}
                  onActionSuccess={handleActionSuccess}
                />
              ))}
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
