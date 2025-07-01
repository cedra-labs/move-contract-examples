import { 
  Account, 
  AccountAddress, 
  Cedra, 
  CedraConfig, 
  Network, 
  Ed25519PrivateKey, 
  PrivateKey, 
  PrivateKeyVariants 
} from "@cedra-labs/ts-sdk";

// Constants for V2 contract
const MODULE_ADDRESS = "0xb96e3ce0f856099bce9840e66f4cb8187e399c8f8644eb00de47f0a7c50b3d68"; // Deployed contract address
const NETWORK = Network.DEVNET;
const FULLNODE_URL = "https://testnet.cedra.dev/v1";
const FAUCET_URL = "https://faucet-api.cedra.dev";
const MODULE_NAME = "CedraCollectionV2";
const ONE_CEDRA_IN_OCTAS = 100_000_000;

// ⚠️ SECURITY WARNING: This is for educational purposes only!
// NEVER hardcode or reveal private keys in production code or commit them to version control.
// In production, use environment variables, secure key management systems, or hardware wallets.
const DEPLOYER_PRIVATE_KEY_RAW = "0x48c47d76d52bf83614b08b4030a18274a8a3334e1f3bd5f792e2b60571df8e6a"; // Deployer account private key (LEARNING PURPOSE ONLY)

// Format private key for AIP-80 compliance (educational demonstration)
const DEPLOYER_PRIVATE_KEY = PrivateKey.formatPrivateKey(DEPLOYER_PRIVATE_KEY_RAW, PrivateKeyVariants.Ed25519);

// Generate unique session ID for this run
const SESSION_ID: number = Date.now();
/**
 * Funds an account with 1 CEDRA
 */
const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress, name: string): Promise<void> => {
  try {
    console.log(`Funding ${name}`);
    await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
    console.log(`✓ ${name} funded successfully`);
  } catch (error) {
    console.error(`✗ Failed to fund ${name}:`, error);
    throw error;
  }
};

/**
 * Check if collection exists
 */
const checkCollectionExists = async (cedra: Cedra, creatorAddress: string): Promise<boolean> => {
  try {
    const result = await cedra.view({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::collection_exists`,
        typeArguments: [],
        functionArguments: [creatorAddress]
      }
    });
    
    return result[0] as boolean;
  } catch (error) {
    console.error('Failed to check collection existence:', error);
    return false;
  }
};

/**
 * Get NFTs owned by an account
 */
const getNFTsOwned = async (cedra: Cedra, address: AccountAddress): Promise<any[]> => {
  try {
    const tokens = await cedra.getAccountOwnedTokens({
      accountAddress: address,
      options: {
        tokenStandard: "v2"
      }
    });

    return tokens;
  } catch (error) {
    console.error('Failed to get owned NFTs:', error);
    return [];
  }
};

/**
 * Mint an NFT to a specific address
 */
const mintNFT = async (
  cedra: Cedra, 
  signer: Account, 
  to: AccountAddress, 
  name: string, 
  description: string, 
  uri: string
): Promise<string> => {
  try {
    console.log(`Minting "${name}"`);
    
    const mintTxn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::mint_nft`,
        functionArguments: [to, name, description, uri]
      }
    });
    
    const mintRes = await cedra.signAndSubmitTransaction({ signer, transaction: mintTxn });
    await cedra.waitForTransaction({ transactionHash: mintRes.hash });
    console.log(`✓ "${name}" minted`);
    
    return mintRes.hash;
  } catch (error) {
    console.error(`✗ Failed to mint "${name}":`, error);
    throw error;
  }
};

/**
 * Transfer an NFT from one account to another
 */
const transferNFT = async (
  cedra: Cedra, 
  signer: Account, 
  objectAddress: string,
  to: AccountAddress,
  tokenName: string
): Promise<string> => {
  try {
    console.log(`Transferring "${tokenName}"`);
    
    const transferTxn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::transfer_nft`,
        functionArguments: [objectAddress, to]
      }
    });
    
    const transferRes = await cedra.signAndSubmitTransaction({ signer, transaction: transferTxn });
    await cedra.waitForTransaction({ transactionHash: transferRes.hash });
    console.log(`✓ "${tokenName}" transferred`);
    
    return transferRes.hash;
  } catch (error) {
    console.error(`✗ Failed to transfer "${tokenName}":`, error);
    throw error;
  }
};

/**
 * Main NFT demo
 */
const demo = async (): Promise<void> => {
  try {
    console.log("Cedra NFT Demo\n");

    const config = new CedraConfig({ 
      network: NETWORK,
      fullnode: FULLNODE_URL,
      faucet: FAUCET_URL
    });

    const cedra = new Cedra(config);

    // ⚠️ EDUCATIONAL ONLY: Creating account from private key for demo purposes
    // In production, NEVER expose private keys like this - use secure key management!
    const deployerPrivateKey = new Ed25519PrivateKey(DEPLOYER_PRIVATE_KEY);
    const deployer = Account.fromPrivateKey({ privateKey: deployerPrivateKey });
    
    const user1 = deployer;
    const user2 = Account.generate();
    
    console.log(`Using deployer account: ${deployer.accountAddress.toString()}`);
    console.log(`User2 address: ${user2.accountAddress.toString()}`);
    
    // Fund user2 account to enable transfers
    await fundAccount(cedra, user2.accountAddress, "User2");
    

    // Verify collection exists
    const collectionExists = await checkCollectionExists(cedra, deployer.accountAddress.toString());
    console.log(`Collection exists: ${collectionExists}`);

    // Mint 3 NFTs to the deployer account with unique names
    const nftName1 = `Cedra Genesis #1 [${SESSION_ID}]`;
    await mintNFT(
      cedra,
      deployer,
      user1.accountAddress,
      nftName1,
      "First NFT in the collection",
      "https://metadata.cedra.dev/v2/genesis-1.json"
    );

    const nftName2 = `Cedra Genesis #2 [${SESSION_ID}]`;
    await mintNFT(
      cedra,
      deployer,
      user1.accountAddress,
      nftName2,
      "Second NFT in the collection", 
      "https://metadata.cedra.dev/v2/genesis-2.json"
    );

    const nftName3 = `Cedra Special Edition [${SESSION_ID}]`;
    await mintNFT(
      cedra,
      deployer,
      user1.accountAddress,
      nftName3,
      "Special edition NFT",
      "https://metadata.cedra.dev/v2/special-edition.json"
    );
    
    // Wait for indexer to update
    console.log("Waiting for indexer to update...");
    await new Promise(resolve => setTimeout(resolve, 3000));
  
    // Check initial balances
    console.log("\n=== Initial NFT Balances ===");
    const user1Tokens = await getNFTsOwned(cedra, user1.accountAddress);
    const user2Tokens = await getNFTsOwned(cedra, user2.accountAddress);
    
    console.log(`User1 (Deployer) has ${user1Tokens.length} NFTs`);
    console.log(`User2 has ${user2Tokens.length} NFTs`);
    
    // Show NFT details for user1
    if (user1Tokens.length > 0) {
      console.log("User1 NFTs:");
      user1Tokens.forEach((token, index) => {
        console.log(`  ${index + 1}. ${token.current_token_data?.token_name || 'Unknown'} (${token.token_data_id})`);
      });
      
      // Transfer the first NFT to user2
      console.log("\n=== Transferring NFT ===");
      const firstNFT = user1Tokens[0];
      const objectAddress = firstNFT.token_data_id;
      const tokenName = firstNFT.current_token_data?.token_name || 'Unknown NFT';
      
      await transferNFT(
        cedra,
        user1, // deployer account is the sender
        objectAddress,
        user2.accountAddress,
        tokenName
      );
      
      // Wait for transaction to be processed
      console.log("Waiting for transfer to be processed...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check final balances
      console.log("\n=== Final NFT Balances ===");
      const user1TokensAfter = await getNFTsOwned(cedra, user1.accountAddress);
      const user2TokensAfter = await getNFTsOwned(cedra, user2.accountAddress);
      
      console.log(`User1 (Deployer) has ${user1TokensAfter.length} NFTs`);
      console.log(`User2 has ${user2TokensAfter.length} NFTs`);
      
      if (user2TokensAfter.length > 0) {
        console.log("User2 NFTs:");
        user2TokensAfter.forEach((token, index) => {
          console.log(`  ${index + 1}. ${token.current_token_data?.token_name || 'Unknown'}`);
        });
      }
    } else {
      console.log("No NFTs found. This might be due to indexer delay.");
    }
  
    console.log("✓ Demo completed successfully");
  } catch (error) {
    console.error("✗ Demo failed:", error);
    process.exit(1);
  }
};

// Run the demo
demo().catch((error: Error) => {
  console.error('Demo failed:', error);
  process.exit(1);
}); 