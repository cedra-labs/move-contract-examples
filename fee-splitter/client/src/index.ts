import { 
  Account, 
  AccountAddress, 
  Cedra, 
  CedraConfig, 
  Network,
} from "@cedra-labs/ts-sdk";

// Configuration
const MODULE_ADDRESS = "_"; // Replace with your deployed contract address
const MODULE_NAME = "fee_splitter";

// Token amounts (in smallest unit of CEDRA)
const ONE_CEDRA = 100_000_000;
const EXAMPLE_AMOUNT = 1_000_000; // 0.01 CEDRA

// Types matching the Move contract
interface Recipient {
  addr: string;
  share: string;
}

interface SplitterInfo {
  recipients: Recipient[];
  total_shares: string;
}

interface SplitterDetails {
  recipients: Recipient[];
  total_shares: string;
  owner: string;
  paused: boolean;
  created_at: string;
  total_distributed: string;
}

/**
 * Fee Splitter Client Class
 */
class FeeSplitterClient {
  private cedra: Cedra;
  private moduleAddress: string;
  private moduleName: string;

  constructor(network: Network = Network.DEVNET, moduleAddress: string = MODULE_ADDRESS) {
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
    } catch (error) {
      console.error(`❌ Error funding account: ${error}`);
      throw error;
    }
  }

  /**
   * Get CEDRA metadata address for fungible asset operations (client-side)
   */
  getCEDRAMetadata(): string {
    // CEDRA metadata address (replace with actual CEDRA metadata address)
    return "0x000000000000000000000000000000000000000000000000000000000000000a";
  }

  /**
   * Get metadata address for any fungible asset (client-side helper)
   */
  getFungibleAssetMetadata(assetAddress: string): string {
    // For most fungible assets, the metadata object is at the same address
    // For CEDRA specifically, use the configured address
    if (assetAddress === "CEDRA") {
      return "0x000000000000000000000000000000000000000000000000000000000000000a";
    }
    // For other assets, you'd typically use the provided metadata address
    return assetAddress;
  }

  /**
   * Check CEDRA balance for an account using fungible assets
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
      return balance;
    } catch (error) {
      console.error(`❌ Error getting balance for ${name}:`, error);
      return 0;
    }
  }

  /**
   * Create a new fee splitter
   */
  async createSplitter(
    creator: Account, 
    recipients: Array<{ address: AccountAddress; share: number }>
  ): Promise<string> {
    // Prepare separate arrays for addresses and shares
    const addresses = recipients.map(r => r.address.toString());
    const shares = recipients.map(r => r.share.toString());

    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::create_splitter`,
          functionArguments: [addresses, shares]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Fee splitter created successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error creating splitter:", error);
      throw error;
    }
  }

  /**
   * Distribute fees to recipients according to their shares using fungible assets
   */
  async distributeFees(
    sender: Account,
    splitterOwnerAddress: AccountAddress,
    amount: number
  ): Promise<string> {
    try {
      // Get CEDRA metadata for the transaction (client-side)
      const cedraMetadata = this.getCEDRAMetadata();
      
      const transaction = await this.cedra.transaction.build.simple({
        sender: sender.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::distribute_fees`,
          functionArguments: [
            splitterOwnerAddress.toString(), 
            cedraMetadata,
            amount.toString()
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: sender, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Fees distributed successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error distributing fees:", error);
      throw error;
    }
  }

  /**
   * Get splitter information
   */
  async getSplitterInfo(splitterAddress: AccountAddress): Promise<SplitterInfo | null> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_splitter_info`,
          functionArguments: [splitterAddress.toString()]
        }
      });

      const [recipients, totalShares] = result as [Recipient[], string];
      
      const splitterInfo: SplitterInfo = {
        recipients,
        total_shares: totalShares
      };

      console.log("📊 Splitter Info:");
      console.log(`   Total Shares: ${totalShares}`);
      console.log(`   Recipients:`);
      recipients.forEach((recipient, index) => {
        const percentage = (parseInt(recipient.share) / parseInt(totalShares) * 100).toFixed(2);
        console.log(`     ${index + 1}. ${recipient.addr} - ${recipient.share} shares (${percentage}%)`);
      });

      return splitterInfo;
    } catch (error) {
      console.error("❌ Error getting splitter info:", error);
      return null;
    }
  }

  /**
   * Check if a splitter exists
   */
  async splitterExists(splitterAddress: AccountAddress): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::splitter_exists`,
          functionArguments: [splitterAddress.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking splitter existence:", error);
      return false;
    }
  }

  /**
   * Get detailed splitter information including owner, paused status, and stats
   */
  async getSplitterDetails(splitterAddress: AccountAddress): Promise<SplitterDetails | null> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_splitter_details`,
          functionArguments: [splitterAddress.toString()]
        }
      });

      const [recipients, totalShares, owner, paused, createdAt, totalDistributed] = result as [Recipient[], string, string, boolean, string, string];

      const splitterDetails: SplitterDetails = {
        recipients,
        total_shares: totalShares,
        owner,
        paused,
        created_at: createdAt,
        total_distributed: totalDistributed
      };

      console.log("📊 Splitter Details:");
      console.log(`   Owner: ${owner}`);
      console.log(`   Paused: ${paused}`);
      console.log(`   Total Shares: ${totalShares}`);
      console.log(`   Total Distributed: ${totalDistributed}`);
      console.log(`   Created At: ${createdAt}`);
      console.log(`   Recipients:`);
      recipients.forEach((recipient, index) => {
        const percentage = (parseInt(recipient.share) / parseInt(totalShares) * 100).toFixed(2);
        console.log(`     ${index + 1}. ${recipient.addr} - ${recipient.share} shares (${percentage}%)`);
      });

      return splitterDetails;
    } catch (error) {
      console.error("❌ Error getting splitter details:", error);
      return null;
    }
  }

  /**
   * Update splitter recipients and shares (owner only)
   */
  async updateSplitter(
    owner: Account,
    recipients: Array<{ address: AccountAddress; share: number }>
  ): Promise<string> {
    // Prepare separate arrays for addresses and shares
    const addresses = recipients.map(r => r.address.toString());
    const shares = recipients.map(r => r.share.toString());

    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: owner.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::update_splitter`,
          functionArguments: [addresses, shares]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({
        signer: owner,
        transaction
      });

      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Fee splitter updated successfully!");

      return response.hash;
    } catch (error) {
      console.error("❌ Error updating splitter:", error);
      throw error;
    }
  }

  /**
   * Pause or unpause the splitter (owner only)
   */
  async setPaused(owner: Account, paused: boolean): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: owner.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::set_paused`,
          functionArguments: [paused]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({
        signer: owner,
        transaction
      });

      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log(`✅ Fee splitter ${paused ? 'paused' : 'unpaused'} successfully!`);

      return response.hash;
    } catch (error) {
      console.error(`❌ Error ${paused ? 'pausing' : 'unpausing'} splitter:`, error);
      throw error;
    }
  }

  /**
   * Transfer ownership of the splitter
   */
  async transferOwnership(owner: Account, newOwner: AccountAddress): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: owner.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::transfer_ownership`,
          functionArguments: [newOwner.toString()]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({
        signer: owner,
        transaction
      });

      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Ownership transferred successfully!");

      return response.hash;
    } catch (error) {
      console.error("❌ Error transferring ownership:", error);
      throw error;
    }
  }

  /**
   * Delete the splitter (owner only, only if no distributions have occurred)
   */
  async deleteSplitter(owner: Account): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: owner.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::delete_splitter`,
          functionArguments: []
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({
        signer: owner,
        transaction
      });

      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Fee splitter deleted successfully!");

      return response.hash;
    } catch (error) {
      console.error("❌ Error deleting splitter:", error);
      throw error;
    }
  }
}

/**
 * Example function showcasing the fee splitter functionality
 */
const handleExample = async () => {
  console.log("🚀 Fee Splitter Example");

  try {
    const client = new FeeSplitterClient();

    // Generate accounts
    const creator = Account.generate();
    const recipient1 = Account.generate();
    const recipient2 = Account.generate();
    const recipient3 = Account.generate();
    const payer = Account.generate();
    const newOwner = Account.generate();

    // Fund accounts
    await client.fundAccount(creator.accountAddress);
    await client.fundAccount(recipient1.accountAddress, ONE_CEDRA / 10);
    await client.fundAccount(recipient2.accountAddress, ONE_CEDRA / 10);
    await client.fundAccount(recipient3.accountAddress, ONE_CEDRA / 10);
    await client.fundAccount(payer.accountAddress);
    await client.fundAccount(newOwner.accountAddress);

    console.log("📝 Creating fee splitter...");
    // Create fee splitter
    const recipients = [
      { address: recipient1.accountAddress, share: 50 },
      { address: recipient2.accountAddress, share: 30 },
      { address: recipient3.accountAddress, share: 20 }
    ];

    await client.createSplitter(creator, recipients);

    console.log("📊 Getting splitter details...");
    await client.getSplitterDetails(creator.accountAddress);

    console.log("🔄 Updating splitter recipients...");
    const updatedRecipients = [
      { address: recipient1.accountAddress, share: 40 },
      { address: recipient2.accountAddress, share: 35 },
      { address: recipient3.accountAddress, share: 25 }
    ];
    await client.updateSplitter(creator, updatedRecipients);
    await client.getSplitterDetails(creator.accountAddress);

    console.log("⏸️  Pausing splitter...");
    await client.setPaused(creator, true);
    await client.getSplitterDetails(creator.accountAddress);

    console.log("▶️  Unpausing splitter...");
    await client.setPaused(creator, false);

    console.log("💰 Distributing fees...");
    // Distribute fees
    await client.distributeFees(payer, creator.accountAddress, EXAMPLE_AMOUNT);

    console.log("👤 Transferring ownership...");
    await client.transferOwnership(creator, newOwner.accountAddress);
    await client.getSplitterDetails(creator.accountAddress);

    console.log("🗑️  Deleting splitter...");
    // Note: This will fail if distributions have occurred, which is expected
    try {
      await client.deleteSplitter(creator);
    } catch (error) {
      console.log("⚠️  Cannot delete splitter with distributions - this is expected!");
    }

    console.log("🎉 Example completed successfully!");

  } catch (error) {
    console.error("❌ Example failed:", error);
  }
};

/**
 * Interactive CLI for testing different scenarios
 */
const handleInteractiveMode = async () => {
  console.log("🔧 Interactive mode not implemented yet.");
  console.log("You can extend this client with interactive CLI using libraries like 'inquirer'");
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive')) {
    await handleInteractiveMode();
  } else {
    await handleExample();
  }
};

// Export the client class for use in other modules
export { FeeSplitterClient, Recipient, SplitterInfo, SplitterDetails };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 