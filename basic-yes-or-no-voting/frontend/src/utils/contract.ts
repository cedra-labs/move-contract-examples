import { Cedra, CedraConfig, Network } from '@cedra-labs/ts-sdk'

/**
 * Voting Contract Client
 * Handles all interactions with the voting smart contract
 */
class VotingClient {
  private client: Cedra
  private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
  private readonly MODULE_NAME = 'voting'

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
   * Get voting results for a specific proposal
   * Returns: { yesVotes, noVotes, exists }
   */
  async getResults(proposalId: number): Promise<{
    yesVotes: number
    noVotes: number
    exists: boolean
  }> {
    try {
      const result = await this.callViewFunction('get_results', [proposalId.toString()])
      
      // Result is [yes_votes: u64, no_votes: u64, exists: bool]
      const [yesVotes, noVotes, exists] = result as [string, string, boolean]
      
      return {
        yesVotes: parseInt(yesVotes) || 0,
        noVotes: parseInt(noVotes) || 0,
        exists: exists || false
      }
    } catch (error) {
      console.error('Error getting results:', error)
      return {
        yesVotes: 0,
        noVotes: 0,
        exists: false
      }
    }
  }

  /**
   * Check if a proposal exists
   */
  async proposalExists(proposalId: number): Promise<boolean> {
    try {
      const result = await this.callViewFunction('proposal_exists', [proposalId.toString()])
      return result[0] as boolean
    } catch (error) {
      console.error('Error checking proposal existence:', error)
      return false
    }
  }

  /**
   * Get all proposals up to maxId
   * We check each ID sequentially until we find a non-existent one
   */
  async getProposals(maxId: number = 100): Promise<Proposal[]> {
    const proposals: Proposal[] = []
    
    for (let id = 1; id <= maxId; id++) {
      try {
        const exists = await this.proposalExists(id)
        
        if (!exists) {
          // No more proposals exist beyond this point
          break
        }
        
        const results = await this.getResults(id)
        
        if (results.exists) {
          const totalVotes = results.yesVotes + results.noVotes
          const yesPercentage = totalVotes > 0 ? (results.yesVotes / totalVotes) * 100 : 0
          const noPercentage = totalVotes > 0 ? (results.noVotes / totalVotes) * 100 : 0
          
          proposals.push({
            id,
            yesVotes: results.yesVotes,
            noVotes: results.noVotes,
            exists: results.exists,
            totalVotes,
            yesPercentage,
            noPercentage
          })
        }
      } catch (error) {
        console.error(`Error fetching proposal ${id}:`, error)
        // Stop if we encounter an error (likely means no more proposals)
        break
      }
    }
    
    return proposals
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
export const votingClient = new VotingClient()

/**
 * Proposal interface
 */
export interface Proposal {
  id: number
  yesVotes: number
  noVotes: number
  exists: boolean
  totalVotes: number
  yesPercentage: number
  noPercentage: number
}

/**
 * Helper to convert string to array of bytes for Move vector<u8>
 */
export function stringToBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str))
}
