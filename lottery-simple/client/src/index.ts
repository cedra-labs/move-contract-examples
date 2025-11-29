/**
 * Cedra Simple Lottery Client SDK
 * 
 * This module provides a complete client SDK for interacting with the Cedra Simple Lottery smart contract.
 * Includes functions for lottery initialization, ticket purchasing, winner selection, and state management.
 * 
 * @version 1.0.0
 */

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

// Contract configuration constants
const MODULE_ADDRESS = "_";
const NETWORK = Network.TESTNET;
/** Cedra devnet fullnode URL for blockchain interaction */
const FULLNODE_URL = "https://fullnode.devnet.cedra.dev/v1";
/** Cedra devnet faucet URL for funding accounts */
const FAUCET_URL = "https://faucet.devnet.cedra.dev";
const MODULE_NAME = "simple_lotto";
const ONE_CEDRA_IN_OCTAS = 100_000_000;
/** Ticket price as defined in the Move contract */
const TICKET_PRICE = 100;

/** 
 * ⚠️ SECURITY WARNING: This private key is for educational purposes only!
 * Never expose private keys in production applications
 */
const DEPLOYER_PRIVATE_KEY_RAW = "_"; // <--- FILL IN YOUR PRIVATE KEY HERE

/** Format private key for AIP-80 compliance */
const DEPLOYER_PRIVATE_KEY = PrivateKey.formatPrivateKey(DEPLOYER_PRIVATE_KEY_RAW, PrivateKeyVariants.Ed25519);

/**
 * Funds an account with CEDRA tokens from the faucet
 * 
 * @param cedra - The Cedra client instance
 * @param accountAddress - Address of the account to fund
 * @param name - Display name for logging purposes
 * @throws {Error} When funding fails
 */
const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress, name: string): Promise<void> => {
  try {
    console.log(`Funding ${name}...`);
    await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
    console.log(`✓ ${name} funded successfully`);
  } catch (error) {
    console.error(`✗ Failed to fund ${name}:`, error);
    throw error;
  }
};

/**
 * Get the current lottery resource state from the blockchain
 * 
 * Retrieves the Lottery resource containing current pot value,
 * player list, and round information.
 * 
 * @param cedra - The Cedra client instance
 * @param lotteryOwner - Address of the lottery owner/admin
 * @returns {Promise<any>} The lottery resource data or null if not initialized
 */
const getLotteryState = async (cedra: Cedra, lotteryOwner: string): Promise<any> => {
  try {
    const resource = await cedra.getAccountResource({
      accountAddress: lotteryOwner,
      resourceType: `${MODULE_ADDRESS}::${MODULE_NAME}::Lottery`
    });
    
    return resource;
  } catch (error) {
    // If lottery not initialized, resource won't be found
    return null;
  }
};

/**
 * Initialize a new lottery (Admin only)
 * 
 * Creates a new lottery instance with the specified ticket price.
 * Only the lottery admin can call this function.
 * 
 * @param cedra - The Cedra client instance
 * @param signer - Admin account that will own the lottery
 * @param ticketPrice - Price per ticket in CedraCoin units
 * @returns {Promise<string>} Transaction hash of the initialization
 * @throws {Error} When initialization fails
 */
const initLottery = async (
  cedra: Cedra, 
  signer: Account, 
  ticketPrice: number
): Promise<string> => {
  try {
    console.log(`Initializing Lottery with price: ${ticketPrice}`);
    
    const txn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::init_lottery`,
        functionArguments: [ticketPrice]
      }
    });
    
    const res = await cedra.signAndSubmitTransaction({ signer, transaction: txn });
    await cedra.waitForTransaction({ transactionHash: res.hash });
    console.log(`✓ Lottery Initialized`);
    
    return res.hash;
  } catch (error) {
    console.error(`✗ Failed to initialize lottery:`, error);
    throw error;
  }
};

/**
 * Purchase a lottery ticket
 * 
 * Allows a user to buy a ticket by paying the exact ticket price.
 * The payment goes into the prize pot and the player is added to participants.
 * 
 * @param cedra - The Cedra client instance
 * @param signer - Account purchasing the ticket
 * @param amount - Amount to pay (must match ticket price)
 * @param lotteryOwner - Address of the lottery admin
 * @returns {Promise<string>} Transaction hash of the ticket purchase
 * @throws {Error} When ticket purchase fails
 */
const buyTicket = async (
  cedra: Cedra, 
  signer: Account, 
  amount: number,
  lotteryOwner: string
): Promise<string> => {
  try {
    console.log(`User ${signer.accountAddress.toString().slice(0,6)}... buying ticket for ${amount}`);
    
    const txn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::buy_ticket`,
        functionArguments: [amount, lotteryOwner]
      }
    });
    
    const res = await cedra.signAndSubmitTransaction({ signer, transaction: txn });
    await cedra.waitForTransaction({ transactionHash: res.hash });
    console.log(`✓ Ticket purchased`);
    
    return res.hash;
  } catch (error) {
    console.error(`✗ Failed to buy ticket:`, error);
    throw error;
  }
};

/**
 * Pick a random winner and distribute prize (Admin only)
 * 
 * Selects a random winner from all ticket holders and distributes
 * the entire prize pot to the winner. Resets lottery for next round.
 * 
 * @param cedra - The Cedra client instance
 * @param signer - Admin account (must be lottery owner)
 * @param lotteryOwner - Address of the lottery (should match signer)
 * @returns {Promise<string>} Transaction hash of winner selection
 * @throws {Error} When winner selection fails
 */
const pickWinner = async (
  cedra: Cedra, 
  signer: Account, 
  lotteryOwner: string
): Promise<string> => {
  try {
    console.log(`Picking a winner...`);
    
    const txn = await cedra.transaction.build.simple({
      sender: signer.accountAddress,
      data: { 
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::pick_winner`,
        functionArguments: [lotteryOwner]
      }
    });
    
    const res = await cedra.signAndSubmitTransaction({ signer, transaction: txn });
    await cedra.waitForTransaction({ transactionHash: res.hash });
    console.log(`✓ Winner picked & Prize distributed`);
    
    return res.hash;
  } catch (error) {
    console.error(`✗ Failed to pick winner:`, error);
    throw error;
  }
};

/**
 * Main lottery demonstration function
 * 
 * Demonstrates the complete lottery workflow:
 * 1. Setup admin and player accounts
 * 2. Fund accounts from faucet
 * 3. Initialize lottery if needed
 * 4. Players purchase tickets
 * 5. Admin picks winner
 * 6. Display final state
 * 
 * @throws {Error} When any step of the demo fails
 */
const demo = async (): Promise<void> => {
  try {
    console.log("Cedra Simple Lottery Demo\n");

    const config = new CedraConfig({ 
      network: NETWORK,
      fullnode: FULLNODE_URL,
      faucet: FAUCET_URL
    });

    const cedra = new Cedra(config);

    // 1. Setup Accounts
    // Admin (Deployer)
    const deployerPrivateKey = new Ed25519PrivateKey(DEPLOYER_PRIVATE_KEY);
    const admin = Account.fromPrivateKey({ privateKey: deployerPrivateKey });
    
    // Players (Generate new random accounts)
    const player1 = Account.generate();
    const player2 = Account.generate();
    
    console.log(`Admin Address: ${admin.accountAddress.toString()}`);
    console.log(`Player1 Address: ${player1.accountAddress.toString()}`);
    console.log(`Player2 Address: ${player2.accountAddress.toString()}`);
    
    // 2. Fund Accounts
    await fundAccount(cedra, player1.accountAddress, "Player1");
    await fundAccount(cedra, player2.accountAddress, "Player2");
    // Admin might need gas too if not funded
    // await fundAccount(cedra, admin.accountAddress, "Admin"); 

    // 3. Check & Initialize Lottery
    let lotteryState = await getLotteryState(cedra, admin.accountAddress.toString());
    
    if (!lotteryState) {
        console.log("\n--- Initializing New Lottery ---");
        await initLottery(cedra, admin, TICKET_PRICE);
    } else {
        console.log("\nLottery already initialized.");
    }

    // 4. Players Buy Tickets
    console.log("\n--- Buying Tickets ---");
    
    // Player 1 purchases ticket
    await buyTicket(cedra, player1, TICKET_PRICE, admin.accountAddress.toString());
    
    // Player 2 purchases ticket
    await buyTicket(cedra, player2, TICKET_PRICE, admin.accountAddress.toString());

    // 5. Check State Before Draw
    console.log("\n--- Checking State Before Draw ---");
    lotteryState = await getLotteryState(cedra, admin.accountAddress.toString());
    
    if (lotteryState) {
        console.log(`Players Count: ${lotteryState.players.length}`);
        console.log(`Current Pot: ${lotteryState.pot.value}`);
        console.log(`Current Round: ${lotteryState.round_id}`);
    }

    // 6. Pick Winner
    console.log("\n--- Picking Winner ---");
    await pickWinner(cedra, admin, admin.accountAddress.toString());

    // 7. Final State Check
    console.log("\n--- Final State Check ---");
    const finalState = await getLotteryState(cedra, admin.accountAddress.toString());
    
    if (finalState) {
        console.log(`Players Count (should be 0): ${finalState.players.length}`);
        console.log(`Pot (should be 0): ${finalState.pot.value}`);
        console.log(`Next Round ID: ${finalState.round_id}`);
    }
   
    console.log("\n✓ Demo completed successfully");
  } catch (error) {
    console.error("✗ Demo failed:", error);
    process.exit(1);
  }
};

// Run the demonstration
demo().catch((error: Error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});