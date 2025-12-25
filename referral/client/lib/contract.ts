import { Cedra, Network } from '@cedra-labs/ts-sdk'
import { referralAPI } from './api'

// Get config from environment variables
const NETWORK = process.env.NEXT_PUBLIC_CEDRA_NETWORK === 'testnet' ? Network.TESTNET : Network.MAINNET
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || ''
const MODULE_NAME = 'referral_system'

// Initialize Cedra client
const cedra = new Cedra({ network: NETWORK })

export const contractService = {
  // Register with referrer on-chain
  registerWithReferrer: async (
    walletAddress: string,
    referrerAddress: string
  ) => {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Wallet not connected')
    }

    const payload = {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::register_with_referrer`,
      type_arguments: [],
      arguments: [referrerAddress]
    }

    try {
      const response = await window.aptos.signAndSubmitTransaction(payload)
      
      // Wait for transaction confirmation
      await cedra.waitForTransaction({
        transactionHash: response.hash
      })
      
      return response.hash
    } catch (error) {
      console.error('Failed to register on-chain:', error)
      throw error
    }
  },

  // Register solo (without referrer) on-chain
  registerSolo: async (walletAddress: string) => {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Wallet not connected')
    }

    const payload = {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::register_solo`,
      type_arguments: [],
      arguments: []
    }

    try {
      const response = await window.aptos.signAndSubmitTransaction(payload)
      
      // Wait for transaction confirmation
      await cedra.waitForTransaction({
        transactionHash: response.hash
      })
      
      return response.hash
    } catch (error) {
      console.error('Failed to register solo on-chain:', error)
      throw error
    }
  },

  // Process purchase with referral rewards
  processPurchaseWithReferral: async (
    sellerAddress: string,
    assetAddress: string,
    amount: string
  ) => {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Wallet not connected')
    }

    const payload = {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::process_purchase_with_referral`,
      type_arguments: [],
      arguments: [sellerAddress, assetAddress, amount]
    }

    try {
      const response = await window.aptos.signAndSubmitTransaction(payload)
      
      // Wait for transaction confirmation
      await cedra.waitForTransaction({
        transactionHash: response.hash
      })

      // Get transaction events to record reward
      const transaction = await cedra.getTransactionByHash({
        transactionHash: response.hash
      })

      // Look for reward event in transaction
      const events = transaction.events || []
      const rewardEvent = events.find(e => 
        e.type.includes('RewardEvent')
      )

      if (rewardEvent) {
        // Record the reward in Supabase
        await referralAPI.recordReward({
          referrerAddress: rewardEvent.data.referrer,
          buyerAddress: rewardEvent.data.buyer,
          rewardAmount: rewardEvent.data.amount,
          transactionHash: response.hash,
          assetType: 'CEDRA'
        })
      }
      
      return response.hash
    } catch (error) {
      console.error('Failed to process purchase:', error)
      throw error
    }
  },

  // Get user stats from blockchain
  getUserStats: async (userAddress: string) => {
    try {
      const [referrer, referredCount, totalEarned] = await cedra.view({
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_stats`,
          typeArguments: [],
          functionArguments: [userAddress]
        }
      })

      return {
        referrer: referrer as string,
        referredCount: parseInt(referredCount as string),
        totalEarned: totalEarned as string
      }
    } catch (error) {
      console.error('Failed to get user stats:', error)
      throw error
    }
  },

  // Get global referral system stats
  getGlobalStats: async () => {
    try {
      const [rewardPercentage, isActive, totalRewardsPaid] = await cedra.view({
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_global_stats`,
          typeArguments: [],
          functionArguments: [MODULE_ADDRESS]
        }
      })

      return {
        rewardPercentage: parseInt(rewardPercentage as string),
        isActive: isActive as boolean,
        totalRewardsPaid: totalRewardsPaid as string
      }
    } catch (error) {
      console.error('Failed to get global stats:', error)
      throw error
    }
  }
}

// Add type declaration for window.aptos (if not already declared elsewhere)
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