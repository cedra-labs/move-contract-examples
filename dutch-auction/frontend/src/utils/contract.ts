import { Cedra, CedraConfig, Network } from '@cedra-labs/ts-sdk'

/**
 * Dutch Auction Contract Client
 * Handles all interactions with the dutch auction smart contract
 */
class DutchAuctionClient {
  private client: Cedra
  private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
  private readonly MODULE_NAME = 'dutch_auction'

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
   * Get current price for an auction
   */
  async getCurrentPrice(auctionId: number): Promise<number> {
    try {
      const result = await this.callViewFunction('get_current_price', [auctionId.toString()])
      return parseInt(result[0]) || 0
    } catch (error) {
      console.error('Error getting current price:', error)
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
   * Returns: (seller, nft, start_price, end_price, start_time, duration, is_sold)
   */
  async getAuctionInfo(auctionId: number): Promise<AuctionInfo> {
    try {
      const result = await this.callViewFunction('get_auction_info', [auctionId.toString()])
      
      const [seller, nft, startPrice, endPrice, startTime, duration, isSold] = result as [string, any, string, string, string, string, boolean]
      
      return {
        seller: seller || '0x0',
        nft: nft,
        startPrice: parseInt(startPrice) || 0,
        endPrice: parseInt(endPrice) || 0,
        startTime: parseInt(startTime) || 0,
        duration: parseInt(duration) || 0,
        isSold: isSold || false
      }
    } catch (error) {
      console.error('Error getting auction info:', error)
      return {
        seller: '0x0',
        nft: null,
        startPrice: 0,
        endPrice: 0,
        startTime: 0,
        duration: 0,
        isSold: false
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
        const currentPrice = await this.getCurrentPrice(id)
        
        const now = Math.floor(Date.now() / 1000)
        const elapsed = now - info.startTime
        const remaining = Math.max(0, info.duration - elapsed)
        const progress = info.duration > 0 ? Math.min(100, (elapsed / info.duration) * 100) : 100
        
        auctions.push({
          id,
          seller: info.seller,
          nft: info.nft,
          startPrice: info.startPrice,
          endPrice: info.endPrice,
          currentPrice: currentPrice,
          startTime: info.startTime,
          duration: info.duration,
          isSold: info.isSold,
          elapsed,
          remaining,
          progress
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
export const dutchAuctionClient = new DutchAuctionClient()

/**
 * Auction information interface
 */
export interface AuctionInfo {
  seller: string
  nft: any
  startPrice: number
  endPrice: number
  startTime: number
  duration: number
  isSold: boolean
}

/**
 * Complete auction interface
 */
export interface Auction {
  id: number
  seller: string
  nft: any
  startPrice: number
  endPrice: number
  currentPrice: number
  startTime: number
  duration: number
  isSold: boolean
  elapsed: number
  remaining: number
  progress: number
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
