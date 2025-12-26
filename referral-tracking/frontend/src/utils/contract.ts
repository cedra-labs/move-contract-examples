import { Cedra, CedraConfig, Network } from '@cedra-labs/ts-sdk'

class ReferralClient {
  private client: Cedra
  private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
  private readonly MODULE_NAME = 'referral_tracking'

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
   * Get user statistics
   */
  async getUserStats(userAddress: string): Promise<{
    code: string
    referrer: string
    referredCount: number
    pendingRewards: number
    totalEarned: number
  }> {
    try {
      const result = await this.callViewFunction('get_user_stats', [userAddress])
      
      // Result is [code: string, referrer: address, referredCount: u64, pendingRewards: u64, totalEarned: u64]
      const [code, referrer, referredCount, pendingRewards, totalEarned] = result as [string, string, string, string, string]
      
      return {
        code: code || '',
        referrer: referrer || '0x0',
        referredCount: parseInt(referredCount) || 0,
        pendingRewards: parseInt(pendingRewards) || 0,
        totalEarned: parseInt(totalEarned) || 0
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return {
        code: '',
        referrer: '0x0',
        referredCount: 0,
        pendingRewards: 0,
        totalEarned: 0
      }
    }
  }

  /**
   * Get treasury statistics
   */
  async getTreasuryStats(): Promise<{
    balance: number
    totalDeposited: number
  }> {
    try {
      const result = await this.callViewFunction('get_treasury_stats', [])
      
      // Result is [balance: u64, totalDeposited: u64]
      const [balance, totalDeposited] = result as [string, string]
      
      return {
        balance: parseInt(balance) || 0,
        totalDeposited: parseInt(totalDeposited) || 0
      }
    } catch (error) {
      console.error('Error getting treasury stats:', error)
      return {
        balance: 0,
        totalDeposited: 0
      }
    }
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<{
    admin: string
    rewardToken: string
    isActive: boolean
    totalRewardsPaid: number
    fixedReward: number
  }> {
    try {
      const result = await this.callViewFunction('get_global_stats', [])
      
      // Result is [admin: address, rewardToken: Object<Metadata>, isActive: bool, totalRewardsPaid: u64, fixedReward: u64]
      const [admin, rewardToken, isActive, totalRewardsPaid, fixedReward] = result as [string, any, boolean, string, string]
      
      // Handle rewardToken which might be an object with {inner: "0x..."} structure
      let rewardTokenStr = ''
      if (typeof rewardToken === 'object' && rewardToken !== null) {
        // Object<Metadata> is returned as {inner: "address"}
        rewardTokenStr = rewardToken.inner || JSON.stringify(rewardToken)
      } else if (typeof rewardToken === 'string') {
        rewardTokenStr = rewardToken
      }
      
      return {
        admin: admin || '',
        rewardToken: rewardTokenStr,
        isActive: isActive,
        totalRewardsPaid: parseInt(totalRewardsPaid) || 0,
        fixedReward: parseInt(fixedReward) || 0
      }
    } catch (error) {
      console.error('Error getting global stats:', error)
      return {
        admin: '',
        rewardToken: '',
        isActive: false,
        totalRewardsPaid: 0,
        fixedReward: 0
      }
    }
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
export const referralClient = new ReferralClient()

// Helper to convert string to array of bytes for Move vector<u8>
export function stringToBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str))
}

// Helper to convert CEDRA to octas (1 CEDRA = 100,000,000 octas)
export function cedraToOctas(cedra: number): string {
  const OCTAS_PER_CEDRA = 100_000_000
  return (cedra * OCTAS_PER_CEDRA).toString()
}

// Helper to convert octas to CEDRA
export function octasToCedra(octas: number): number {
  const OCTAS_PER_CEDRA = 100_000_000
  return octas / OCTAS_PER_CEDRA
}

