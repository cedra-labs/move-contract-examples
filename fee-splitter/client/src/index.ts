import { 
  Account, 
  AccountAddress, 
  Aptos, 
  AptosConfig, 
  Network, 
  Ed25519PrivateKey,
  MoveValue,
} from "@aptos-labs/ts-sdk";

// Configuration
const NETWORK = Network.DEVNET;
const MODULE_ADDRESS = "_"; // Replace with deployed contract address
const MODULE_NAME = "FeeSplitter";
const MODULE_FULL_PATH = `${MODULE_ADDRESS}::${MODULE_NAME}`;

// Token amounts (in octas - smallest unit of APT)
const ONE_APT_IN_OCTAS = 100_000_000;
const DEMO_AMOUNT = 1_000_000; // 0.01 APT

// Types matching the Move contract
interface Recipient {
  addr: string;
  share: string;
}



interface SplitterInfo {
  recipients: Recipient[];
  total_shares: string;
}

/**
 * Fee Splitter Client Class
 */
class FeeSplitterClient {
  private aptos: Aptos;
  private moduleAddress: string;
  private moduleName: string;

  constructor(network: Network = Network.DEVNET, moduleAddress: string = MODULE_ADDRESS) {
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
    this.moduleAddress = moduleAddress;
    this.moduleName = MODULE_NAME;
  }

  /**
   * Fund an account with APT from faucet
   */
  async fundAccount(accountAddress: AccountAddress, amount: number = ONE_APT_IN_OCTAS): Promise<void> {
    console.log(`💰 Funding account ${accountAddress.toString()} with ${amount / ONE_APT_IN_OCTAS} APT...`);
    try {
      await this.aptos.faucet.fundAccount({ accountAddress, amount });
      console.log(`✅ Funding completed for ${accountAddress.toString()}`);
    } catch (error) {
      console.error(`❌ Error funding account: ${error}`);
      throw error;
    }
  }

  /**
   * Get APT metadata address for fungible asset operations
   */
  async getAPTMetadata(): Promise<string> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_apt_metadata`,
          functionArguments: []
        }
      });
      return (result[0] as { inner: string }).inner;
    } catch (error) {
      console.error("❌ Error getting APT metadata:", error);
      // Fallback to known APT metadata address
      return "0x000000000000000000000000000000000000000000000000000000000000000a";
    }
  }

  /**
   * Check APT balance for an account using fungible assets
   */
  async checkBalance(name: string, address: AccountAddress): Promise<number> {
    try {
      const aptMetadata = await this.getAPTMetadata();
      const balanceResult = await this.aptos.view({
        payload: {
          function: "0x1::primary_fungible_store::balance",
          typeArguments: ["0x1::fungible_asset::Metadata"],
          functionArguments: [address.toString(), aptMetadata]
        }
      });
      
      const balance = parseInt(balanceResult[0] as string, 10);
      console.log(`💳 ${name}'s APT balance: ${balance / ONE_APT_IN_OCTAS} APT (${balance} octas)`);
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
    console.log(`🏗️  Creating fee splitter with ${recipients.length} recipients...`);

    // Prepare recipients for the contract
    const contractRecipients: MoveValue[] = recipients.map(r => [r.address.toString(), r.share.toString()]);

    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::create_splitter`,
          functionArguments: [contractRecipients]
        }
      });

      console.log("📝 Signing and submitting create splitter transaction...");
      const response = await this.aptos.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      console.log(`📨 Transaction submitted: ${response.hash}`);
      await this.aptos.waitForTransaction({ transactionHash: response.hash });
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
    console.log(`💸 Distributing ${amount / ONE_APT_IN_OCTAS} APT from ${sender.accountAddress.toString()}...`);

    try {
      // Get APT metadata for the transaction
      const aptMetadata = await this.getAPTMetadata();
      
      const transaction = await this.aptos.transaction.build.simple({
        sender: sender.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::distribute_fees`,
          functionArguments: [
            splitterOwnerAddress.toString(), 
            aptMetadata,
            amount.toString()
          ]
        }
      });

      console.log("📝 Signing and submitting distribution transaction...");
      const response = await this.aptos.signAndSubmitTransaction({ 
        signer: sender, 
        transaction 
      });
      
      console.log(`📨 Transaction submitted: ${response.hash}`);
      await this.aptos.waitForTransaction({ transactionHash: response.hash });
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
      console.log(`🔍 Getting splitter info for ${splitterAddress.toString()}...`);
      
      const result = await this.aptos.view({
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
      const result = await this.aptos.view({
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
}

/**
 * Demo function showcasing the fee splitter functionality
 */
const handleDemo = async () => {
  console.log("🚀 Starting Fee Splitter Demo");
  console.log("=" .repeat(50));

  try {
    // Initialize client
    const client = new FeeSplitterClient();

    // Generate accounts
    const creator = Account.generate();
    const recipient1 = Account.generate();
    const recipient2 = Account.generate();
    const recipient3 = Account.generate();
    const payer = Account.generate();

    console.log("\n📋 Generated Accounts:");
    console.log(`Creator:    ${creator.accountAddress.toString()}`);
    console.log(`Recipient1: ${recipient1.accountAddress.toString()}`);
    console.log(`Recipient2: ${recipient2.accountAddress.toString()}`);
    console.log(`Recipient3: ${recipient3.accountAddress.toString()}`);
    console.log(`Payer:      ${payer.accountAddress.toString()}`);

    // Fund accounts
    console.log("\n💰 Funding accounts...");
    await client.fundAccount(creator.accountAddress);
    await client.fundAccount(recipient1.accountAddress, ONE_APT_IN_OCTAS / 10); // 0.1 APT
    await client.fundAccount(recipient2.accountAddress, ONE_APT_IN_OCTAS / 10);
    await client.fundAccount(recipient3.accountAddress, ONE_APT_IN_OCTAS / 10);
    await client.fundAccount(payer.accountAddress);

    // Check initial balances
    console.log("\n💳 Initial balances:");
    await client.checkBalance("Creator", creator.accountAddress);
    await client.checkBalance("Recipient1", recipient1.accountAddress);
    await client.checkBalance("Recipient2", recipient2.accountAddress);
    await client.checkBalance("Recipient3", recipient3.accountAddress);
    await client.checkBalance("Payer", payer.accountAddress);

    // Create fee splitter
    console.log("\n🏗️  Creating fee splitter...");
    const recipients = [
      { address: recipient1.accountAddress, share: 50 }, // 50%
      { address: recipient2.accountAddress, share: 30 }, // 30%
      { address: recipient3.accountAddress, share: 20 }  // 20%
    ];

    await client.createSplitter(creator, recipients);

    // Get splitter info
    console.log("\n📊 Splitter created! Getting info...");
    await client.getSplitterInfo(creator.accountAddress);

    // Distribute fees
    console.log("\n💸 Distributing fees...");
    await client.distributeFees(payer, creator.accountAddress, DEMO_AMOUNT);

    // Check final balances
    console.log("\n💳 Final balances:");
    await client.checkBalance("Creator", creator.accountAddress);
    await client.checkBalance("Recipient1", recipient1.accountAddress);
    await client.checkBalance("Recipient2", recipient2.accountAddress);
    await client.checkBalance("Recipient3", recipient3.accountAddress);
    await client.checkBalance("Payer", payer.accountAddress);

    console.log("\n🎉 Demo completed successfully!");

  } catch (error) {
    console.error("\n❌ Demo failed:", error);
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
    await handleDemo();
  }
};

// Export the client class for use in other modules
export { FeeSplitterClient, Recipient, SplitterInfo };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 