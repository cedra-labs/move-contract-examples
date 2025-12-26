import { useState, useEffect } from 'react'
import { Clock, TrendingUp, DollarSign, User, X, Gavel, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '../contexts/useWallet'
import { englishAuctionClient, formatPrice, formatDuration, type Auction } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

interface AuctionCardProps {
  auction: Auction
  onActionSuccess?: () => void
}

export default function AuctionCard({ auction, onActionSuccess }: AuctionCardProps) {
  const { connected, account, signAndSubmitTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [showBidInput, setShowBidInput] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(auction.remaining)
  const [hasEnded, setHasEnded] = useState(auction.hasEnded)

  const isOwner = connected && account?.address?.toString() === auction.seller
  const isHighestBidder = connected && account?.address?.toString() === auction.highestBidder && auction.hasBids
  const canFinalize = hasEnded && auction.hasBids && !auction.isFinalized
  const canCancel = isOwner && !auction.hasBids && !auction.isFinalized && !hasEnded

  // Update time in real-time
  useEffect(() => {
    if (auction.isFinalized) return

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = Math.max(0, auction.endTime - now)
      
      setTimeRemaining(remaining)
      setHasEnded(now >= auction.endTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [auction])

  const handlePlaceBid = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    const bidValue = parseFloat(bidAmount)
    if (!bidValue || bidValue <= 0) {
      toast.error('Please enter a valid bid amount')
      return
    }

    const bidOctas = Math.floor(bidValue * 100_000_000)
    const minBid = auction.currentBid > 0 ? auction.currentBid + 1 : auction.startingPrice

    if (bidOctas < minBid) {
      toast.error(`Bid must be at least ${formatPrice(minBid)} CEDRA`)
      return
    }

    setIsProcessing(true)

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: englishAuctionClient.getFunction('place_bid'),
          functionArguments: [auction.id.toString(), bidOctas.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await englishAuctionClient.waitForTransaction(response.hash)
        toast.success('Bid placed successfully!')
        setBidAmount('')
        setShowBidInput(false)
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error placing bid:', error)
      
      if (error?.message?.includes('E_BID_TOO_LOW') || error?.message?.includes('393222')) {
        toast.error('Bid amount is too low')
      } else if (error?.message?.includes('E_AUCTION_NOT_ENDED') || error?.message?.includes('524296')) {
        toast.error('Auction has ended')
      } else {
        toast.error(error?.message || 'Failed to place bid')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFinalize = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsProcessing(true)

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: englishAuctionClient.getFunction('finalize_auction'),
          functionArguments: [auction.id.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await englishAuctionClient.waitForTransaction(response.hash)
        toast.success('Auction finalized successfully!')
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error finalizing auction:', error)
      
      if (error?.message?.includes('E_AUCTION_NOT_ENDED') || error?.message?.includes('524296')) {
        toast.error('Auction has not ended yet')
      } else if (error?.message?.includes('E_NO_BIDS') || error?.message?.includes('589833')) {
        toast.error('No bids placed on this auction')
      } else {
        toast.error(error?.message || 'Failed to finalize auction')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsProcessing(true)

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: englishAuctionClient.getFunction('cancel_auction'),
          functionArguments: [auction.id.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await englishAuctionClient.waitForTransaction(response.hash)
        toast.success('Auction cancelled successfully!')
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error cancelling auction:', error)
      
      if (error?.message?.includes('E_NOT_SELLER') || error?.message?.includes('327700')) {
        toast.error('Only the seller can cancel')
      } else if (error?.message?.includes('E_NO_BIDS') || error?.message?.includes('589833')) {
        toast.error('Cannot cancel auction with bids')
      } else {
        toast.error(error?.message || 'Failed to cancel auction')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const minBid = auction.currentBid > 0 ? auction.currentBid + 1 : auction.startingPrice

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${auction.isFinalized ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-blue-600" />
            Auction #{auction.id}
          </h3>
          {auction.isFinalized && (
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full mt-1">
              Finalized
            </span>
          )}
          {hasEnded && !auction.isFinalized && (
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full mt-1">
              Ended - Needs Finalization
            </span>
          )}
        </div>
        {isOwner && !auction.isFinalized && (
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Your Auction
          </span>
        )}
        {isHighestBidder && !auction.isFinalized && (
          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Winning
          </span>
        )}
      </div>

      {/* Seller */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <User className="w-4 h-4" />
        <span className="font-mono">
          {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
        </span>
      </div>

      {/* Bid Information */}
      <div className="space-y-3 mb-4">
        {/* Current Bid */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-green-900 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {auction.hasBids ? 'Current Bid' : 'Starting Price'}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatPrice(auction.hasBids ? auction.currentBid : auction.startingPrice)} CEDRA
          </p>
          {auction.hasBids && (
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3 text-green-700" />
              <span className="text-xs text-green-700 font-mono">
                {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Minimum Next Bid */}
        {!auction.isFinalized && !hasEnded && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Starting Price</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatPrice(auction.startingPrice)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Minimum Bid</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatPrice(minBid)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Time Remaining */}
      {!auction.isFinalized && (
        <div className="flex items-center gap-2 py-2 mb-4 border-t border-gray-200">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {!hasEnded ? (
              <>
                <span className="font-semibold">{formatDuration(timeRemaining)}</span>
                <span className="text-gray-500"> remaining</span>
              </>
            ) : (
              <span className="font-semibold text-orange-600">Auction Ended</span>
            )}
          </span>
        </div>
      )}

      {/* Bid Input */}
      {showBidInput && !auction.isFinalized && !hasEnded && !isOwner && (
        <div className="mb-4 space-y-2">
          <input
            type="number"
            step="0.01"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={`Min: ${formatPrice(minBid)} CEDRA`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePlaceBid}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Confirm Bid'}
            </button>
            <button
              onClick={() => setShowBidInput(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!auction.isFinalized && connected && (
        <div className="flex gap-3">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              {isProcessing ? 'Cancelling...' : 'Cancel Auction'}
            </button>
          )}
          
          {canFinalize && (
            <button
              onClick={handleFinalize}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trophy className="w-4 h-4" />
              {isProcessing ? 'Finalizing...' : 'Finalize Auction'}
            </button>
          )}
          
          {!hasEnded && !isOwner && !showBidInput && (
            <button
              onClick={() => setShowBidInput(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <DollarSign className="w-4 h-4" />
              Place Bid
            </button>
          )}
        </div>
      )}

      {!connected && !auction.isFinalized && (
        <div className="text-center py-2 text-sm text-gray-500">
          Connect wallet to bid or finalize
        </div>
      )}
    </div>
  )
}
