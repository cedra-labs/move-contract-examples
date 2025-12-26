import { useState, useEffect } from 'react'
import { Clock, TrendingDown, DollarSign, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '../contexts/useWallet'
import { dutchAuctionClient, formatPrice, formatDuration, type Auction } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

interface AuctionCardProps {
  auction: Auction
  onActionSuccess?: () => void
}

export default function AuctionCard({ auction, onActionSuccess }: AuctionCardProps) {
  const { connected, account, signAndSubmitTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(auction.currentPrice)
  const [timeRemaining, setTimeRemaining] = useState(auction.remaining)
  const [progress, setProgress] = useState(auction.progress)

  const isOwner = connected && account?.address?.toString() === auction.seller

  // Update price and time in real-time
  useEffect(() => {
    if (auction.isSold || auction.remaining <= 0) return

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - auction.startTime
      const remaining = Math.max(0, auction.duration - elapsed)
      
      setTimeRemaining(remaining)
      
      if (remaining > 0) {
        // Calculate current price
        const priceDrop = auction.startPrice - auction.endPrice
        const decay = Math.floor((priceDrop * elapsed) / auction.duration)
        const newPrice = Math.max(auction.endPrice, auction.startPrice - decay)
        setCurrentPrice(newPrice)
        
        const newProgress = Math.min(100, (elapsed / auction.duration) * 100)
        setProgress(newProgress)
      } else {
        setCurrentPrice(auction.endPrice)
        setProgress(100)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [auction])

  const handleBuy = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsProcessing(true)

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: dutchAuctionClient.getFunction('buy_now'),
          functionArguments: [auction.id.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await dutchAuctionClient.waitForTransaction(response.hash)
        toast.success('NFT purchased successfully!')
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error buying NFT:', error)
      
      if (error?.message?.includes('E_AUCTION_ALREADY_SOLD') || error?.message?.includes('196611')) {
        toast.error('Auction already sold')
      } else if (error?.message?.includes('E_INSUFFICIENT_PAYMENT') || error?.message?.includes('393222')) {
        toast.error('Insufficient funds')
      } else {
        toast.error(error?.message || 'Failed to purchase NFT')
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
          function: dutchAuctionClient.getFunction('cancel_auction'),
          functionArguments: [auction.id.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await dutchAuctionClient.waitForTransaction(response.hash)
        toast.success('Auction cancelled successfully!')
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error cancelling auction:', error)
      
      if (error?.message?.includes('E_NOT_SELLER') || error?.message?.includes('327700')) {
        toast.error('Only the seller can cancel')
      } else if (error?.message?.includes('E_AUCTION_ALREADY_SOLD') || error?.message?.includes('196611')) {
        toast.error('Cannot cancel sold auction')
      } else {
        toast.error(error?.message || 'Failed to cancel auction')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const pricePercentage = auction.startPrice > 0 
    ? ((currentPrice - auction.endPrice) / (auction.startPrice - auction.endPrice)) * 100 
    : 0

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${auction.isSold ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Auction #{auction.id}
          </h3>
          {auction.isSold && (
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full mt-1">
              Sold
            </span>
          )}
        </div>
        {isOwner && !auction.isSold && (
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Your Auction
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

      {/* Price Information */}
      <div className="space-y-3 mb-4">
        {/* Current Price */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-blue-900 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Current Price
            </span>
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatPrice(currentPrice)} CEDRA
          </p>
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 mb-1">Start Price</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(auction.startPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">End Price</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(auction.endPrice)}
            </p>
          </div>
        </div>

        {/* Price Progress Bar */}
        {!auction.isSold && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Price Drop</span>
              <span className="text-xs font-medium text-gray-900">
                {(100 - pricePercentage).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Time Remaining */}
      {!auction.isSold && (
        <div className="flex items-center gap-2 py-2 mb-4 border-t border-gray-200">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {timeRemaining > 0 ? (
              <>
                <span className="font-semibold">{formatDuration(timeRemaining)}</span>
                <span className="text-gray-500"> remaining</span>
              </>
            ) : (
              <span className="font-semibold text-red-600">Auction Ended</span>
            )}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {!auction.isSold && connected && (
        <div className="flex gap-3">
          {isOwner ? (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              {isProcessing ? 'Cancelling...' : 'Cancel Auction'}
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={isProcessing || timeRemaining <= 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Buy Now'}
            </button>
          )}
        </div>
      )}

      {!connected && !auction.isSold && (
        <div className="text-center py-2 text-sm text-gray-500">
          Connect wallet to buy
        </div>
      )}
    </div>
  )
}

