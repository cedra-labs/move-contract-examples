import { useState } from 'react'
import { ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '../contexts/useWallet'
import { votingClient, stringToBytes, type Proposal } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

interface ProposalCardProps {
  proposal: Proposal
  onVoteSuccess?: () => void
}

export default function ProposalCard({ proposal, onVoteSuccess }: ProposalCardProps) {
  const { connected, signAndSubmitTransaction } = useWallet()
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const handleVote = async (voteYes: boolean) => {
    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsVoting(true)

    try {
      const functionName = voteYes ? 'vote_yes' : 'vote_no'
      
      const transactionData: InputTransactionData = {
        data: {
          function: votingClient.getFunction(functionName),
          functionArguments: [proposal.id.toString()],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await votingClient.waitForTransaction(response.hash)
        toast.success(`Voted ${voteYes ? 'Yes' : 'No'} successfully!`)
        setHasVoted(true)
        if (onVoteSuccess) {
          onVoteSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error voting:', error)
      
      // Check for specific error codes
      if (error?.message?.includes('E_ALREADY_VOTED') || error?.message?.includes('196610')) {
        toast.error('You have already voted on this proposal')
        setHasVoted(true)
      } else if (error?.message?.includes('E_PROPOSAL_NOT_FOUND') || error?.message?.includes('393217')) {
        toast.error('Proposal not found')
      } else {
        toast.error(error?.message || 'Failed to vote')
      }
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* Proposal Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Proposal #{proposal.id}
            </h3>
            {hasVoted && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                <CheckCircle className="w-3 h-3" />
                Voted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vote Results */}
      <div className="space-y-3 mb-4">
        {/* Yes Votes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              Yes
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {proposal.yesVotes} ({proposal.yesPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${proposal.yesPercentage}%` }}
            />
          </div>
        </div>

        {/* No Votes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              No
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {proposal.noVotes} ({proposal.noPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${proposal.noPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Votes */}
      <div className="flex items-center justify-between py-2 mb-4 border-t border-gray-200">
        <span className="text-sm text-gray-600">Total Votes</span>
        <span className="text-sm font-semibold text-gray-900">{proposal.totalVotes}</span>
      </div>

      {/* Vote Buttons */}
      {connected && !hasVoted && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsUp className="w-4 h-4" />
            {isVoting ? 'Voting...' : 'Vote Yes'}
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsDown className="w-4 h-4" />
            {isVoting ? 'Voting...' : 'Vote No'}
          </button>
        </div>
      )}

      {!connected && (
        <div className="text-center py-2 text-sm text-gray-500">
          Connect wallet to vote
        </div>
      )}

      {hasVoted && (
        <div className="text-center py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          You have already voted on this proposal
        </div>
      )}
    </div>
  )
}

