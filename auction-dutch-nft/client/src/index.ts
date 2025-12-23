import { Account, AccountAddress, Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";

// Constants
const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // Replace with your deployed contract address
const MODULE_NAME = "DutchAuction";
const MODULE_FULL_PATH = `${MODULE_ADDRESS}::${MODULE_NAME}`;

// NFT Module (optional - if set, will mint an NFT first)
const NFT_MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // NFT contract address
const NFT_MODULE_NAME = "CedraCollectionV2";

// Cedra network configuration
const fullnode = "https://testnet.cedra.dev/v1";
const faucet = "https://faucet-api.cedra.dev";

// Token amounts
const ONE_CEDRA_IN_OCTAS = 100_000_000; // 1 CEDRA = 100 million octas

// Auction parameters (for demonstration - in real usage, these would come from user input)
const START_PRICE = 1000;
const END_PRICE = 100;
const DURATION_SECONDS = 3600; // 1 hour

// CEDRA metadata address
const CEDRA_METADATA = "0x000000000000000000000000000000000000000000000000000000000000000a";

/**
 * Funds an account with 1 CEDRA
 */
const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress, name: string) => {
  console.log(`Funding ${name} account ${accountAddress.toString()} with 1 CEDRA...`);
  await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
  console.log(`✓ Funding completed for ${name}`);
};

/**
 * Checks CEDRA balance for an account
 */
const checkBalance = async (cedra: Cedra, name: string, address: AccountAddress) => {
  try {
    const [balanceStr] = await cedra.view<[string]>({
      payload: {
        function: "0x1::primary_fungible_store::balance",
        typeArguments: ["0x1::fungible_asset::Metadata"],
        functionArguments: [address.toString(), CEDRA_METADATA]
      }
    });
    
    const amount = parseInt(balanceStr, 10);
    const cedraAmount = (amount / ONE_CEDRA_IN_OCTAS).toFixed(2);
    console.log(`${name}'s CEDRA balance is: ${cedraAmount} CEDRA (${amount} octas)`);
    return amount;
  } catch (error) {
    console.error(`Error getting balance for ${name}:`, error);
    return 0;
  }
};

/**
 * Check if auction exists
 */
const checkAuctionExists = async (cedra: Cedra, auctionAddress: string) => {
  try {
    const [exists] = await cedra.view<[boolean]>({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::auction_exists`,
        typeArguments: [],
        functionArguments: [auctionAddress]
      }
    });
    console.log(`Auction exists check: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`Error checking if auction exists:`, error);
    return false;
  }
};

/**
 * Get current price of an auction
 */
const getCurrentPrice = async (cedra: Cedra, auctionAddress: string) => {
  try {
    const [priceStr] = await cedra.view<[string]>({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_current_price`,
        typeArguments: [],
        functionArguments: [auctionAddress]
      }
    });
    const price = parseInt(priceStr, 10);
    console.log(`Current auction price: ${price} octas`);
    return price;
  } catch (error) {
    console.error(`Error getting current price:`, error);
    throw error;
  }
};

/**
 * Get auction information
 */
const getAuctionInfo = async (cedra: Cedra, auctionAddress: string) => {
  try {
    const result = await cedra.view({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_auction_info`,
        typeArguments: [],
        functionArguments: [auctionAddress]
      }
    });

    const [
      auctionId,
      nftAddress,
      seller,
      startPrice,
      endPrice,
      startTime,
      duration,
      sold,
      buyer,
      paymentAsset
    ] = result as [string, string, string, string, string, string, string, boolean, string, string];

    const info = {
      auctionId: parseInt(auctionId, 10),
      nftAddress,
      seller,
      startPrice: parseInt(startPrice, 10),
      endPrice: parseInt(endPrice, 10),
      startTime: parseInt(startTime, 10),
      duration: parseInt(duration, 10),
      sold,
      buyer,
      paymentAsset
    };

    console.log("\n📊 Auction Information:");
    console.log(`   Auction ID: ${info.auctionId}`);
    console.log(`   NFT Address: ${info.nftAddress}`);
    console.log(`   Seller: ${info.seller}`);
    console.log(`   Start Price: ${info.startPrice} octas`);
    console.log(`   End Price: ${info.endPrice} octas`);
    console.log(`   Duration: ${info.duration} seconds (${(info.duration / 3600).toFixed(2)} hours)`);
    console.log(`   Start Time: ${new Date(info.startTime * 1000).toISOString()}`);
    console.log(`   Sold: ${info.sold}`);
    if (info.sold) {
      console.log(`   Buyer: ${info.buyer}`);
    }
    console.log(`   Payment Asset: ${info.paymentAsset}`);

    return info;
  } catch (error) {
    console.error(`Error getting auction info:`, error);
    throw error;
  }
};

/**
 * Check if auction is expired
 */
const checkAuctionExpired = async (cedra: Cedra, auctionAddress: string) => {
  try {
    const [expired] = await cedra.view<[boolean]>({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::is_auction_expired`,
        typeArguments: [],
        functionArguments: [auctionAddress]
      }
    });
    console.log(`Auction expired check: ${expired}`);
    return expired;
  } catch (error) {
    console.error(`Error checking if auction expired:`, error);
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
 * Check if NFT collection exists
 */
const checkCollectionExists = async (cedra: Cedra, creatorAddress: string): Promise<boolean> => {
  try {
    const result = await cedra.view({
      payload: {
        function: `${NFT_MODULE_ADDRESS}::${NFT_MODULE_NAME}::collection_exists`,
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
 * Create NFT collection (if it doesn't exist)
 */
const createCollection = async (cedra: Cedra, signer: Account): Promise<boolean> => {
  try {
    const creatorAddress = signer.accountAddress.toString();
    const exists = await checkCollectionExists(cedra, creatorAddress);
    
    if (exists) {
      console.log("✓ NFT collection already exists");
      return true;
    }

    console.log("Creating NFT collection...");
    const createTxn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${NFT_MODULE_ADDRESS}::${NFT_MODULE_NAME}::create_collection`,
        functionArguments: []
      }
    });
    
    console.log("✓ Create collection transaction built successfully");
    console.log("Signing transaction...");
    const createRes = await cedra.signAndSubmitTransaction({ signer, transaction: createTxn });
    console.log(`✓ Create collection transaction submitted: ${createRes.hash}`);
    
    console.log("Waiting for transaction to be confirmed...");
    await cedra.waitForTransaction({ transactionHash: createRes.hash });
    console.log("✓ Create collection transaction confirmed!");
    
    return true;
  } catch (error) {
    console.error(`✗ Failed to create collection:`, error);
    return false;
  }
};

/**
 * Mint an NFT (if NFT module is configured)
 */
const mintNFT = async (cedra: Cedra, signer: Account, to: AccountAddress): Promise<string | null> => {
  if (NFT_MODULE_ADDRESS === "_") {
    console.log("⚠️  NFT_MODULE_ADDRESS not set, skipping NFT minting");
    return null;
  }

  try {
    // First ensure collection exists
    const collectionCreated = await createCollection(cedra, signer);
    if (!collectionCreated) {
      console.log("⚠️  Could not create collection, skipping NFT minting");
      return null;
    }

    const sessionId = Date.now();
    const nftName = `Auction NFT #${sessionId}`;
    console.log(`Minting NFT "${nftName}"...`);
    
    const mintTxn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${NFT_MODULE_ADDRESS}::${NFT_MODULE_NAME}::mint_nft`,
        functionArguments: [
          to,
          nftName,
          "NFT for Dutch auction demo",
          "https://metadata.cedra.dev/auction-nft.json"
        ]
      }
    });
    
    console.log("✓ Mint NFT transaction built successfully");
    console.log("Signing transaction...");
    const mintRes = await cedra.signAndSubmitTransaction({ signer, transaction: mintTxn });
    console.log(`✓ Mint NFT transaction submitted: ${mintRes.hash}`);
    
    console.log("Waiting for transaction to be confirmed...");
    await cedra.waitForTransaction({ transactionHash: mintRes.hash });
    console.log("✓ Mint NFT transaction confirmed!");
    
    // Wait for indexer to update
    console.log("Waiting for indexer to update...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return mintRes.hash;
  } catch (error) {
    console.error(`✗ Failed to mint NFT:`, error);
    if (error instanceof Error && error.message.includes("EOBJECT_DOES_NOT_EXIST")) {
      console.log("   This usually means the NFT collection doesn't exist");
      console.log("   Make sure the NFT contract is deployed and collection is created");
    }
    return null;
  }
};

/**
 * Get NFT object address from account's owned tokens
 */
const getNFTAddress = async (cedra: Cedra, owner: AccountAddress): Promise<string | null> => {
  try {
    const tokens = await getNFTsOwned(cedra, owner);
    if (tokens.length === 0) {
      console.log("No NFTs found for this account");
      return null;
    }
    
    // Get the first NFT's object address
    const nftAddress = tokens[0].token_data_id;
    const nftName = tokens[0].current_token_data?.token_name || 'Unknown';
    console.log(`Found NFT: "${nftName}" at address: ${nftAddress}`);
    return nftAddress;
  } catch (error) {
    console.error("Error getting NFT address:", error);
    return null;
  }
};

/**
 * Main demo flow
 */
const example = async () => {
  console.log("=".repeat(60));
  console.log("Dutch Auction NFT Demo");
  console.log("=".repeat(60));
  console.log(`Using module: ${MODULE_FULL_PATH}`);
  console.log(`Network: ${NETWORK}`);
  console.log();

  // Check if module address is set
  if (MODULE_ADDRESS === "_") {
    console.error("❌ ERROR: MODULE_ADDRESS is not set!");
    console.log("\nPlease deploy the contract first:");
    console.log("  1. cd contract");
    console.log("  2. cedra move compile --named-addresses AuctionDutchNFT=default");
    console.log("  3. cedra move publish --named-addresses AuctionDutchNFT=default");
    console.log("  4. Update MODULE_ADDRESS in src/index.ts with the deployed address");
    return;
  }

  // Setup - SDK will use default URLs for the specified network
  const config = new CedraConfig({ network: NETWORK, fullnode, faucet });
  const cedra = new Cedra(config);

  // Generate accounts
  const seller = Account.generate();
  const buyer = Account.generate();
  
  console.log("📝 Generated Accounts:");
  console.log(`   Seller: ${seller.accountAddress.toString()}`);
  console.log(`   Buyer: ${buyer.accountAddress.toString()}`);
  console.log();
  
  // Fund accounts
  console.log("💰 Funding accounts...");
  await fundAccount(cedra, seller.accountAddress, "Seller");
  await fundAccount(cedra, buyer.accountAddress, "Buyer");
  console.log();

  // Check initial balances
  console.log("Checking initial CEDRA balances...");
  const sellerInitialBalance = await checkBalance(cedra, "Seller", seller.accountAddress);
  const buyerInitialBalance = await checkBalance(cedra, "Buyer", buyer.accountAddress);
  console.log();

  try {
    // Step 0: Mint an NFT first (if NFT module is configured)
    let nftAddress: string | null = null;
    
    if (NFT_MODULE_ADDRESS !== "_") {
      console.log("Step 0: Minting NFT for auction...");
      const mintHash = await mintNFT(cedra, seller, seller.accountAddress);
      
      if (mintHash) {
        // Get the NFT address from seller's owned tokens
        console.log("Getting NFT object address...");
        nftAddress = await getNFTAddress(cedra, seller.accountAddress);
        
        if (!nftAddress) {
          console.log("⚠️  Could not find NFT address. Waiting longer for indexer...");
          await new Promise(resolve => setTimeout(resolve, 5000));
          nftAddress = await getNFTAddress(cedra, seller.accountAddress);
        }
      }
    } else {
      console.log("⚠️  NFT_MODULE_ADDRESS not set. Trying to use existing NFT...");
      // Try to get existing NFT from seller
      nftAddress = await getNFTAddress(cedra, seller.accountAddress);
    }

    if (!nftAddress) {
      console.error("❌ ERROR: No NFT found or could not mint NFT!");
      console.log("\nTo fix this:");
      console.log("  1. Set NFT_MODULE_ADDRESS to your deployed NFT contract address");
      console.log("  2. Or ensure the seller account already owns an NFT");
      console.log("  3. The NFT object address is required to create an auction");
      return;
    }

    console.log(`✓ Using NFT at address: ${nftAddress}`);
    console.log();
    
    console.log("📋 Auction Parameters:");
    console.log(`   NFT Address: ${nftAddress}`);
    console.log(`   Start Price: ${START_PRICE} octas`);
    console.log(`   End Price: ${END_PRICE} octas`);
    console.log(`   Duration: ${DURATION_SECONDS} seconds (${(DURATION_SECONDS / 3600).toFixed(2)} hours)`);
    console.log();

    // Step 1: Create auction
    console.log("Step 1: Creating Dutch auction...");
    console.log("Building create_auction transaction...");
    
    const createAuctionTxn = await cedra.transaction.build.simple({
      sender: seller.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_auction`,
        functionArguments: [
          nftAddress,  // Real NFT object address
          START_PRICE.toString(),
          END_PRICE.toString(),
          DURATION_SECONDS.toString(),
          CEDRA_METADATA
        ] 
      }
    });
    
    console.log("✓ Create auction transaction built successfully");
    console.log("Signing transaction with seller account...");
    const createAuctionRes = await cedra.signAndSubmitTransaction({ 
      signer: seller, 
      transaction: createAuctionTxn 
    });
    console.log(`✓ Create auction transaction submitted: ${createAuctionRes.hash}`);
    
    console.log("Waiting for transaction to be confirmed...");
    const createAuctionTxResult = await cedra.waitForTransaction({ transactionHash: createAuctionRes.hash });
    console.log("✓ Create auction transaction confirmed!");
    console.log();

    // Extract auction object address from transaction events
    // The auction object is created in the transaction, we need to find its address
    let auctionAddress: string | null = null;
    
    try {
      // Get the transaction details to find the auction object address
      const txDetails = await cedra.getTransactionByHash({ transactionHash: createAuctionRes.hash });
      
      // Look for object creation events or changes
      if (txDetails.changes) {
        for (const change of txDetails.changes) {
          // Look for object creation
          if (change.type === "write_resource" && change.data?.type?.includes("Auction")) {
            auctionAddress = change.address;
            console.log(`✓ Found auction object address: ${auctionAddress}`);
            break;
          }
        }
      }
      
      // Alternative: Check events for auction creation
      if (!auctionAddress && txDetails.events) {
        // The auction object address might be in events
        // For now, we'll need to parse the transaction response
        console.log("⚠️  Could not extract auction address from transaction");
        console.log("   You may need to check the transaction events manually");
      }
    } catch (error) {
      console.log("⚠️  Could not extract auction address from transaction:", error);
    }

    if (!auctionAddress) {
      console.log("⚠️  NOTE: Could not automatically extract auction object address");
      console.log("   In production, you would:");
      console.log("   1. Parse transaction events to find the auction object address");
      console.log("   2. Or store the auction address when creating the auction");
      console.log("   For now, the demo will show the structure but may not find the auction");
      console.log();
      
      // Try to continue with a note that we need the auction address
      console.log("⚠️  Skipping auction operations - auction address required");
      console.log("   Transaction hash:", createAuctionRes.hash);
      console.log("   Check this transaction to find the auction object address");
      return;
    }
    
    console.log(`✓ Using auction address: ${auctionAddress}`);
    console.log();

    // Step 2: Check if auction exists
    console.log("Step 2: Checking if auction exists...");
    const auctionExists = await checkAuctionExists(cedra, auctionAddress);
    console.log();

    if (!auctionExists) {
      console.log("⚠️  Auction does not exist at the extracted address");
      console.log("   This might be due to:");
      console.log("   1. Transaction not fully processed yet");
      console.log("   2. Auction address extraction failed");
      console.log("   3. Network/indexer delay");
      console.log();
      return;
    }

    // Step 3: Get auction information
    console.log("Step 3: Getting auction information...");
    await getAuctionInfo(cedra, auctionAddress);
    console.log();

    // Step 4: Get current price
    console.log("Step 4: Getting current auction price...");
    const currentPrice = await getCurrentPrice(cedra, auctionAddress);
    console.log();

    // Step 5: Check if expired
    console.log("Step 5: Checking if auction is expired...");
    const isExpired = await checkAuctionExpired(cedra, auctionAddress);
    console.log();

    // Step 6: Buy NFT (if not expired and buyer has enough balance)
    if (!isExpired && buyerInitialBalance >= currentPrice) {
      console.log("Step 6: Buying NFT at current price...");
      console.log(`Current price: ${currentPrice} octas`);
      console.log(`Buyer balance: ${buyerInitialBalance} octas`);
      console.log("Building buy_now transaction...");
      
      const buyNowTxn = await cedra.transaction.build.simple({
        sender: buyer.accountAddress,
        data: { 
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::buy_now`,
          functionArguments: [auctionAddress]
        }
      });
      
      console.log("✓ Buy now transaction built successfully");
      console.log("Signing transaction with buyer account...");
      const buyNowRes = await cedra.signAndSubmitTransaction({ 
        signer: buyer, 
        transaction: buyNowTxn 
      });
      console.log(`✓ Buy now transaction submitted: ${buyNowRes.hash}`);
      
      console.log("Waiting for transaction to be confirmed...");
      await cedra.waitForTransaction({ transactionHash: buyNowRes.hash });
      console.log("✓ Buy now transaction confirmed!");
      console.log();

      // Check balances after purchase
      console.log("Checking balances after purchase...");
      await checkBalance(cedra, "Seller", seller.accountAddress);
      await checkBalance(cedra, "Buyer", buyer.accountAddress);
      console.log();

      // Get updated auction info
      console.log("Getting updated auction information...");
      await getAuctionInfo(cedra, auctionAddress);
      console.log();

      // Verify NFT ownership changed
      console.log("Verifying NFT ownership...");
      const sellerNFTsAfter = await getNFTsOwned(cedra, seller.accountAddress);
      const buyerNFTsAfter = await getNFTsOwned(cedra, buyer.accountAddress);
      console.log(`Seller NFTs after purchase: ${sellerNFTsAfter.length}`);
      console.log(`Buyer NFTs after purchase: ${buyerNFTsAfter.length}`);
      console.log();
    } else {
      console.log("⚠️  Skipping purchase:");
      if (isExpired) {
        console.log("   - Auction has expired");
      }
      if (buyerInitialBalance < currentPrice) {
        console.log(`   - Buyer has insufficient balance (needs ${currentPrice}, has ${buyerInitialBalance})`);
      }
      console.log();
      
      // Alternative: Cancel auction (seller only)
      console.log("Alternative: Cancelling auction (seller only)...");
      console.log("Building cancel_auction transaction...");
      
      const cancelAuctionTxn = await cedra.transaction.build.simple({
        sender: seller.accountAddress,
        data: { 
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::cancel_auction`,
          functionArguments: [auctionAddress]
        }
      });
      
      console.log("✓ Cancel auction transaction built successfully");
      console.log("Signing transaction with seller account...");
      const cancelRes = await cedra.signAndSubmitTransaction({ 
        signer: seller, 
        transaction: cancelAuctionTxn 
      });
      console.log(`✓ Cancel auction transaction submitted: ${cancelRes.hash}`);
      
      console.log("Waiting for transaction to be confirmed...");
      await cedra.waitForTransaction({ transactionHash: cancelRes.hash });
      console.log("✓ Cancel auction transaction confirmed!");
      console.log();

      // Verify NFT returned to seller
      console.log("Verifying NFT returned to seller...");
      const sellerNFTsAfterCancel = await getNFTsOwned(cedra, seller.accountAddress);
      console.log(`Seller NFTs after cancel: ${sellerNFTsAfterCancel.length}`);
      console.log();
    }

    console.log("=".repeat(60));
    console.log("Demo completed successfully!");
    console.log("=".repeat(60));
    console.log("Operations performed:");
    console.log("  ✓ Account generation and funding");
    console.log("  ✓ NFT minting (if NFT module configured)");
    console.log("  ✓ NFT address retrieval");
    console.log("  ✓ Auction creation");
    console.log("  ✓ Auction existence check");
    console.log("  ✓ Auction info retrieval");
    console.log("  ✓ Current price calculation");
    console.log("  ✓ Expiration check");
    if (!isExpired && buyerInitialBalance >= currentPrice) {
      console.log("  ✓ NFT purchase (buy_now)");
      console.log("  ✓ Balance verification after purchase");
      console.log("  ✓ NFT ownership verification");
    } else {
      console.log("  ✓ Auction cancellation");
      console.log("  ✓ NFT ownership verification after cancel");
    }
    console.log();
    console.log("💡 All operations logged with detailed responses!");
    
  } catch (error) {
    console.error("\n❌ Error during operation:", error);
    console.log("\nThis could be because:");
    console.log("  1. The module address is not set or incorrect");
    console.log("  2. The module has different function signatures than expected");
    console.log("  3. Network connectivity issues");
    console.log("  4. The NFT address or auction address doesn't exist");
    console.log("  5. Insufficient balance for operations");
    if (error instanceof Error) {
      console.log(`\nError details: ${error.message}`);
    }
  }
};

example().catch(console.error);
