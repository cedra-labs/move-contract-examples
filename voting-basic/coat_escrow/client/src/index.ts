import { 
  Account, 
  AccountAddress, 
  Cedra, 
  CedraConfig, 
  Network,
} from "@cedra-labs/ts-sdk";

// Configuration
const MODULE_ADDRESS = "604e072b2c6c7856ba66729783794aeb7a9bd97a8ec456a5bd0866abbeba45f7";  
const MODULE_NAME = "escrow";

// Token amounts (in smallest unit of CEDRA)
const ONE_CEDRA = 100_000_000;
const EXAMPLE_AMOUNT = 10_000_000; // 0.1 CEDRA

// Status constants matching the Move contract
enum EscrowStatus {
  INITIALIZED = 0,
  FUNDED = 1,
  RELEASED = 2,
  REFUNDED = 3,
  DISPUTED = 4
}

// Types matching the Move contract
interface EscrowInfo {
  escrow_id: string;
  buyer: string;
  seller: string;
  arbiters: string[];
  amount: string;
  deadline: string;
  status: number;
  funds_deposited: boolean;
}

/**
 * Escrow Client Class
 */
class EscrowClient {
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
   * Get CEDRA metadata address for fungible asset operations
   */
  getCEDRAMetadata(): string {
    return "0x000000000000000000000000000000000000000000000000000000000000000a";
  }

  /**
   * Check CEDRA balance for an account
   */
  async checkBalance(name: string, address: AccountAddress): Promise<number> {
    try {
      const balanceResult = await this.cedra.view({
        payload: {
          function: "0x1::primary_fungible_store::balance",
          typeArguments: ["0x1::fungible_asset::Metadata"],
          functionArguments: [address.toString(), this.getCEDRAMetadata()]
        }
      });
      
      const balance = parseInt(balanceResult[0] as string, 10);
      console.log(`💰 ${name} balance: ${(balance / ONE_CEDRA).toFixed(4)} CEDRA`);
      return balance;
    } catch (error) {
      console.error(`❌ Error getting balance for ${name}:`, error);
      return 0;
    }
  }

  /**
   * Create a new escrow
   */
  async createEscrow(
    buyer: Account,
    sellerAddress: AccountAddress,
    arbiterAddresses: AccountAddress[],
    amount: number,
    deadlineSeconds: number
  ): Promise<string> {
    try {
      const cedraMetadata = this.getCEDRAMetadata();
      const arbiterStrings = arbiterAddresses.map(addr => addr.toString());

      const transaction = await this.cedra.transaction.build.simple({
        sender: buyer.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::create_escrow`,
          functionArguments: [
            sellerAddress.toString(),
            arbiterStrings,
            amount.toString(),
            deadlineSeconds.toString(),
            cedraMetadata
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: buyer, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Escrow created successfully!");
      console.log(`   Transaction hash: ${response.hash}`);
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error creating escrow:", error);
      throw error;
    }
  }

  /**
   * Deposit funds into an escrow
   */
  async deposit(buyer: Account, escrowId: number): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: buyer.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::deposit`,
          functionArguments: [escrowId.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: buyer, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Funds deposited successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error depositing funds:", error);
      throw error;
    }
  }

  /**
   * Release funds to seller
   */
  async release(buyer: Account, escrowId: number): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: buyer.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::release`,
          functionArguments: [escrowId.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: buyer, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Funds released to seller successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error releasing funds:", error);
      throw error;
    }
  }

  /**
   * Refund funds to buyer after deadline
   */
  async refund(buyer: Account, escrowId: number): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: buyer.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::refund`,
          functionArguments: [escrowId.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: buyer, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Funds refunded to buyer successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error refunding funds:", error);
      throw error;
    }
  }

  /**
   * Raise a dispute
   */
  async raiseDispute(
    caller: Account,
    escrowOwnerAddress: AccountAddress,
    escrowId: number
  ): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: caller.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::raise_dispute`,
          functionArguments: [
            escrowOwnerAddress.toString(),
            escrowId.toString()
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: caller, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Dispute raised successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error raising dispute:", error);
      throw error;
    }
  }

  /**
   * Resolve a dispute (arbiter only)
   */
  async resolveDispute(
    arbiter: Account,
    buyer: Account,
    escrowId: number,
    releaseToSeller: boolean
  ): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: arbiter.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::resolve_dispute`,
          functionArguments: [
            buyer.accountAddress.toString(),
            escrowId.toString(),
            releaseToSeller
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: arbiter, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log(`✅ Dispute resolved in favor of ${releaseToSeller ? 'seller' : 'buyer'}!`);
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error resolving dispute:", error);
      throw error;
    }
  }

  /**
   * Cancel an unfunded escrow
   */
  async cancelEscrow(buyer: Account, escrowId: number): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: buyer.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::cancel_escrow`,
          functionArguments: [escrowId.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: buyer, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Escrow cancelled successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error cancelling escrow:", error);
      throw error;
    }
  }

  /**
   * Get escrow information
   */
  async getEscrowInfo(escrowOwnerAddress: AccountAddress): Promise<EscrowInfo | null> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_escrow_info`,
          functionArguments: [escrowOwnerAddress.toString()]
        }
      });

      const [escrowId, buyer, seller, arbiters, amount, deadline, status, fundsDeposited] = result as [
        string, string, string, string[], string, string, number, boolean
      ];
      
      const escrowInfo: EscrowInfo = {
        escrow_id: escrowId,
        buyer,
        seller,
        arbiters,
        amount,
        deadline,
        status,
        funds_deposited: fundsDeposited
      };

      console.log("📊 Escrow Info:");
      console.log(`   Escrow ID: ${escrowId}`);
      console.log(`   Buyer: ${buyer.slice(0, 10)}...`);
      console.log(`   Seller: ${seller.slice(0, 10)}...`);
      console.log(`   Amount: ${(parseInt(amount) / ONE_CEDRA).toFixed(4)} CEDRA`);
      console.log(`   Deadline: ${new Date(parseInt(deadline) * 1000).toLocaleString()}`);
      console.log(`   Status: ${this.getStatusString(status)}`);
      console.log(`   Funded: ${fundsDeposited}`);
      if (arbiters.length > 0) {
        console.log(`   Arbiter: ${arbiters[0].slice(0, 10)}...`);
      }

      return escrowInfo;
    } catch (error) {
      console.error("❌ Error getting escrow info:", error);
      return null;
    }
  }

  /**
   * Check if an escrow exists
   */
  async escrowExists(escrowOwnerAddress: AccountAddress): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::escrow_exists`,
          functionArguments: [escrowOwnerAddress.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking escrow existence:", error);
      return false;
    }
  }

  /**
   * Get all escrow IDs for an account
   */
  async getEscrowIds(ownerAddress: AccountAddress): Promise<number[]> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_escrow_ids`,
          functionArguments: [ownerAddress.toString()]
        }
      });
      
      const ids = (result[0] as string[]).map(id => parseInt(id));
      console.log(`📋 Found ${ids.length} escrow(s): [${ids.join(", ")}]`);
      return ids;
    } catch (error) {
      console.error("❌ Error getting escrow IDs:", error);
      return [];
    }
  }

  /**
   * Check if an escrow is funded
   */
  async isFunded(escrowOwnerAddress: AccountAddress): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::is_funded`,
          functionArguments: [escrowOwnerAddress.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking if escrow is funded:", error);
      return false;
    }
  }

  /**
   * Get status as a readable string
   */
  private getStatusString(status: number): string {
    switch (status) {
      case EscrowStatus.INITIALIZED:
        return "Initialized";
      case EscrowStatus.FUNDED:
        return "Funded";
      case EscrowStatus.RELEASED:
        return "Released";
      case EscrowStatus.REFUNDED:
        return "Refunded";
      case EscrowStatus.DISPUTED:
        return "Disputed";
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
 * Test 1: Complete Successful Escrow Lifecycle (Create -> Deposit -> Release)
 */
const testSuccessfulEscrow = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 1: Successful Escrow Lifecycle");
  console.log("=".repeat(60));

  try {
    const client = new EscrowClient();

    // Generate accounts
    const buyer = Account.generate();
    const seller = Account.generate();

    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(buyer.accountAddress, ONE_CEDRA * 2);
    await client.fundAccount(seller.accountAddress, ONE_CEDRA / 10);

    // Check initial balances
    console.log("\n💰 Initial Balances:");
   const sellerInitialBalance = await client.checkBalance("Seller", seller.accountAddress);

    // Create escrow (deadline 1 hour from now)
    console.log("\n📦 Creating escrow...");
    const deadline = client.getCurrentTimestampPlusSeconds(3600);
    await client.createEscrow(
      buyer,
      seller.accountAddress,
      [], // No arbiter
      EXAMPLE_AMOUNT,
      deadline
    );

    // Get escrow info
    console.log("\n📊 Fetching escrow info...");
    await client.getEscrowInfo(buyer.accountAddress);

    // Deposit funds
    console.log("\n💵 Depositing funds...");
    await client.deposit(buyer, 0);

    // Release funds to seller
    console.log("\n🚀 Releasing funds to seller...");
    await client.release(buyer, 0);

    // Check final balances
    console.log("\n💰 Final Balances:");
    const sellerFinalBalance = await client.checkBalance("Seller", seller.accountAddress);

    // Verify amounts
    const sellerReceived = sellerFinalBalance - sellerInitialBalance;
    console.log(`\n✅ Seller received: ${(sellerReceived / ONE_CEDRA).toFixed(4)} CEDRA`);
    console.log(`   Expected: ${(EXAMPLE_AMOUNT / ONE_CEDRA).toFixed(4)} CEDRA`);
    
    if (sellerReceived === EXAMPLE_AMOUNT) {
      console.log("✅ TEST 1 PASSED: Escrow completed successfully!");
    } else {
      console.log("❌ TEST 1 FAILED: Amount mismatch!");
    }

  } catch (error) {
    console.error("❌ TEST 1 FAILED:", error);
  }
};

/**
 * Test 2: Multiple Escrows Management
 */
const testMultipleEscrows = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 2: Multiple Escrows Management");
  console.log("=".repeat(60));

  try {
    const client = new EscrowClient();

    // Generate accounts
    const buyer = Account.generate();
    const seller1 = Account.generate();
    const seller2 = Account.generate();
    const seller3 = Account.generate();

    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(buyer.accountAddress, ONE_CEDRA * 3);
    await client.fundAccount(seller1.accountAddress, ONE_CEDRA / 10);
    await client.fundAccount(seller2.accountAddress, ONE_CEDRA / 10);
    await client.fundAccount(seller3.accountAddress, ONE_CEDRA / 10);

    // Create multiple escrows
    console.log("\n📦 Creating 3 escrows...");
    const deadline = client.getCurrentTimestampPlusSeconds(3600);
    
    await client.createEscrow(buyer, seller1.accountAddress, [], EXAMPLE_AMOUNT, deadline);
    await client.createEscrow(buyer, seller2.accountAddress, [], EXAMPLE_AMOUNT * 2, deadline + 1000);
    await client.createEscrow(buyer, seller3.accountAddress, [], EXAMPLE_AMOUNT * 3, deadline + 2000);

    // Get all escrow IDs
    console.log("\n📋 Fetching all escrow IDs...");
    const escrowIds = await client.getEscrowIds(buyer.accountAddress);

    if (escrowIds.length === 3) {
      console.log("✅ Successfully created 3 escrows");
    } else {
      console.log(`❌ Expected 3 escrows, got ${escrowIds.length}`);
    }

    // Cancel the middle escrow
    console.log("\n🗑️  Cancelling escrow #1...");
    await client.cancelEscrow(buyer, 1);

    // Get updated escrow IDs
    console.log("\n📋 Fetching updated escrow IDs...");
    const updatedEscrowIds = await client.getEscrowIds(buyer.accountAddress);

    if (updatedEscrowIds.length === 2 && 
        updatedEscrowIds.includes(0) && 
        updatedEscrowIds.includes(2)) {
      console.log("✅ TEST 2 PASSED: Multiple escrows managed correctly!");
      console.log(`   Remaining escrows: [${updatedEscrowIds.join(", ")}]`);
    } else {
      console.log("❌ TEST 2 FAILED: Escrow management error!");
    }

  } catch (error) {
    console.error("❌ TEST 2 FAILED:", error);
  }
};

/**
 * Main execution
 */
const main = async () => {
  console.log("🚀 Escrow Contract Test Suite");
  console.log("=".repeat(60));

  const args = process.argv.slice(2);
  
  if (args.includes('--test1')) {
    await testSuccessfulEscrow();
  }  else if (args.includes('--test2')) {
    await testMultipleEscrows();
  } else {
    // Run all tests
    await testSuccessfulEscrow();
    await testMultipleEscrows();
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 All tests completed!");
    console.log("=".repeat(60));
  }
};

main().catch(console.error);