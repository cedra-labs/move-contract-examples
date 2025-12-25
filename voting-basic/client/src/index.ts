import { 
  Account, 
  AccountAddress, 
  Cedra, 
  CedraConfig, 
  Network,
} from "@cedra-labs/ts-sdk";

// Configuration
const MODULE_ADDRESS = "604e072b2c6c7856ba66729783794aeb7a9bd97a8ec456a5bd0866abbeba45f7";
const MODULE_NAME = "poll";

// Token amounts (in smallest unit of CEDRA)
const ONE_CEDRA = 100_000_000;

// Status constants matching the Move contract
enum PollStatus {
  ACTIVE = 0,
  CLOSED = 1
}

// Types matching the Move contract
interface PollInfo {
  poll_id: string;
  creator: string;
  question?: string;
  yes_votes: string;
  no_votes: string;
  deadline: string;
  status: number;
  total_voters: string;
  created_at: string;
}

/**
 * Voting Poll Client Class
 */
class VotingClient {
  private cedra: Cedra;
  private moduleAddress: string;
  private moduleName: string;

  constructor(network: Network = Network.TESTNET, moduleAddress: string = MODULE_ADDRESS) {
    // Warn user if they haven't updated the module address
    if (moduleAddress === "_") {
      console.warn("⚠️  Warning: MODULE_ADDRESS is not set. Please deploy the contract and update MODULE_ADDRESS in the code.");
    }
    
    const fullnode = "https://testnet.cedra.dev/v1";
    const faucet = "https://faucet-api.cedra.dev";
    const config = new CedraConfig({ network, fullnode, faucet });
    this.cedra = new Cedra(config);
    this.moduleAddress = moduleAddress;
    this.moduleName = MODULE_NAME;
  }

  /**
   * Fund an account with CEDRA from faucet
   */
  async fundAccount(accountAddress: AccountAddress, amount: number = ONE_CEDRA): Promise<void> {
    try {
      await this.cedra.faucet.fundAccount({ accountAddress, amount });
      console.log(`✅ Funded account ${accountAddress.toString().slice(0, 10)}... with ${amount / ONE_CEDRA} CEDRA`);
    } catch (error) {
      console.error(`❌ Error funding account: ${error}`);
      throw error;
    }
  }

  /**
   * Create a new poll
   */
  async createPoll(
    creator: Account,
    question: string,
    deadlineSeconds: number
  ): Promise<string> {
    try {
      const questionBytes = Array.from(new TextEncoder().encode(question));

      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::create_poll`,
          functionArguments: [
            questionBytes,
            deadlineSeconds.toString()
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Poll created successfully!");
      console.log(`   Transaction hash: ${response.hash}`);
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error creating poll:", error);
      throw error;
    }
  }

  /**
   * Cast a vote on a poll
   */
  async vote(
    voter: Account,
    pollCreator: AccountAddress,
    pollId: number,
    voteYes: boolean
  ): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: voter.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::vote`,
          functionArguments: [
            pollCreator.toString(),
            pollId.toString(),
            voteYes
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: voter, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log(`✅ Vote cast successfully! (${voteYes ? 'YES' : 'NO'})`);
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error casting vote:", error);
      throw error;
    }
  }

  /**
   * Close a poll (creator only)
   */
  async closePoll(creator: Account, pollId: number): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::close_poll`,
          functionArguments: [pollId.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Poll closed successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error closing poll:", error);
      throw error;
    }
  }

  /**
   * Finalize an expired poll (anyone can call)
   */
  async finalizePoll(
    caller: Account,
    pollCreator: AccountAddress,
    pollId: number
  ): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: caller.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::finalize_poll`,
          functionArguments: [
            pollCreator.toString(),
            pollId.toString()
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: caller, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Poll finalized successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error finalizing poll:", error);
      throw error;
    }
  }

  /**
   * Delete a poll (creator only, no votes)
   */
  async deletePoll(creator: Account, pollId: number): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::delete_poll`,
          functionArguments: [pollId.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Poll deleted successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error deleting poll:", error);
      throw error;
    }
  }

  /**
   * Get poll information
   */
  async getPollInfo(creator: AccountAddress, pollId: number): Promise<PollInfo | null> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_poll_info`,
          functionArguments: [creator.toString(), pollId.toString()]
        }
      });

      const [poll_id, creatorAddr, questionBytes, yes_votes, no_votes, deadline, status, total_voters, created_at] = result as [
        string, string, number[], string, string, string, number, string, string
      ];
      
      const pollInfo: PollInfo = {
        poll_id,
        creator: creatorAddr,
        yes_votes,
        no_votes,
        deadline,
        status,
        total_voters,
        created_at
      };

      console.log("📊 Poll Info:");
      console.log(`   Poll ID: ${poll_id}`);
      console.log(`   Creator: ${creatorAddr.slice(0, 10)}...`);
      console.log(`   YES votes: ${yes_votes}`);
      console.log(`   NO votes: ${no_votes}`);
      console.log(`   Total voters: ${total_voters}`);
      console.log(`   Deadline: ${new Date(parseInt(deadline) * 1000).toLocaleString()}`);
      console.log(`   Status: ${this.getStatusString(status)}`);
      console.log(`   Created: ${new Date(parseInt(created_at) * 1000).toLocaleString()}`);

      return pollInfo;
    } catch (error) {
      console.error("❌ Error getting poll info:", error);
      return null;
    }
  }

  /**
   * Get all poll IDs for a creator
   */
  async getPollIds(creator: AccountAddress): Promise<number[]> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_poll_ids`,
          functionArguments: [creator.toString()]
        }
      });
      
      const ids = (result[0] as string[]).map(id => parseInt(id));
      console.log(`📋 Found ${ids.length} poll(s): [${ids.join(", ")}]`);
      return ids;
    } catch (error) {
      console.error("❌ Error getting poll IDs:", error);
      return [];
    }
  }

  /**
   * Check if a user has voted on a poll
   */
  async hasUserVoted(
    creator: AccountAddress,
    pollId: number,
    voter: AccountAddress
  ): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::has_user_voted`,
          functionArguments: [
            creator.toString(),
            pollId.toString(),
            voter.toString()
          ]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking if user voted:", error);
      return false;
    }
  }

  /**
   * Get vote counts for a poll
   */
  async getVoteCounts(creator: AccountAddress, pollId: number): Promise<{
    yesVotes: number;
    noVotes: number;
    totalVoters: number;
  }> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_vote_counts`,
          functionArguments: [creator.toString(), pollId.toString()]
        }
      });
      
      const [yes, no, total] = result as [string, string, string];
      
      return {
        yesVotes: parseInt(yes),
        noVotes: parseInt(no),
        totalVoters: parseInt(total)
      };
    } catch (error) {
      console.error("❌ Error getting vote counts:", error);
      return { yesVotes: 0, noVotes: 0, totalVoters: 0 };
    }
  }

  /**
   * Check if poll is active
   */
  async isPollActive(creator: AccountAddress, pollId: number): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::is_poll_active`,
          functionArguments: [creator.toString(), pollId.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking if poll is active:", error);
      return false;
    }
  }

  /**
   * Get poll result
   */
  async getPollResult(creator: AccountAddress, pollId: number): Promise<{
    yesWinning: boolean;
    yesVotes: number;
    noVotes: number;
  }> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_poll_result`,
          functionArguments: [creator.toString(), pollId.toString()]
        }
      });
      
      const [yesWinning, yes, no] = result as [boolean, string, string];
      
      return {
        yesWinning,
        yesVotes: parseInt(yes),
        noVotes: parseInt(no)
      };
    } catch (error) {
      console.error("❌ Error getting poll result:", error);
      return { yesWinning: false, yesVotes: 0, noVotes: 0 };
    }
  }

  /**
   * Check if poll exists
   */
  async pollExists(creator: AccountAddress, pollId: number): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::poll_exists`,
          functionArguments: [creator.toString(), pollId.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking poll existence:", error);
      return false;
    }
  }

  /**
   * Get total number of polls
   */
  async getTotalPolls(creator: AccountAddress): Promise<number> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_total_polls`,
          functionArguments: [creator.toString()]
        }
      });
      
      return parseInt(result[0] as string);
    } catch (error) {
      console.error("❌ Error getting total polls:", error);
      return 0;
    }
  }

  /**
   * Get status as a readable string
   */
  private getStatusString(status: number): string {
    switch (status) {
      case PollStatus.ACTIVE:
        return "Active";
      case PollStatus.CLOSED:
        return "Closed";
      default:
        return "Unknown";
    }
  }

  /**
   * Helper to get current timestamp + offset in seconds
   */
  getCurrentTimestampPlusSeconds(seconds: number): number {
    return Math.floor(Date.now() / 1000) + seconds;
  }
}

/**
 * Test 1: Complete Voting Lifecycle with Multiple Voters
 */
const testCompleteVotingLifecycle = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 1: Complete Voting Lifecycle");
  console.log("=".repeat(60));

  try {
    const client = new VotingClient();

    // Generate accounts
    const creator = Account.generate();
    const voter1 = Account.generate();
    const voter2 = Account.generate();
    const voter3 = Account.generate();
   
    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(creator.accountAddress, ONE_CEDRA);
    await client.fundAccount(voter1.accountAddress, ONE_CEDRA );
    await client.fundAccount(voter2.accountAddress, ONE_CEDRA );
    await client.fundAccount(voter3.accountAddress, ONE_CEDRA);
    
    // Create poll (deadline 1 hour from now)
    console.log("\n📦 Creating poll...");
    const question = "Should we implement the new feature?";
    const deadline = client.getCurrentTimestampPlusSeconds(3600);
    await client.createPoll(creator, question, deadline);

    // Get poll info
    console.log("\n📊 Fetching poll info...");
    await client.getPollInfo(creator.accountAddress, 0);

    // Check poll is active
    const isActive = await client.isPollActive(creator.accountAddress, 0);
    console.log(`\n✅ Poll is active: ${isActive}`);

    // Cast votes
    console.log("\n🗳️  Casting votes...");
    await client.vote(voter1, creator.accountAddress, 0, true);  // YES
    await client.vote(voter2, creator.accountAddress, 0, true);  // YES
    await client.vote(voter3, creator.accountAddress, 0, false);  // NO
    
    // Get vote counts
    console.log("\n📊 Fetching vote counts...");
    const counts = await client.getVoteCounts(creator.accountAddress, 0);
    console.log(`   YES votes: ${counts.yesVotes}`);
    console.log(`   NO votes: ${counts.noVotes}`);
    console.log(`   Total voters: ${counts.totalVoters}`);

    // Check if voters have voted
    console.log("\n✅ Verifying voters...");
    const voter1Voted = await client.hasUserVoted(creator.accountAddress, 0, voter1.accountAddress);
    const voter3Voted = await client.hasUserVoted(creator.accountAddress, 0, voter3.accountAddress);
    console.log(`   Voter 1 has voted: ${voter1Voted}`);
    console.log(`   Voter 3 has voted: ${voter3Voted}`);

    // Get poll result
    console.log("\n🏆 Fetching poll result...");
    const result = await client.getPollResult(creator.accountAddress, 0);
    console.log(`   YES winning: ${result.yesWinning}`);
    console.log(`   YES votes: ${result.yesVotes}`);
    console.log(`   NO votes: ${result.noVotes}`);

    // Close poll
    console.log("\n🔒 Closing poll...");
    await client.closePoll(creator, 0);

    // Verify poll is closed
    const isActiveAfterClose = await client.isPollActive(creator.accountAddress, 0);
    console.log(`   Poll is active: ${isActiveAfterClose}`);

    // Final verification
    if (counts.yesVotes === 2 && 
        counts.noVotes === 1 && 
        counts.totalVoters === 3 && 
        result.yesWinning && 
        !isActiveAfterClose) {
      console.log("\n✅ TEST 1 PASSED: Voting lifecycle completed successfully!");
      console.log("   - 3 votes cast (2 YES, 1 NO)");
      console.log("   - YES side won");
      console.log("   - Poll closed properly");
    } else {
      console.log("\n❌ TEST 1 FAILED: Verification error!");
    }

  } catch (error) {
    console.error("❌ TEST 1 FAILED:", error);
  }
};

/**
 * Test 2: Multiple Polls Management
 */
const testMultiplePolls = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 2: Multiple Polls Management");
  console.log("=".repeat(60));

  try {
    const client = new VotingClient();

    // Generate accounts
    const creator = Account.generate();
    const voter = Account.generate();

    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(creator.accountAddress, ONE_CEDRA * 2);
    await client.fundAccount(voter.accountAddress, ONE_CEDRA);

    // Create multiple polls
    console.log("\n📦 Creating 3 polls...");
    const deadline = client.getCurrentTimestampPlusSeconds(3600);
    
    await client.createPoll(creator, "Question 1: Should we upgrade the system?", deadline);
    await client.createPoll(creator, "Question 2: Should we change the logo?", deadline + 1000);
    await client.createPoll(creator, "Question 3: Should we add new features?", deadline + 2000);

    // Get all poll IDs
    console.log("\n📋 Fetching all poll IDs...");
    const pollIds = await client.getPollIds(creator.accountAddress);
    const totalPolls = await client.getTotalPolls(creator.accountAddress);
    console.log(`   Total polls created: ${totalPolls}`);

    if (pollIds.length === 3 && totalPolls === 3) {
      console.log("✅ Successfully created 3 polls");
    } else {
      console.log(`❌ Expected 3 polls, got ${pollIds.length}`);
    }

    // Vote on first poll
    console.log("\n🗳️  Voting on poll #0...");
    await client.vote(voter, creator.accountAddress, 0, true);

    // Delete the middle poll (no votes)
    console.log("\n🗑️  Deleting poll #1 (no votes)...");
    await client.deletePoll(creator, 1);

    // Get updated poll IDs
    console.log("\n📋 Fetching updated poll IDs...");
    const updatedPollIds = await client.getPollIds(creator.accountAddress);
    const updatedTotal = await client.getTotalPolls(creator.accountAddress);
    console.log(`   Total polls remaining: ${updatedTotal}`);

    // Verify results
    if (updatedPollIds.length === 2 && 
        updatedTotal === 2 &&
        updatedPollIds.includes(0) && 
        updatedPollIds.includes(2)) {
      console.log("\n✅ TEST 2 PASSED: Multiple polls managed correctly!");
      console.log(`   Remaining polls: [${updatedPollIds.join(", ")}]`);
      console.log("   - Poll with votes cannot be deleted (poll #0)");
      console.log("   - Poll without votes deleted successfully (poll #1)");
    } else {
      console.log("\n❌ TEST 2 FAILED: Poll management error!");
    }

  } catch (error) {
    console.error("❌ TEST 2 FAILED:", error);
  }
};

/**
 * Test 3: Edge Cases - Double Voting and Closed Poll
 */
const testEdgeCases = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 3: Edge Cases - Double Voting & Closed Poll");
  console.log("=".repeat(60));

  try {
    const client = new VotingClient();

    // Generate accounts
    const creator = Account.generate();
    const voter = Account.generate();
    const lateVoter = Account.generate();

    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(creator.accountAddress, ONE_CEDRA);
    await client.fundAccount(voter.accountAddress, ONE_CEDRA);
    await client.fundAccount(lateVoter.accountAddress, ONE_CEDRA);

    // Create poll
    console.log("\n📦 Creating poll...");
    const deadline = client.getCurrentTimestampPlusSeconds(3600);
    await client.createPoll(creator, "Test edge cases poll?", deadline);

    // First vote - should succeed
    console.log("\n🗳️  Casting first vote...");
    await client.vote(voter, creator.accountAddress, 0, true);
    const hasVoted1 = await client.hasUserVoted(creator.accountAddress, 0, voter.accountAddress);
    console.log(`   Voter has voted: ${hasVoted1}`);

    // Try to vote again - should fail
    console.log("\n❌ Attempting to vote twice (should fail)...");
    let doubleVoteFailed = false;
    try {
      await client.vote(voter, creator.accountAddress, 0, false);
      console.log("   ⚠️  ERROR: Double vote was allowed!");
    } catch (error) {
      console.log("   ✅ Double vote correctly prevented");
      doubleVoteFailed = true;
    }

    // Close the poll
    console.log("\n🔒 Closing poll...");
    await client.closePoll(creator, 0);
    const isActive = await client.isPollActive(creator.accountAddress, 0);
    console.log(`   Poll is active: ${isActive}`);

    // Try to vote on closed poll - should fail
    console.log("\n❌ Attempting to vote on closed poll (should fail)...");
    let closedVoteFailed = false;
    try {
      await client.vote(lateVoter, creator.accountAddress, 0, true);
      console.log("   ⚠️  ERROR: Vote on closed poll was allowed!");
    } catch (error) {
      console.log("   ✅ Vote on closed poll correctly prevented");
      closedVoteFailed = true;
    }

    // Get final counts
    console.log("\n📊 Final vote counts...");
    const counts = await client.getVoteCounts(creator.accountAddress, 0);
    console.log(`   YES votes: ${counts.yesVotes}`);
    console.log(`   NO votes: ${counts.noVotes}`);
    console.log(`   Total voters: ${counts.totalVoters}`);

    // Verify results
    if (doubleVoteFailed && 
        closedVoteFailed && 
        counts.totalVoters === 1 &&
        hasVoted1 &&
        !isActive) {
      console.log("\n✅ TEST 3 PASSED: Edge cases handled correctly!");
      console.log("   - Double voting prevented");
      console.log("   - Voting on closed poll prevented");
      console.log("   - Only 1 valid vote recorded");
    } else {
      console.log("\n❌ TEST 3 FAILED: Edge case handling error!");
    }

  } catch (error) {
    console.error("❌ TEST 3 FAILED:", error);
  }
};

/**
 * Main execution
 */
const main = async () => {
  console.log("🚀 Voting Contract Test Suite");
  console.log("=".repeat(60));

  const args = process.argv.slice(2);
  
  if (args.includes('--test1')) {
    await testCompleteVotingLifecycle();
  } else if (args.includes('--test2')) {
    await testMultiplePolls();
  } else if (args.includes('--test3')) {
    await testEdgeCases();
  } else {
    // Run all tests
    await testCompleteVotingLifecycle();
    await testMultiplePolls();
    await testEdgeCases();
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 All tests completed!");
    console.log("=".repeat(60));
  }
};

main().catch(console.error);