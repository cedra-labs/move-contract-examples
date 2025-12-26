import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import { Gavel, ArrowLeft, Lightbulb, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { englishAuctionClient } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

export default function Create() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect, signAndSubmitTransaction } = useWallet()
  const [nftAddress, setNftAddress] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [paymentToken, setPaymentToken] = useState('0x000000000000000000000000000000000000000000000000000000000000000a')
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

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

  const handleCreateAuction = async () => {
    if (!nftAddress.trim()) {
      toast.error('Please enter NFT address')
      return
    }

    const price = parseFloat(startingPrice)
    const dur = parseInt(duration)

    if (!price || price <= 0) {
      toast.error('Starting price must be greater than 0')
      return
    }

    if (!dur || dur <= 0) {
      toast.error('Duration must be greater than 0')
      return
    }

    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsCreating(true)

    try {
      const priceOctas = Math.floor(price * 100_000_000)
      
      const transactionData: InputTransactionData = {
        data: {
          function: englishAuctionClient.getFunction('create_auction'),
          functionArguments: [
            nftAddress,
            priceOctas.toString(),
            dur.toString(),
            paymentToken
          ],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await englishAuctionClient.waitForTransaction(response.hash)
        toast.success('Auction created successfully!')
        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error creating auction:', error)
      
      if (error?.message?.includes('E_INVALID_PRICE') || error?.message?.includes('65541')) {
        toast.error('Starting price must be greater than 0')
      } else if (error?.message?.includes('E_INVALID_DURATION') || error?.message?.includes('65543')) {
        toast.error('Duration must be greater than 0')
      } else {
        toast.error(error?.message || 'Failed to create auction')
      }
    } finally {
      setIsCreating(false)
    }
  }

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
                  className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                  Auctions
                </Link>
                <Link 
                  to="/create" 
                  className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Auctions
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create English Auction
          </h1>
          <p className="text-gray-600">
            List your NFT with ascending price bidding
          </p>
        </div>

        {!connected ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Gavel className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">You need to connect your wallet to create an auction</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                {/* NFT Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NFT Object Address *
                  </label>
                  <input
                    type="text"
                    value={nftAddress}
                    onChange={(e) => setNftAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The Object&lt;Token&gt; address of your NFT
                  </p>
                </div>

                {/* Starting Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Price (CEDRA) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    placeholder="1.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum bid amount (reserve price)
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (seconds) *
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="3600"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How long the auction runs (e.g., 3600 = 1 hour)
                  </p>
                </div>

                {/* Payment Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Token Metadata Address
                  </label>
                  <input
                    type="text"
                    value={paymentToken}
                    onChange={(e) => setPaymentToken(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default: 0xa (Cedra FA)
                  </p>
                </div>

                {/* Validation Warning */}
                {startingPrice && parseFloat(startingPrice) <= 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">
                      Starting price must be greater than 0
                    </p>
                  </div>
                )}

                {/* Create Button */}
                <button
                  onClick={handleCreateAuction}
                  disabled={isCreating || !nftAddress || !startingPrice || !duration}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating Auction...' : 'Create Auction'}
                </button>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    How English Auctions Work
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Bidders compete with increasing bids</li>
                    <li>• Each bid must be higher than the current highest bid</li>
                    <li>• Previous bidders are automatically refunded when outbid</li>
                    <li>• Anti-sniping: bids in last 5 minutes extend auction by 5 minutes</li>
                    <li>• Highest bidder wins when auction ends</li>
                    <li>• You can cancel before any bids are placed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Example Card */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Example Configuration
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Starting Price:</span> 1.0 CEDRA</p>
                <p><span className="font-medium">Duration:</span> 3600 seconds (1 hour)</p>
                <p className="text-gray-600 pt-2">
                  Bidding starts at 1.0 CEDRA. Bidders compete to place the highest bid within 1 hour. The highest bidder at the end wins the NFT.
                </p>
              </div>
            </div>

            {/* NFT Address Guide */}
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">
                How to Find Your NFT Object Address
              </h3>
              <ol className="space-y-2 text-sm text-amber-800 list-decimal list-inside">
                <li>Go to <a href="https://cedrascan.com" target="_blank" rel="noopener noreferrer" className="underline">cedrascan.com</a></li>
                <li>Search for your wallet address</li>
                <li>Click on the "Tokens" tab</li>
                <li>Select the NFT you want to auction</li>
                <li>Under "Overview", click on the Token ID</li>
                <li>Copy the Object Address from the token object view page</li>
              </ol>
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
