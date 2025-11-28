import { Account, AccountAddress, Cedra, CedraConfig, Network, Ed25519PrivateKey } from "@cedra-labs/ts-sdk";

// Constants
const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "_";
const MODULE_NAME = "CedraAsset";
const MODULE_FULL_PATH = `${MODULE_ADDRESS}::${MODULE_NAME}`;

// Using private key to create account is a security risk, this is only for educational purposes.
// For production use, do not define your private key as this will expose to the public
// This must match the account that deployed the contract (from contract/.cedra/config.yaml)
const ADMIN_PRIVATE_KEY = "_";

// Token amounts
const ONE_CEDRA_IN_OCTAS = 100_000_000; // 1 CEDRA = 100 million octas
const INITIAL_MINT = 10_000; // Initial supply
const BURN_AMOUNT_1 = 1_000; // First burn
const BURN_AMOUNT_2 = 500; // Second burn
const BURN_AMOUNT_3 = 250; // Third burn

/**
 * Funds an account with 1 CEDRA
 */
const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress) => {
  console.log(`Funding account ${accountAddress.toString()} with 1 CEDRA...`);
  await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
  console.log(`Funding completed for ${accountAddress.toString()}`);
};

/**
 * Checks token balance for an account
 */
const checkBalance = async (cedra: Cedra, name: string, address: AccountAddress): Promise<number> => {
  try {
    // First get the metadata object
    const metadataResult = await cedra.view({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_metadata`,
        typeArguments: [],
        functionArguments: []
      }
    });
    
    const metadataAddress = (metadataResult[0] as { inner: string }).inner;
    
    // Actually use primary_fungible_store::balance
    const [balanceStr] = await cedra.view<[string]>({
      payload: {
        function: "0x1::primary_fungible_store::balance",
        typeArguments: ["0x1::fungible_asset::Metadata"],
        functionArguments: [address.toString(), metadataAddress]
      }
    });
    
    const amount = parseInt(balanceStr, 10);
    console.log(`${name}'s CedraAsset balance is: ${amount}`);
    return amount;
  } catch (error) {
    console.error(`Error getting balance for ${name}:`, error);
    return 0;
  }
};

/**
 * Burns tokens from an account
 */
const burnTokens = async (cedra: Cedra, signer: Account, amount: number) => {
  console.log(`\nBurning ${amount} tokens from ${signer.accountAddress.toString()}...`);
  
  const burnTxn = await cedra.transaction.build.simple({
    sender: signer.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::burn`,
      functionArguments: [amount] 
    }
  });
  
  console.log("Burn transaction built successfully, signing...");
  const burnRes = await cedra.signAndSubmitTransaction({ signer, transaction: burnTxn });
  console.log("Burn transaction submitted: ", burnRes.hash);
  
  console.log("Waiting for burn transaction to be confirmed...");
  await cedra.waitForTransaction({ transactionHash: burnRes.hash });
  console.log("Burn transaction confirmed! Tokens permanently removed from circulation.");
};

/**
 * Deflationary Token Example
 * 
 * This demonstrates how token burning creates a deflationary effect:
 * 1. Initial supply is minted
 * 2. Tokens are burned over time, reducing total supply
 * 3. With constant or increasing demand, each remaining token becomes more valuable
 */
const deflationaryExample = async () => {
  console.log("=".repeat(60));
  console.log("DEFLATIONARY TOKEN EXAMPLE");
  console.log("=".repeat(60));
  console.log(`Using module: ${MODULE_FULL_PATH}\n`);

  // Setup
  const config = new CedraConfig({ network: NETWORK });
  const cedra = new Cedra(config);

  // Using private key to create account is a security risk, this is only for educational purposes.
  // For production use, do not define your private key as this will expose to the public
  const privateKey = new Ed25519PrivateKey(ADMIN_PRIVATE_KEY);
  const admin = Account.fromPrivateKey({ privateKey });
  const user = Account.generate();
  
  console.log("Admin Address: ", admin.accountAddress.toString());
  console.log("User Address: ", user.accountAddress.toString());

  // Fund user account
  await fundAccount(cedra, user.accountAddress);
  
  try {
    // ============================================
    // PHASE 1: INITIAL MINTING
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 1: INITIAL MINTING");
    console.log("=".repeat(60));
    
    console.log(`\nMinting initial supply of ${INITIAL_MINT} tokens...`);
    const mintTxn = await cedra.transaction.build.simple({
      sender: admin.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::mint`,
        functionArguments: [user.accountAddress, INITIAL_MINT] 
      }
    });
    
    const mintRes = await cedra.signAndSubmitTransaction({ signer: admin, transaction: mintTxn });
    console.log("Mint transaction submitted: ", mintRes.hash);
    await cedra.waitForTransaction({ transactionHash: mintRes.hash });
    console.log("✓ Initial minting completed!");
    
    let currentBalance = await checkBalance(cedra, "User", user.accountAddress);
    let totalBurned = 0;
    let totalSupply = currentBalance;
    
    console.log(`\n📊 Initial State:`);
    console.log(`   Total Supply: ${totalSupply} tokens`);
    console.log(`   User Balance: ${currentBalance} tokens`);
    console.log(`   Total Burned: ${totalBurned} tokens`);

    // ============================================
    // PHASE 2: FIRST BURN (10% of supply)
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 2: FIRST BURN (10% of initial supply)");
    console.log("=".repeat(60));
    
    await burnTokens(cedra, user, BURN_AMOUNT_1);
    
    currentBalance = await checkBalance(cedra, "User", user.accountAddress);
    totalBurned += BURN_AMOUNT_1;
    totalSupply = currentBalance;
    
    console.log(`\n📊 After First Burn:`);
    console.log(`   Total Supply: ${totalSupply} tokens (reduced by ${BURN_AMOUNT_1})`);
    console.log(`   User Balance: ${currentBalance} tokens`);
    console.log(`   Total Burned: ${totalBurned} tokens`);
    console.log(`   Supply Reduction: ${((totalBurned / INITIAL_MINT) * 100).toFixed(1)}%`);

    // ============================================
    // PHASE 3: SECOND BURN (5% of remaining)
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 3: SECOND BURN (5% of remaining supply)");
    console.log("=".repeat(60));
    
    await burnTokens(cedra, user, BURN_AMOUNT_2);
    
    currentBalance = await checkBalance(cedra, "User", user.accountAddress);
    totalBurned += BURN_AMOUNT_2;
    totalSupply = currentBalance;
    
    console.log(`\n📊 After Second Burn:`);
    console.log(`   Total Supply: ${totalSupply} tokens (reduced by ${BURN_AMOUNT_2})`);
    console.log(`   User Balance: ${currentBalance} tokens`);
    console.log(`   Total Burned: ${totalBurned} tokens`);
    console.log(`   Supply Reduction: ${((totalBurned / INITIAL_MINT) * 100).toFixed(1)}%`);

    // ============================================
    // PHASE 4: THIRD BURN (2.5% of remaining)
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 4: THIRD BURN (2.5% of remaining supply)");
    console.log("=".repeat(60));
    
    await burnTokens(cedra, user, BURN_AMOUNT_3);
    
    currentBalance = await checkBalance(cedra, "User", user.accountAddress);
    totalBurned += BURN_AMOUNT_3;
    totalSupply = currentBalance;
    
    console.log(`\n📊 After Third Burn:`);
    console.log(`   Total Supply: ${totalSupply} tokens (reduced by ${BURN_AMOUNT_3})`);
    console.log(`   User Balance: ${currentBalance} tokens`);
    console.log(`   Total Burned: ${totalBurned} tokens`);
    console.log(`   Supply Reduction: ${((totalBurned / INITIAL_MINT) * 100).toFixed(1)}%`);

    // ============================================
    // FINAL SUMMARY: DEFLATIONARY EFFECT
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("DEFLATIONARY EFFECT SUMMARY");
    console.log("=".repeat(60));
    
    const deflationRate = ((totalBurned / INITIAL_MINT) * 100).toFixed(1);
    const remainingPercentage = ((totalSupply / INITIAL_MINT) * 100).toFixed(1);
    
    console.log(`\n📈 Token Economics:`);
    console.log(`   Initial Supply:     ${INITIAL_MINT.toLocaleString()} tokens`);
    console.log(`   Total Burned:       ${totalBurned.toLocaleString()} tokens`);
    console.log(`   Remaining Supply:   ${totalSupply.toLocaleString()} tokens`);
    console.log(`   Deflation Rate:     ${deflationRate}%`);
    console.log(`   Remaining:          ${remainingPercentage}% of original supply`);
    
    console.log(`\n💡 Deflationary Impact:`);
    console.log(`   • ${totalBurned.toLocaleString()} tokens permanently removed from circulation`);
    console.log(`   • Supply reduced by ${deflationRate}%`);
    console.log(`   • If demand stays constant, each remaining token is now ${(100 / parseFloat(remainingPercentage)).toFixed(2)}x more valuable`);
    console.log(`   • This creates natural deflationary pressure`);
    
    console.log(`\n🎯 Real-World Applications:`);
    console.log(`   • Transaction fee burns (reduce supply with each transaction)`);
    console.log(`   • Buy-back and burn programs (use revenue to reduce supply)`);
    console.log(`   • Proof of burn mechanisms (burn to prove commitment)`);
    console.log(`   • Supply control (adjust tokenomics over time)`);
    
    console.log("\n" + "=".repeat(60));
    console.log("Deflationary token example completed successfully!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("Error during deflationary example:", error);
    console.log("This could be because:");
    console.log("1. The module has different function signatures than expected");
    console.log("2. Network connectivity issues");
    console.log("3. Authorization issues with the private key");
    console.log("4. Insufficient balance for burning");
  }
};

deflationaryExample().catch(console.error);

