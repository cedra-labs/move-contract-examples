import { Cedra, CedraConfig, Network } from '@cedra-labs/ts-sdk'

/**
 * English Auction Contract Client
 * Handles all interactions with the english auction smart contract
 */
class EnglishAuctionClient {
  private client: Cedra
  private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
  private readonly MODULE_NAME = 'english_auction'

  constructor() {
    this.client = new Cedra(new CedraConfig({
      network: Network.TESTNET,
      fullnode: 'https://testnet.cedra.dev/v1',
    }))
  }

  /**
   * Call a view function on the blockchain
   */
  private async callViewFunction(functionName: string, args: any[]): Promise<any> {
    try {
      const functionId = `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::${functionName}` as `${string}::${string}::${string}`
      
      const result = await this.client.view({
        payload: {
          function: functionId,
          typeArguments: [],
          functionArguments: args,
        }
      })
      
      return result
    } catch (error) {
      console.error('View function call failed:', error)
      throw error
    }
  }

  /**
   * Get current highest bid for an auction
   */
  async getCurrentBid(auctionId: number): Promise<number> {
    try {
      const result = await this.callViewFunction('get_current_bid', [auctionId.toString()])
      return parseInt(result[0]) || 0
    } catch (error) {
      console.error('Error getting current bid:', error)
      return 0
    }
  }

  /**
   * Check if an auction exists
   */
  async auctionExists(auctionId: number): Promise<boolean> {
    try {
      const result = await this.callViewFunction('auction_exists', [auctionId.toString()])
      return result[0] as boolean
    } catch (error) {
      console.error('Error checking auction existence:', error)
      return false
    }
  }

  /**
   * Get auction information
   * Returns: (seller, nft, starting_price, current_highest_bid, current_highest_bidder, start_time, end_time, duration, is_finalized)
   */
  async getAuctionInfo(auctionId: number): Promise<AuctionInfo> {
    try {
      const result = await this.callViewFunction('get_auction_info', [auctionId.toString()])
      
      const [seller, nft, startingPrice, currentBid, highestBidder, startTime, endTime, duration, isFinalized] = result as [string, any, string, string, string, string, string, string, boolean]
      
      return {
        seller: seller || '0x0',
        nft: nft,
        startingPrice: parseInt(startingPrice) || 0,
        currentBid: parseInt(currentBid) || 0,
        highestBidder: highestBidder || '0x0',
        startTime: parseInt(startTime) || 0,
        endTime: parseInt(endTime) || 0,
        duration: parseInt(duration) || 0,
        isFinalized: isFinalized || false
      }
    } catch (error) {
      console.error('Error getting auction info:', error)
      return {
        seller: '0x0',
        nft: null,
        startingPrice: 0,
        currentBid: 0,
        highestBidder: '0x0',
        startTime: 0,
        endTime: 0,
        duration: 0,
        isFinalized: false
      }
    }
  }

  /**
   * Get all auctions up to maxId
   */
  async getAuctions(maxId: number = 100): Promise<Auction[]> {
    const auctions: Auction[] = []
    
    for (let id = 1; id <= maxId; id++) {
      try {
        const exists = await this.auctionExists(id)
        
        if (!exists) {
          break
        }
        
        const info = await this.getAuctionInfo(id)
        
        const now = Math.floor(Date.now() / 1000)
        const hasEnded = now >= info.endTime
        const remaining = Math.max(0, info.endTime - now)
        const hasBids = info.currentBid > 0
        
        auctions.push({
          id,
          seller: info.seller,
          nft: info.nft,
          startingPrice: info.startingPrice,
          currentBid: info.currentBid,
          highestBidder: info.highestBidder,
          startTime: info.startTime,
          endTime: info.endTime,
          duration: info.duration,
          isFinalized: info.isFinalized,
          hasEnded,
          remaining,
          hasBids
        })
      } catch (error) {
        console.error(`Error fetching auction ${id}:`, error)
        break
      }
    }
    
    return auctions
  }

  /**
   * Get function identifier for transactions
   */
  getFunction(functionName: string): `${string}::${string}::${string}` {
    return `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::${functionName}` as `${string}::${string}::${string}`
  }

  /**
   * Wait for transaction to complete
   */
  async waitForTransaction(transactionHash: string): Promise<void> {
    await this.client.waitForTransaction({ transactionHash })
  }
}

// Export singleton instance
export const englishAuctionClient = new EnglishAuctionClient()

/**
 * Auction information interface
 */
export interface AuctionInfo {
  seller: string
  nft: any
  startingPrice: number
  currentBid: number
  highestBidder: string
  startTime: number
  endTime: number
  duration: number
  isFinalized: boolean
}

/**
 * Complete auction interface
 */
export interface Auction {
  id: number
  seller: string
  nft: any
  startingPrice: number
  currentBid: number
  highestBidder: string
  startTime: number
  endTime: number
  duration: number
  isFinalized: boolean
  hasEnded: boolean
  remaining: number
  hasBids: boolean
}

/**
 * Format price from octas to tokens
 */
export function formatPrice(octas: number): string {
  return (octas / 100_000_000).toFixed(4)
}

/**
 * Format time duration
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Ended'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}
