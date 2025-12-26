import { useState, useEffect } from 'react'
import { Clock, Ticket, DollarSign, User, Users, Trophy, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '../contexts/useWallet'
import { lotteryClient, formatPrice, formatDuration, type Lottery } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

interface LotteryCardProps {
  lottery: Lottery
  onActionSuccess?: () => void
}

export default function LotteryCard({ lottery, onActionSuccess }: LotteryCardProps) {
  const { connected, account, signAndSubmitTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(lottery.remaining)
  const [hasEnded, setHasEnded] = useState(lottery.hasEnded)

  const isOrganizer = connected && account?.address?.toString() === lottery.organizer
  const isWinner = connected && account?.address?.toString() === lottery.winner && lottery.isDrawn

  // Update time in real-time
  useEffect(() => {
    if (lottery.isDrawn) return

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = Math.max(0, lottery.endTime - now)
      
      setTimeRemaining(remaining)
      setHasEnded(now >= lottery.endTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [lottery])

  const handleBuyTicket = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsProcessing(true)

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: lotteryClient.getFunction('buy_ticket'),
          functionArguments: [lottery.id.toString(), lottery.objectAddress],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await lotteryClient.waitForTransaction(response.hash)
        toast.success('Ticket purchased successfully!')
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error buying ticket:', error)
      
      if (error?.message?.includes('E_LOTTERY_ENDED') || error?.message?.includes('524296')) {
        toast.error('Lottery has ended')
      } else if (error?.message?.includes('E_LOTTERY_ALREADY_DRAWN') || error?.message?.includes('196611')) {
        toast.error('Lottery already drawn')
      } else if (error?.message?.includes('E_INSUFFICIENT_PAYMENT') || error?.message?.includes('589833')) {
        toast.error('Insufficient funds')
      } else {
        toast.error(error?.message || 'Failed to buy ticket')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrawWinner = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsProcessing(true)

    try {
      const transactionData: InputTransactionData = {
        data: {
          function: lotteryClient.getFunction('draw_winner'),
          functionArguments: [lottery.id.toString(), lottery.objectAddress],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await lotteryClient.waitForTransaction(response.hash)
        toast.success('Winner drawn successfully!')
        if (onActionSuccess) {
          onActionSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error drawing winner:', error)
      
      if (error?.message?.includes('E_LOTTERY_NOT_ENDED') || error?.message?.includes('393222')) {
        toast.error('Lottery has not ended yet')
      } else if (error?.message?.includes('E_NO_PARTICIPANTS') || error?.message?.includes('458759')) {
        toast.error('No participants in lottery')
      } else if (error?.message?.includes('E_LOTTERY_ALREADY_DRAWN') || error?.message?.includes('196611')) {
        toast.error('Lottery already drawn')
      } else {
        toast.error(error?.message || 'Failed to draw winner')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${lottery.isDrawn ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-purple-600" />
            Lottery #{lottery.id}
          </h3>
          {lottery.isDrawn && (
            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full mt-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Winner Drawn
            </span>
          )}
          {hasEnded && !lottery.isDrawn && lottery.participantCount > 0 && (
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full mt-1">
              Ready to Draw
            </span>
          )}
        </div>
        {isOrganizer && !lottery.isDrawn && (
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Your Lottery
          </span>
        )}
        {isWinner && (
          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            You Won!
          </span>
        )}
      </div>

      {/* Organizer */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <User className="w-4 h-4" />
        <span className="font-mono">
          {lottery.organizer.slice(0, 6)}...{lottery.organizer.slice(-4)}
        </span>
      </div>

      {/* Prize and Ticket Info */}
      <div className="space-y-3 mb-4">
        {/* Prize Pool */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-purple-900 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Prize Pool
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {formatPrice(lottery.prizeAmount)} CEDRA
          </p>
        </div>

        {/* Ticket Price and Participants */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 mb-1">Ticket Price</p>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">
                {formatPrice(lottery.ticketPrice)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Participants</p>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">
                {lottery.participantCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Info */}
      {lottery.isDrawn && lottery.winner !== '0x0' && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Winner</span>
          </div>
          <p className="text-xs font-mono text-green-800">
            {lottery.winner.slice(0, 10)}...{lottery.winner.slice(-8)}
          </p>
        </div>
      )}

      {/* Time Remaining */}
      {!lottery.isDrawn && (
        <div className="flex items-center gap-2 py-2 mb-4 border-t border-gray-200">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {!hasEnded ? (
              <>
                <span className="font-semibold">{formatDuration(timeRemaining)}</span>
                <span className="text-gray-500"> remaining</span>
              </>
            ) : (
              <span className="font-semibold text-orange-600">Lottery Ended</span>
            )}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {!lottery.isDrawn && connected && (
        <div className="flex gap-3">
          {hasEnded && lottery.participantCount > 0 && (
            <button
              onClick={handleDrawWinner}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trophy className="w-4 h-4" />
              {isProcessing ? 'Drawing...' : 'Draw Winner'}
            </button>
          )}
          
          {!hasEnded && (
            <button
              onClick={handleBuyTicket}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ticket className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Buy Ticket'}
            </button>
          )}
        </div>
      )}

      {!connected && !lottery.isDrawn && (
        <div className="text-center py-2 text-sm text-gray-500">
          Connect wallet to participate
        </div>
      )}
    </div>
  )
}

