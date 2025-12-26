import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Ticket, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import { lotteryClient } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

export default function CreateLottery() {
  const navigate = useNavigate()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, signAndSubmitTransaction, disconnect } = useWallet()

  const [ticketPrice, setTicketPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [paymentToken, setPaymentToken] = useState('0x000000000000000000000000000000000000000000000000000000000000000a')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const validateInputs = (): boolean => {
    if (!ticketPrice || parseFloat(ticketPrice) <= 0) {
      toast.error('Ticket price must be greater than 0')
      return false
    }

    if (!duration || parseInt(duration) <= 0) {
      toast.error('Duration must be greater than 0')
      return false
    }

    if (!paymentToken || !paymentToken.startsWith('0x')) {
      toast.error('Invalid payment token address')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected) {
      toast.error('Please connect your wallet first')
      setIsWalletModalOpen(true)
      return
    }

    if (!validateInputs()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Convert ticket price to octas (8 decimals)
      const ticketPriceOctas = Math.floor(parseFloat(ticketPrice) * 100_000_000)
      const durationSeconds = parseInt(duration)

      const transactionData: InputTransactionData = {
        data: {
          function: lotteryClient.getFunction('create_lottery'),
          functionArguments: [
            ticketPriceOctas.toString(),
            durationSeconds.toString(),
            paymentToken
          ],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await lotteryClient.waitForTransaction(response.hash)
        toast.success('Lottery created successfully!')
        
        // Navigate to home after short delay
        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error creating lottery:', error)
      
      if (error?.message?.includes('E_INVALID_TICKET_PRICE') || error?.message?.includes('65541')) {
        toast.error('Invalid ticket price')
      } else {
        toast.error(error?.message || 'Failed to create lottery')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDurationDisplay = (seconds: string): string => {
    const sec = parseInt(seconds)
    if (isNaN(sec)) return ''
    
    const days = Math.floor(sec / 86400)
    const hours = Math.floor((sec % 86400) / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (mins > 0) parts.push(`${mins}m`)
    
    return parts.length > 0 ? parts.join(' ') : '0m'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <Ticket className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">Logo</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                  Lotteries
                </Link>
                <Link 
                  to="/create" 
                  className="text-gray-900 font-medium hover:text-purple-600 transition-colors"
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lotteries
        </Link>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Lottery</h1>
            <p className="text-gray-600">Set up a fair lottery with blockchain randomness</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ticket Price */}
            <div>
              <label htmlFor="ticketPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Price (CEDRA) *
              </label>
              <input
                type="number"
                id="ticketPrice"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                step="0.0001"
                min="0"
                placeholder="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Price per ticket in CEDRA (e.g., 0.01 = 0.01 CEDRA per ticket)
              </p>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds) *
              </label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                placeholder="3600"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              {duration && parseInt(duration) > 0 && (
                <p className="mt-1 text-xs text-purple-600 font-medium">
                  Duration: {formatDurationDisplay(duration)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                How long the lottery will run (e.g., 3600 = 1 hour, 86400 = 1 day)
              </p>
            </div>

            {/* Payment Token */}
            <div>
              <label htmlFor="paymentToken" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Token Address *
              </label>
              <input
                type="text"
                id="paymentToken"
                value={paymentToken}
                onChange={(e) => setPaymentToken(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Default: CEDRA token on testnet
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-blue-900">
                  <p className="font-semibold">How it works:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Participants buy tickets at the fixed price</li>
                    <li>All ticket sales go into the prize pool</li>
                    <li>After the duration ends, anyone can draw the winner</li>
                    <li>Winner is selected using timestamp-based randomness</li>
                    <li>Winner receives the entire prize pool automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Warning Box */}
            {!connected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-semibold mb-1">Wallet Not Connected</p>
                    <p className="text-yellow-800">You need to connect your wallet to create a lottery.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !connected}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Lottery'}
              </button>
            </div>
          </form>

          {/* Tips Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Fair Pricing:</strong> Set a ticket price that encourages participation while building a meaningful prize pool</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Duration:</strong> Common durations are 1 hour (3600s), 1 day (86400s), or 1 week (604800s)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Gas Fees:</strong> You'll need CEDRA to pay for transaction gas fees</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Randomness:</strong> Winner selection uses timestamp-based pseudo-randomness which is deterministic but unpredictable before draw time</span>
              </li>
            </ul>
          </div>

          {/* Example Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Example</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ticket Price:</span>
                <span className="font-mono font-medium">0.01 CEDRA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-mono font-medium">86400 seconds (1 day)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">If 100 tickets sold:</span>
                <span className="font-mono font-medium text-purple-600">Prize = 1.0 CEDRA</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <WalletSelectorModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  )
}
