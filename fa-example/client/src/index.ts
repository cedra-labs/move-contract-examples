import { Account, AccountAddress, Aptos, AptosConfig, Network, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// Constants
const NETWORK = Network.DEVNET;
const MODULE_ADDRESS = "0x1163260c835b1396a3479790fc9a4d89ad742dfcdae45179c620a2705ed38a5a";
const MODULE_NAME = "AptosCoin";
const MODULE_FULL_PATH = `${MODULE_ADDRESS}::${MODULE_NAME}`;
const ADMIN_PRIVATE_KEY = "0xe443684d1810e095e2fe5286641cafb3da909342b86d2ae28ece8d4534631eb7";

// Token amounts
const ONE_APT_IN_OCTAS = 100_000_000; // 1 APT = 100 million octas
const TRANSFER_AMOUNT = 500;
const RETURN_AMOUNT = 250;

/**
 * Funds an account with 1 APT
 */
const fundAccount = async (aptos: Aptos, accountAddress: AccountAddress) => {
  console.log(`Funding account ${accountAddress.toString()} with 1 APT...`);
  await aptos.faucet.fundAccount({ accountAddress, amount: ONE_APT_IN_OCTAS });
  console.log(`Funding completed for ${accountAddress.toString()}`);
};

/**
 * Checks token balance for an account
 */
const checkBalance = async (aptos: Aptos, name: string, address: AccountAddress) => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::balance`,
        typeArguments: [],
        functionArguments: [address]
      }
    });
    
    const amount = Number(result[0]);
    console.log(`${name}'s CedraCoin balance is: ${amount}`);
    return amount;
  } catch (error) {
    console.error(`Error getting balance for ${name}:`, error);
    return 0;
  }
};

/**
 * Main demo flow
 */
const example = async () => {
  console.log("Starting CedraCoin demo");
  console.log(`Using module: ${MODULE_FULL_PATH}`);

  // Setup
  const config = new AptosConfig({ network: NETWORK });
  const aptos = new Aptos(config);

  // Create accounts
  const privateKey = new Ed25519PrivateKey(ADMIN_PRIVATE_KEY);
  const admin = Account.fromPrivateKey({ privateKey });
  const user = Account.generate();
  
  console.log("Admin Address: ", admin.accountAddress.toString());
  console.log("New User Address: ", user.accountAddress.toString());
  
  // Fund & check initial state
  await fundAccount(aptos, user.accountAddress);
  console.log("Checking initial CedraCoin balances...");
  await checkBalance(aptos, "Admin", admin.accountAddress);
  await checkBalance(aptos, "New User", user.accountAddress);

  try {
    // Step 1: Mint tokens
    console.log("\nMinting tokens to new user...");
    const mintTxn = await aptos.transaction.build.simple({
      sender: admin.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::mint`,
        functionArguments: [user.accountAddress, TRANSFER_AMOUNT] 
      }
    });
    
    console.log("Mint transaction built successfully, signing with admin account...");
    const mintRes = await aptos.signAndSubmitTransaction({ signer: admin, transaction: mintTxn });
    console.log("Mint transaction submitted: ", mintRes.hash);
    
    console.log("Waiting for mint transaction to be confirmed...");
    await aptos.waitForTransaction({ transactionHash: mintRes.hash });
    console.log("Mint transaction confirmed!");
    
    // Check state after mint
    console.log("\nChecking balances after mint...");
    await checkBalance(aptos, "Admin", admin.accountAddress);
    await checkBalance(aptos, "New User", user.accountAddress);
    
    // Step 2: Transfer tokens back
    console.log("\nTransferring tokens from user back to admin...");
    const transferTxn = await aptos.transaction.build.simple({
      sender: user.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::transfer`,
        functionArguments: [admin.accountAddress, RETURN_AMOUNT] 
      }
    });
    
    console.log("Transfer transaction built successfully, signing with user account...");
    const transferRes = await aptos.signAndSubmitTransaction({ signer: user, transaction: transferTxn });
    console.log("Transfer transaction submitted: ", transferRes.hash);
    
    console.log("Waiting for transfer transaction to be confirmed...");
    await aptos.waitForTransaction({ transactionHash: transferRes.hash });
    console.log("Transfer transaction confirmed!");
    
    // Check final state
    console.log("\nChecking final balances...");
    await checkBalance(aptos, "Admin", admin.accountAddress);
    await checkBalance(aptos, "New User", user.accountAddress);
    
    console.log("\nFull flow completed successfully!");
    
  } catch (error) {
    console.error("Error during operation:", error);
    console.log("This could be because:");
    console.log("1. The module has different function signatures than expected");
    console.log("2. Network connectivity issues");
    console.log("3. Authorization issues with the private key");
  }
};

example().catch(console.error);