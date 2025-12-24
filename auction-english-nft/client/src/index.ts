import { Account, AccountAddress, Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";

// Constants
const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // Replace with your deployed contract address
const MODULE_NAME = "EnglishAuction";
const MODULE_FULL_PATH = `${MODULE_ADDRESS}::${MODULE_NAME}`;

// NFT Module (optional - if set, will mint an NFT first)
// Using the same address as the auction contract since CedraCollectionV2 is deployed there
const NFT_MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // NFT contract address
const NFT_MODULE_NAME = "CedraCollectionV2";

// Cedra network configuration
const fullnode = "https://testnet.cedra.dev/v1";
const faucet = "https://faucet-api.cedra.dev";

// Token amounts
const ONE_CEDRA_IN_OCTAS = 100_000_000; // 1 CEDRA = 100 million octas

// Auction parameters (for demonstration - in real usage, these would come from user input)
const STARTING_PRICE = 1000;
const DURATION_SECONDS = 60; // 60 seconds for testing (1 hour = 3600)

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
      startingPrice,
      endTime,
      duration,
      highestBidder,
      highestBid,
      finalized,
      paymentAsset
    ] = result as [string, string, string, string, string, string, string, string, boolean, string];

    const info = {
      auctionId: parseInt(auctionId, 10),
      nftAddress,
      seller,
      startingPrice: parseInt(startingPrice, 10),
      endTime: parseInt(endTime, 10),
      duration: parseInt(duration, 10),
      highestBidder,
      highestBid: parseInt(highestBid, 10),
      finalized,
      paymentAsset
    };

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = info.endTime - now;
    const timeRemainingStr = timeRemaining > 0 
      ? `${timeRemaining} seconds (${(timeRemaining / 60).toFixed(1)} minutes)` 
      : "EXPIRED";

    console.log("\n📊 Auction Information:");
    console.log(`   Auction ID: ${info.auctionId}`);
    console.log(`   NFT Address: ${info.nftAddress}`);
    console.log(`   Seller: ${info.seller}`);
    console.log(`   Starting Price: ${info.startingPrice} octas`);
    console.log(`   Duration: ${info.duration} seconds (${(info.duration / 60).toFixed(1)} minutes)`);
    console.log(`   End Time: ${new Date(info.endTime * 1000).toISOString()}`);
    console.log(`   Time Remaining: ${timeRemainingStr}`);
    console.log(`   Highest Bidder: ${info.highestBidder}`);
    console.log(`   Highest Bid: ${info.highestBid} octas`);
    console.log(`   Finalized: ${info.finalized}`);
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
 * Get refund amount for a bidder
 */
const getRefundAmount = async (cedra: Cedra, auctionAddress: string, bidderAddress: string) => {
  try {
    const [amountStr] = await cedra.view<[string]>({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_refund_amount`,
        typeArguments: [],
        functionArguments: [auctionAddress, bidderAddress]
      }
    });
    const amount = parseInt(amountStr, 10);
    console.log(`Refund amount for ${bidderAddress}: ${amount} octas`);
    return amount;
  } catch (error) {
    console.error(`Error getting refund amount:`, error);
    return 0;
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
          "NFT for English auction demo",
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
  console.log("English Auction NFT Demo");
  console.log("=".repeat(60));
  console.log(`Using module: ${MODULE_FULL_PATH}`);
  console.log(`Network: ${NETWORK}`);
  console.log();

  // Check if module address is set
  if (MODULE_ADDRESS === "_") {
    console.error("❌ ERROR: MODULE_ADDRESS is not set!");
    console.log("\nPlease deploy the contract first:");
    console.log("  1. cd contract");
    console.log("  2. cedra move compile --named-addresses AuctionEnglishNFT=default");
    console.log("  3. cedra move publish --named-addresses AuctionEnglishNFT=default");
    console.log("  4. Update MODULE_ADDRESS in src/index.ts with the deployed address");
    return;
  }

  // Setup - SDK will use default URLs for the specified network
  const config = new CedraConfig({ network: NETWORK, fullnode, faucet });
  const cedra = new Cedra(config);

  // Generate accounts
  const seller = Account.generate();
  const bidder1 = Account.generate();
  const bidder2 = Account.generate();
  
  console.log("📝 Generated Accounts:");
  console.log(`   Seller: ${seller.accountAddress.toString()}`);
  console.log(`   Bidder 1: ${bidder1.accountAddress.toString()}`);
  console.log(`   Bidder 2: ${bidder2.accountAddress.toString()}`);
  console.log();
  
  // Fund accounts
  console.log("💰 Funding accounts...");
  await fundAccount(cedra, seller.accountAddress, "Seller");
  await fundAccount(cedra, bidder1.accountAddress, "Bidder 1");
  await fundAccount(cedra, bidder2.accountAddress, "Bidder 2");
  console.log();

  // Check initial balances
  console.log("Checking initial CEDRA balances...");
  const sellerInitialBalance = await checkBalance(cedra, "Seller", seller.accountAddress);
  const bidder1InitialBalance = await checkBalance(cedra, "Bidder 1", bidder1.accountAddress);
  const bidder2InitialBalance = await checkBalance(cedra, "Bidder 2", bidder2.accountAddress);
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
    console.log(`   Starting Price: ${STARTING_PRICE} octas`);
    console.log(`   Duration: ${DURATION_SECONDS} seconds (${(DURATION_SECONDS / 3600).toFixed(2)} hours)`);
    console.log();

    // Step 1: Create auction
    console.log("Step 1: Creating English auction...");
    console.log("Building create_auction transaction...");
    
    const createAuctionTxn = await cedra.transaction.build.simple({
      sender: seller.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_auction`,
        functionArguments: [
          nftAddress,
          STARTING_PRICE.toString(),
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

    // Extract auction object address from transaction
    let auctionAddress: string | null = null;
    
    try {
      const txDetails = await cedra.getTransactionByHash({ transactionHash: createAuctionRes.hash });
      
      if (txDetails.changes) {
        for (const change of txDetails.changes) {
          if (change.type === "write_resource" && change.data?.type?.includes("Auction")) {
            auctionAddress = change.address;
            console.log(`✓ Found auction object address: ${auctionAddress}`);
            break;
          }
        }
      }
    } catch (error) {
      console.log("⚠️  Could not extract auction address from transaction:", error);
    }

    if (!auctionAddress) {
      console.log("⚠️  NOTE: Could not automatically extract auction object address");
      console.log("   Check the transaction to find the auction object address");
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
      return;
    }

    // Step 3: Get auction information
    console.log("Step 3: Getting auction information...");
    await getAuctionInfo(cedra, auctionAddress);
    console.log();

    // Step 4: Place bids
    console.log("Step 4: Placing bids...");
    
    // Bidder 1 places first bid
    console.log("Bidder 1 placing bid of 1000 octas...");
    const bid1Txn = await cedra.transaction.build.simple({
      sender: bidder1.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::place_bid`,
        functionArguments: [auctionAddress, "1000"]
      }
    });
    const bid1Res = await cedra.signAndSubmitTransaction({ signer: bidder1, transaction: bid1Txn });
    console.log(`✓ Bid 1 transaction submitted: ${bid1Res.hash}`);
    await cedra.waitForTransaction({ transactionHash: bid1Res.hash });
    console.log("✓ Bid 1 confirmed!");
    console.log();

    // Get updated auction info
    await getAuctionInfo(cedra, auctionAddress);
    console.log();

    // Bidder 2 outbids
    console.log("Bidder 2 placing bid of 1500 octas (outbidding Bidder 1)...");
    const bid2Txn = await cedra.transaction.build.simple({
      sender: bidder2.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::place_bid`,
        functionArguments: [auctionAddress, "1500"]
      }
    });
    const bid2Res = await cedra.signAndSubmitTransaction({ signer: bidder2, transaction: bid2Txn });
    console.log(`✓ Bid 2 transaction submitted: ${bid2Res.hash}`);
    await cedra.waitForTransaction({ transactionHash: bid2Res.hash });
    console.log("✓ Bid 2 confirmed!");
    console.log();

    // Get updated auction info
    await getAuctionInfo(cedra, auctionAddress);
    console.log();

    // Check refund for bidder 1
    console.log("Checking refund amount for Bidder 1...");
    const refundAmount = await getRefundAmount(cedra, auctionAddress, bidder1.accountAddress.toString());
    if (refundAmount > 0) {
      console.log(`✓ Bidder 1 has refund of ${refundAmount} octas`);
    }
    console.log();

    // Step 5: Wait for auction to expire and finalize
    console.log("Step 5: Waiting for auction to expire...");
    const auctionInfo = await getAuctionInfo(cedra, auctionAddress);
    const endTime = auctionInfo.endTime;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = endTime - now;
    
    if (timeUntilExpiry > 0) {
      console.log(`Auction expires in ${timeUntilExpiry} seconds (${(timeUntilExpiry / 60).toFixed(1)} minutes)`);
      console.log(`Waiting ${timeUntilExpiry + 5} seconds for auction to expire...`);
      console.log(`(End time: ${new Date(endTime * 1000).toISOString()})`);
      
      // Wait for auction to expire plus a small buffer
      await new Promise(resolve => setTimeout(resolve, (timeUntilExpiry + 5) * 1000));
      console.log("✓ Wait completed");
    }
    
    const isExpired = await checkAuctionExpired(cedra, auctionAddress);
    console.log(`Auction expired: ${isExpired}`);
    console.log();

    if (isExpired) {
      console.log("Finalizing auction...");
      const finalizeTxn = await cedra.transaction.build.simple({
        sender: seller.accountAddress,
        data: { 
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::finalize_auction`,
          functionArguments: [auctionAddress]
        }
      });
      const finalizeRes = await cedra.signAndSubmitTransaction({ signer: seller, transaction: finalizeTxn });
      console.log(`✓ Finalize transaction submitted: ${finalizeRes.hash}`);
      await cedra.waitForTransaction({ transactionHash: finalizeRes.hash });
      console.log("✓ Auction finalized!");
      console.log();

      // Get final auction info
      await getAuctionInfo(cedra, auctionAddress);
      console.log();

      // Check balances after finalization
      console.log("Checking balances after finalization...");
      await checkBalance(cedra, "Seller", seller.accountAddress);
      await checkBalance(cedra, "Bidder 1", bidder1.accountAddress);
      await checkBalance(cedra, "Bidder 2", bidder2.accountAddress);
      console.log();

      // Claim refund for bidder 1
      if (refundAmount > 0) {
        console.log("Bidder 1 claiming refund...");
        const claimRefundTxn = await cedra.transaction.build.simple({
          sender: bidder1.accountAddress,
          data: { 
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::claim_refund`,
            functionArguments: [auctionAddress]
          }
        });
        const claimRefundRes = await cedra.signAndSubmitTransaction({ signer: bidder1, transaction: claimRefundTxn });
        console.log(`✓ Claim refund transaction submitted: ${claimRefundRes.hash}`);
        await cedra.waitForTransaction({ transactionHash: claimRefundRes.hash });
        console.log("✓ Refund claimed!");
        console.log();

        // Check balances after refund
        await checkBalance(cedra, "Bidder 1", bidder1.accountAddress);
        console.log();
      }
    } else {
      console.log("⚠️  Auction has not expired yet. Cannot finalize.");
      console.log("   In a production scenario, you would wait for the end_time");
      console.log();
    }

    console.log("=".repeat(60));
    console.log("Demo completed successfully!");
    console.log("=".repeat(60));
    console.log("Operations performed:");
    console.log("  ✓ Account generation and funding");
    console.log("  ✓ NFT minting (if NFT module configured)");
    console.log("  ✓ Auction creation");
    console.log("  ✓ Multiple bids placed");
    console.log("  ✓ Automatic refund tracking");
    if (isExpired) {
      console.log("  ✓ Auction finalization");
      console.log("  ✓ Refund claiming");
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

