import { Account, AccountAddress, Cedra, CedraConfig, Network, Ed25519PrivateKey } from "@cedra-labs/ts-sdk";

const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "_"; // Replace with your deployed contract address
const MODULE_NAME = "Lottery";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "_"; // Set via environment variable or replace with your admin account private key
const ONE_CEDRA_IN_OCTAS = 100_000_000;

const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress) => {
  console.log(`Funding account ${accountAddress.toString()}...`);
  await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
  console.log(`Funding completed`);
};

const createLottery = async (cedra: Cedra, admin: Account) => {
  console.log(`\nCreating new lottery...`);
  const txn = await cedra.transaction.build.simple({
    sender: admin.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_lottery`,
      functionArguments: []
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: admin, transaction: txn });
  console.log(`Lottery created! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
  
  // Get the lottery count to determine the new lottery ID
  // New lottery ID = count - 1 (since IDs are 0-indexed)
  const result = await cedra.view<string>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_lottery_count`,
      functionArguments: []
    }
  });
  
  const count = parseInt(result, 10);
  const newLotteryId = count - 1; // Latest lottery is at index (count - 1)
  return newLotteryId;
};

const purchaseTicket = async (cedra: Cedra, buyer: Account, lotteryId: number) => {
  console.log(`\nPurchasing ticket for lottery ${lotteryId}...`);
  const txn = await cedra.transaction.build.simple({
    sender: buyer.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::purchase_ticket`,
      functionArguments: [lotteryId]
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: buyer, transaction: txn });
  console.log(`Ticket purchased! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
};

const drawWinner = async (cedra: Cedra, admin: Account, lotteryId: number) => {
  console.log(`\nDrawing winner for lottery ${lotteryId}...`);
  const txn = await cedra.transaction.build.simple({
    sender: admin.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::draw_winner`,
      functionArguments: [lotteryId]
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: admin, transaction: txn });
  console.log(`Winner drawn! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
};

const getLotteryInfo = async (cedra: Cedra, lotteryId: number) => {
  const result = await cedra.view<[string, string, boolean, boolean, string, string, string]>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_lottery_info`,
      functionArguments: [lotteryId]
    }
  });
  
  const [idStr, adminStr, isOpen, isDrawn, ticketCountStr, winnerStr, winningTicketIdStr] = result;
  const id = parseInt(idStr, 10);
  const ticketCount = parseInt(ticketCountStr, 10);
  const winningTicketId = parseInt(winningTicketIdStr, 10);
  
  return {
    id,
    admin: adminStr,
    isOpen,
    isDrawn,
    ticketCount,
    winner: winnerStr,
    winningTicketId
  };
};

const getTicketCount = async (cedra: Cedra, lotteryId: number): Promise<number> => {
  const result = await cedra.view<string>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_ticket_count`,
      functionArguments: [lotteryId]
    }
  });
  
  return parseInt(result, 10);
};

const hasTicket = async (cedra: Cedra, lotteryId: number, address: string): Promise<boolean> => {
  const result = await cedra.view<boolean>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::has_ticket`,
      functionArguments: [lotteryId, address]
    }
  });
  
  return result;
};

const displayLotteryInfo = async (cedra: Cedra, lotteryId: number) => {
  console.log(`\n📋 Lottery ${lotteryId} Information:`);
  const info = await getLotteryInfo(cedra, lotteryId);
  console.log(`   ID: ${info.id}`);
  console.log(`   Admin: ${info.admin}`);
  console.log(`   Status: ${info.isOpen ? "🟢 OPEN" : "🔴 CLOSED"}`);
  console.log(`   Drawn: ${info.isDrawn ? "✅ YES" : "❌ NO"}`);
  console.log(`   Total Tickets: ${info.ticketCount}`);
  if (info.isDrawn) {
    console.log(`   🎉 Winner: ${info.winner}`);
    console.log(`   🎫 Winning Ticket ID: ${info.winningTicketId}`);
  }
  return info;
};

const example = async () => {
  console.log("Starting Lottery Simple Demo");
  console.log("=".repeat(60));

  // Configure network endpoints - let SDK use default faucet URL
  const fullnode = "https://testnet.cedra.dev/v1";
  const config = new CedraConfig({ network: NETWORK, fullnode });
  const cedra = new Cedra(config);

  // Use provided private key or generate a new account for testing
  let admin: Account;
  if (ADMIN_PRIVATE_KEY === "_" || ADMIN_PRIVATE_KEY.length < 64) {
    console.log("⚠️  No admin private key provided. Generating a new account for testing...");
    console.log("⚠️  Note: This account won't have permissions if the contract is already deployed.");
    admin = Account.generate();
    console.log("Generated Admin Address: ", admin.accountAddress.toString());
    // SECURITY: Private key logging removed for production safety
    // In development, you can temporarily uncomment the next line if needed:
    // console.log("Generated Private Key: ", admin.privateKey.toString());
    console.log("⚠️  Save the private key securely if you want to use this account!");
  } else {
    const privateKey = new Ed25519PrivateKey(ADMIN_PRIVATE_KEY);
    admin = Account.fromPrivateKey({ privateKey });
  }
  
  const buyer1 = Account.generate();
  const buyer2 = Account.generate();
  const buyer3 = Account.generate();
  
  console.log("\nAdmin Address: ", admin.accountAddress.toString());
  console.log("Buyer 1 Address: ", buyer1.accountAddress.toString());
  console.log("Buyer 2 Address: ", buyer2.accountAddress.toString());
  console.log("Buyer 3 Address: ", buyer3.accountAddress.toString());

  // Fund accounts
  console.log("\n💰 Funding accounts...");
  await fundAccount(cedra, admin.accountAddress);
  await fundAccount(cedra, buyer1.accountAddress);
  await fundAccount(cedra, buyer2.accountAddress);
  await fundAccount(cedra, buyer3.accountAddress);

  try {
    // Step 1: Create a lottery
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Creating Lottery");
    console.log("=".repeat(60));
    const lotteryId = await createLottery(cedra, admin);
    await displayLotteryInfo(cedra, lotteryId);
    
    // Step 2: Purchase tickets
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Purchasing Tickets");
    console.log("=".repeat(60));
    await purchaseTicket(cedra, buyer1, lotteryId);
    await purchaseTicket(cedra, buyer2, lotteryId);
    await purchaseTicket(cedra, buyer3, lotteryId);
    await displayLotteryInfo(cedra, lotteryId);
    
    // Step 3: Draw winner
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Drawing Winner");
    console.log("=".repeat(60));
    await drawWinner(cedra, admin, lotteryId);
    await displayLotteryInfo(cedra, lotteryId);
    
    // Check if buyers have tickets
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Verifying Tickets");
    console.log("=".repeat(60));
    const buyer1HasTicket = await hasTicket(cedra, lotteryId, buyer1.accountAddress.toString());
    const buyer2HasTicket = await hasTicket(cedra, lotteryId, buyer2.accountAddress.toString());
    const buyer3HasTicket = await hasTicket(cedra, lotteryId, buyer3.accountAddress.toString());
    console.log(`Buyer 1 has ticket: ${buyer1HasTicket ? "✅ YES" : "❌ NO"}`);
    console.log(`Buyer 2 has ticket: ${buyer2HasTicket ? "✅ YES" : "❌ NO"}`);
    console.log(`Buyer 3 has ticket: ${buyer3HasTicket ? "✅ YES" : "❌ NO"}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Lottery demo completed successfully!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("Error during operation:", error);
  }
};

example().catch(console.error);

