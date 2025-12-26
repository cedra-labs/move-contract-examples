import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/useWallet'
import WalletSelectorModal from '../components/WalletSelectorModal'
import { Vote, ArrowLeft, Lightbulb, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { votingClient, stringToBytes } from '../utils/contract'
import type { InputTransactionData } from '@cedra-labs/wallet-adapter-core'

export default function Create() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { connected, account, disconnect, signAndSubmitTransaction } = useWallet()
  const [description, setDescription] = useState('')
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

  const handleCreateProposal = async () => {
    if (!description.trim()) {
      toast.error('Please enter a proposal description')
      return
    }

    if (description.length < 10) {
      toast.error('Description must be at least 10 characters')
      return
    }

    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsCreating(true)

    try {
      const descriptionBytes = stringToBytes(description)
      
      const transactionData: InputTransactionData = {
        data: {
          function: votingClient.getFunction('create_proposal'),
          functionArguments: [descriptionBytes],
          typeArguments: []
        }
      }

      const response = await signAndSubmitTransaction(transactionData)
      if (response) {
        await votingClient.waitForTransaction(response.hash)
        toast.success('Proposal created successfully!')
        setDescription('')
        
        // Navigate back to home after a short delay
        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error creating proposal:', error)
      
      // Check for specific error codes
      if (error?.message?.includes('E_EMPTY_DESCRIPTION') || error?.message?.includes('65539')) {
        toast.error('Proposal description cannot be empty')
      } else {
        toast.error(error?.message || 'Failed to create proposal')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const characterCount = description.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Vote className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">Voting dApp</span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                  Proposals
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
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Proposals
        </Link>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Proposal
          </h1>
          <p className="text-gray-600">
            Submit a proposal for the community to vote on
          </p>
        </div>

        {!connected ? (
          /* Connect Wallet Prompt */
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Vote className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">You need to connect your wallet to create a proposal</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          /* Create Proposal Form */
          <div className="space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                {/* Description Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposal Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter your proposal description here...&#10;&#10;Example: Should we upgrade the protocol to version 2.0?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={8}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">
                      {characterCount} / 500 characters
                    </p>
                    {characterCount > 0 && characterCount < 10 && (
                      <p className="text-sm text-orange-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Minimum 10 characters
                      </p>
                    )}
                  </div>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreateProposal}
                  disabled={isCreating || !description.trim() || characterCount < 10}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating Proposal...' : 'Create Proposal'}
                </button>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Tips for Writing Good Proposals
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Be clear and concise about what you're proposing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>State the specific action or change being requested</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Explain why this proposal matters to the community</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Keep it focused on a single topic or decision</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Once created, proposals cannot be edited or deleted</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Example Card */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Example Proposals
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded p-3 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    "Should we increase the block reward to incentivize more validators?"
                  </p>
                </div>
                <div className="bg-white rounded p-3 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    "Proposal to implement a treasury fund for community grants and development"
                  </p>
                </div>
                <div className="bg-white rounded p-3 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    "Should we add support for multi-signature transactions in the next upgrade?"
                  </p>
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

