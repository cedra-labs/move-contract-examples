import { Account, AccountAddress, Aptos, AptosConfig, Network, Ed25519PrivateKey, PrivateKey, PrivateKeyVariants } from "@aptos-labs/ts-sdk";

// Constants for V2 contract
const NETWORK = Network.DEVNET;
const MODULE_ADDRESS = "_"; // Replace with your deployed contract address
const MODULE_NAME = "CedraCollectionV2";

// ⚠️ SECURITY WARNING: This is for educational purposes only!
// NEVER hardcode or reveal private keys in production code or commit them to version control.
// In production, use environment variables, secure key management systems, or hardware wallets.
const DEPLOYER_PRIVATE_KEY_RAW = "_"; // Replace with your private key (LEARNING PURPOSE ONLY - NEVER REVEAL IN PRODUCTION)

// Format private key for AIP-80 compliance (educational demonstration)
const DEPLOYER_PRIVATE_KEY = PrivateKey.formatPrivateKey(DEPLOYER_PRIVATE_KEY_RAW, PrivateKeyVariants.Ed25519);

const ONE_APT_IN_OCTAS = 100_000_000;

// Generate unique session ID for this run
const SESSION_ID = Date.now();

/**
 * Funds an account with 1 APT
 */
const fundAccount = async (aptos: Aptos, accountAddress: AccountAddress, name: string) => {
  console.log(`Funding ${name}`);
  await aptos.faucet.fundAccount({ accountAddress, amount: ONE_APT_IN_OCTAS });
};

/**
 * Check if collection exists
 */
const checkCollectionExists = async (aptos: Aptos, creatorAddress: string) => {
  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::collection_exists`,
      typeArguments: [],
      functionArguments: [creatorAddress]
    }
  });
  
  return result[0] as boolean;
};

/**
 * Get NFTs owned by an account
 */
const getNFTsOwned = async (aptos: Aptos, address: AccountAddress) => {
  const tokens = await aptos.getAccountOwnedTokens({
    accountAddress: address,
    options: {
      tokenStandard: "v2"
    }
  });

  return tokens;
};

/**
 * Mint an NFT to a specific address
 */
const mintNFT = async (
  aptos: Aptos, 
  signer: Account, 
  to: AccountAddress, 
  name: string, 
  description: string, 
  uri: string
) => {
  console.log(`Minting "${name}"`);
  
  const mintTxn = await aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::mint_nft`,
      functionArguments: [to, name, description, uri]
    }
  });
  
  const mintRes = await aptos.signAndSubmitTransaction({ signer, transaction: mintTxn });
  await aptos.waitForTransaction({ transactionHash: mintRes.hash });
  console.log(`✓ "${name}" minted`);
  
  return mintRes.hash;
};

/**
 * Transfer an NFT from one account to another
 */
const transferNFT = async (
  aptos: Aptos, 
  signer: Account, 
  objectAddress: string,
  to: AccountAddress,
  tokenName: string
) => {
  console.log(`Transferring "${tokenName}"`);
  
  const transferTxn = await aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::transfer_nft`,
      functionArguments: [objectAddress, to]
    }
  });
  
  const transferRes = await aptos.signAndSubmitTransaction({ signer, transaction: transferTxn });
  await aptos.waitForTransaction({ transactionHash: transferRes.hash });
  console.log(`✓ "${tokenName}" transferred`);
  
  return transferRes.hash;
};

/**
 * Main NFT demo
 */
const demo = async () => {
  console.log("Cedra NFT Demo\n");

  // Setup
  const config = new AptosConfig({ network: NETWORK });
  const aptos = new Aptos(config);

  // ⚠️ EDUCATIONAL ONLY: Creating account from private key for demo purposes
  // In production, NEVER expose private keys like this - use secure key management!
  const deployerPrivateKey = new Ed25519PrivateKey(DEPLOYER_PRIVATE_KEY);
  const deployer = Account.fromPrivateKey({ privateKey: deployerPrivateKey });
  const user1 = Account.generate();
  const user2 = Account.generate();
  
  // Fund accounts
  await fundAccount(aptos, user1.accountAddress, "User1");
  await fundAccount(aptos, user2.accountAddress, "User2");

  // Verify collection exists
  const collectionExists = await checkCollectionExists(aptos, deployer.accountAddress.toString());
  console.log(`Collection exists: ${collectionExists}`);

  // Mint 3 NFTs with unique names
  await mintNFT(
    aptos,
    deployer,
    user1.accountAddress,
    `Cedra Genesis #1 [${SESSION_ID}]`,
    "First NFT in the collection",
    "https://metadata.cedra.dev/v2/genesis-1.json"
  );

  await mintNFT(
    aptos,
    deployer,
    user2.accountAddress,
    `Cedra Genesis #2 [${SESSION_ID}]`,
    "Second NFT in the collection", 
    "https://metadata.cedra.dev/v2/genesis-2.json"
  );

  await mintNFT(
    aptos,
    deployer,
    user1.accountAddress,
    `Cedra Special Edition [${SESSION_ID}]`,
    "Special edition NFT",
    "https://metadata.cedra.dev/v2/special-edition.json"
  );
  
  // Wait for indexer to update
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check balances
  const user1Tokens = await getNFTsOwned(aptos, user1.accountAddress);
  const user2Tokens = await getNFTsOwned(aptos, user2.accountAddress);
  console.log(`User1 has ${user1Tokens.length} NFTs, User2 has ${user2Tokens.length} NFTs`);

  // Transfer NFT from User1 to User2
  if (user1Tokens.length > 0) {
    const tokenToTransfer = user1Tokens[0];
    const tokenName = tokenToTransfer.current_token_data?.token_name || 'Unknown';
    
    await transferNFT(
      aptos, 
      user1, 
      tokenToTransfer.token_data_id, 
      user2.accountAddress,
      tokenName
    );
    
    // Wait for indexer
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Final balances
  const finalUser1Tokens = await getNFTsOwned(aptos, user1.accountAddress);
  const finalUser2Tokens = await getNFTsOwned(aptos, user2.accountAddress);
  console.log(`Final: User1 has ${finalUser1Tokens.length} NFTs, User2 has ${finalUser2Tokens.length} NFTs`);
  console.log("✓ Demo completed successfully");
};

demo().catch(console.error); 