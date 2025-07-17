'use client'

import React, { useState, useEffect } from 'react'

interface Props {
  onConnect: (address: string) => void
  walletAddress: string | null
}

export default function WalletConnect({ onConnect, walletAddress }: Props) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet is already connected
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    if (typeof window === 'undefined' || !window.aptos) return

    try {
      const response = await window.aptos.isConnected()
      if (response) {
        const account = await window.aptos.account()
        if (account?.address) {
          onConnect(account.address)
        }
      }
    } catch (err) {
      console.error('Failed to check wallet connection:', err)
    }
  }

  const connectWallet = async () => {
    if (!window.aptos) {
      setError('Please install Petra or Pontem wallet')
      window.open('https://petra.app/', '_blank')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const response = await window.aptos.connect()
      const account = await window.aptos.account()
      
      if (account?.address) {
        onConnect(account.address)
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err)
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      await window.aptos.disconnect()
      window.location.reload()
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
      
      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      {!walletAddress ? (
        <button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div>
          <p className="mb-4">
            Connected: <strong>{formatAddress(walletAddress)}</strong>
          </p>
          <button 
            onClick={disconnectWallet}
            className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

// Add type declaration for window.aptos
declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<{ address: string }>
      disconnect: () => Promise<void>
      isConnected: () => Promise<boolean>
      account: () => Promise<{ address: string } | null>
      signAndSubmitTransaction: (payload: any) => Promise<{ hash: string }>
      network: () => Promise<string>
    }
  }
}