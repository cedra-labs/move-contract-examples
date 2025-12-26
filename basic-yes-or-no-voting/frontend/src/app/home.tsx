import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import ProposalCard from '../components/ProposalCard'
import { Vote, Wallet, RefreshCw, PlusCircle } from 'lucide-react'
import { votingClient, type Proposal } from '../utils/contract'

export default function Home() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect } = useWallet()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  // Fetch all proposals
  const fetchProposals = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // Fetch proposals (check up to ID 100)
      const proposalsList = await votingClient.getProposals(100)
      
      // Sort by ID descending (newest first)
      proposalsList.sort((a, b) => b.id - a.id)
      
      setProposals(proposalsList)
    } catch (error) {
      console.error('Error fetching proposals:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProposals()
  }, [])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProposals(true)
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleVoteSuccess = () => {
    // Refresh proposals after successful vote
    fetchProposals(true)
  }

  const handleRefresh = () => {
    fetchProposals(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Vote className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">Logo</span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                >
                  Proposals
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
                Active Proposals
              </h1>
              <p className="text-gray-600">
                Vote on proposals and participate in governance
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
                Create Proposal
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Proposals</p>
                  <p className="text-2xl font-bold text-gray-900">{proposals.length}</p>
                </div>
                <Vote className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Votes Cast</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {proposals.reduce((sum, p) => sum + p.totalVotes, 0)}
                  </p>
                </div>
                <Vote className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Your Status</p>
                  <p className="text-lg font-bold text-gray-900">
                    {connected ? 'Connected' : 'Not Connected'}
                  </p>
                </div>
                <Wallet className={`w-8 h-8 ${connected ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Proposals Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Proposals</h2>
            <p className="text-gray-600">Fetching data from blockchain...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <Vote className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Proposals Yet</h2>
            <p className="text-gray-600 mb-6">Be the first to create a proposal!</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <PlusCircle className="w-5 h-5" />
              Create First Proposal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onVoteSuccess={handleVoteSuccess}
              />
            ))}
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
