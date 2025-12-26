import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import AuctionCard from '../components/AuctionCard'
import { Gavel, Wallet, RefreshCw, PlusCircle, TrendingUp } from 'lucide-react'
import { englishAuctionClient, type Auction } from '../utils/contract'

export default function Home() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect } = useWallet()
  const [auctions, setAuctions] = useState<Auction[]>([])
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

  const fetchAuctions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const auctionsList = await englishAuctionClient.getAuctions(100)
      auctionsList.sort((a, b) => b.id - a.id)
      setAuctions(auctionsList)
    } catch (error) {
      console.error('Error fetching auctions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAuctions()
  }, [])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAuctions(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleActionSuccess = () => {
    fetchAuctions(true)
  }

  const handleRefresh = () => {
    fetchAuctions(true)
  }

  const activeAuctions = auctions.filter(a => !a.hasEnded && !a.isFinalized)
  const endedAuctions = auctions.filter(a => a.hasEnded || a.isFinalized)
  const myAuctions = connected && account 
    ? auctions.filter(a => a.seller === account.address?.toString())
    : []

  // Apply filter
  const getFilteredAuctions = () => {
    switch (filter) {
      case 'active':
        return activeAuctions
      case 'ended':
        return endedAuctions
      case 'mine':
        return myAuctions
      default:
        return auctions
    }
  }

  const filteredAuctions = getFilteredAuctions()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Gavel className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">Logo</span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                >
                  Auctions
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
                English Auctions
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Highest bidder wins - competitive bidding
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
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Create Auction
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Auctions</p>
                  <p className="text-2xl font-bold text-gray-900">{auctions.length}</p>
                </div>
                <Gavel className="w-8 h-8 text-gray-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{activeAuctions.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ended</p>
                  <p className="text-2xl font-bold text-gray-900">{endedAuctions.length}</p>
                </div>
                <Gavel className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">My Auctions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {connected ? myAuctions.length : '-'}
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
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              All ({auctions.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Active ({activeAuctions.length})
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'ended'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Ended ({endedAuctions.length})
            </button>
            <button
              onClick={() => setFilter('mine')}
              disabled={!connected}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'mine'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              My Auctions ({connected ? myAuctions.length : '-'})
            </button>
          </div>
        </div>

        {/* Auctions Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Auctions</h2>
            <p className="text-gray-600">Fetching data from blockchain...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Gavel className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {filter === 'mine' && !connected && 'Connect Wallet to View Your Auctions'}
              {filter === 'mine' && connected && 'You Have No Auctions'}
              {filter === 'active' && 'No Active Auctions'}
              {filter === 'ended' && 'No Ended Auctions'}
              {filter === 'all' && 'No Auctions Available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'mine' && connected && 'Create your first auction to get started'}
              {filter === 'mine' && !connected && 'Connect your wallet to see auctions you created'}
              {filter === 'active' && 'Check back later for new listings'}
              {filter === 'ended' && 'No auctions have ended yet'}
              {filter === 'all' && 'Be the first to create an auction'}
            </p>
            {((filter === 'mine' && connected) || filter === 'all') && (
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <PlusCircle className="w-5 h-5" />
                Create Auction
              </Link>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {filter === 'all' && 'All Auctions'}
              {filter === 'active' && 'Active Auctions'}
              {filter === 'ended' && 'Ended Auctions'}
              {filter === 'mine' && 'My Auctions'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
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
