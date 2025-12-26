import { Cedra, CedraConfig, Network } from '@cedra-labs/ts-sdk'

/**
 * Lottery Contract Client
 * Handles all interactions with the lottery smart contract
 */
class LotteryClient {
  private client: Cedra
  private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
  private readonly MODULE_NAME = 'lottery'

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
   * Get lottery object address by ID
   */
  async getLotteryAddress(lotteryId: number): Promise<string> {
    try {
      const result = await this.callViewFunction('get_lottery_address', [lotteryId.toString()])
      return result[0] as string
    } catch (error) {
      console.error('Error getting lottery address:', error)
      return '0x0'
    }
  }

  /**
   * Check if a lottery exists
   */
  async lotteryExists(lotteryObjAddr: string): Promise<boolean> {
    try {
      const result = await this.callViewFunction('lottery_exists', [lotteryObjAddr])
      return result[0] as boolean
    } catch (error) {
      console.error('Error checking lottery existence:', error)
      return false
    }
  }

  /**
   * Get lottery information
   * Returns: (lottery_id, organizer, ticket_price, end_time, participant_count, prize_amount, winner, is_drawn)
   */
  async getLotteryInfo(lotteryObjAddr: string): Promise<LotteryInfo> {
    try {
      const result = await this.callViewFunction('get_lottery_info', [lotteryObjAddr])
      
      const [lotteryId, organizer, ticketPrice, endTime, participantCount, prizeAmount, winner, isDrawn] = result as [string, string, string, string, string, string, string, boolean]
      
      return {
        lotteryId: parseInt(lotteryId) || 0,
        organizer: organizer || '0x0',
        ticketPrice: parseInt(ticketPrice) || 0,
        endTime: parseInt(endTime) || 0,
        participantCount: parseInt(participantCount) || 0,
        prizeAmount: parseInt(prizeAmount) || 0,
        winner: winner || '0x0',
        isDrawn: isDrawn || false
      }
    } catch (error) {
      console.error('Error getting lottery info:', error)
      return {
        lotteryId: 0,
        organizer: '0x0',
        ticketPrice: 0,
        endTime: 0,
        participantCount: 0,
        prizeAmount: 0,
        winner: '0x0',
        isDrawn: false
      }
    }
  }

  /**
   * Get all lotteries up to maxId
   */
  async getLotteries(maxId: number = 100): Promise<Lottery[]> {
    const lotteries: Lottery[] = []
    
    for (let id = 1; id <= maxId; id++) {
      try {
        const lotteryObjAddr = await this.getLotteryAddress(id)
        
        if (lotteryObjAddr === '0x0') {
          break
        }
        
        const exists = await this.lotteryExists(lotteryObjAddr)
        if (!exists) {
          break
        }
        
        const info = await this.getLotteryInfo(lotteryObjAddr)
        
        const now = Math.floor(Date.now() / 1000)
        const hasEnded = now >= info.endTime
        const remaining = Math.max(0, info.endTime - now)
        const canDraw = hasEnded && info.participantCount > 0 && !info.isDrawn
        
        lotteries.push({
          id: info.lotteryId,
          objectAddress: lotteryObjAddr,
          organizer: info.organizer,
          ticketPrice: info.ticketPrice,
          endTime: info.endTime,
          participantCount: info.participantCount,
          prizeAmount: info.prizeAmount,
          winner: info.winner,
          isDrawn: info.isDrawn,
          hasEnded,
          remaining,
          canDraw
        })
      } catch (error) {
        console.error(`Error fetching lottery ${id}:`, error)
        break
      }
    }
    
    return lotteries
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
export const lotteryClient = new LotteryClient()

/**
 * Lottery information interface
 */
export interface LotteryInfo {
  lotteryId: number
  organizer: string
  ticketPrice: number
  endTime: number
  participantCount: number
  prizeAmount: number
  winner: string
  isDrawn: boolean
}

/**
 * Complete lottery interface
 */
export interface Lottery {
  id: number
  objectAddress: string
  organizer: string
  ticketPrice: number
  endTime: number
  participantCount: number
  prizeAmount: number
  winner: string
  isDrawn: boolean
  hasEnded: boolean
  remaining: number
  canDraw: boolean
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
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}
