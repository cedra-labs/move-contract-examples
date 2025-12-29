import { Account, AccountAddress, Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";
import { sha3_256 } from "@noble/hashes/sha3";

// Constants
const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // Replace with your deployed contract address
const MODULE_NAME = "RockPaperScissors";
const MODULE_FULL_PATH = `${MODULE_ADDRESS}::${MODULE_NAME}`;

// Cedra network configuration
const fullnode = "https://testnet.cedra.dev/v1";
const faucet = "https://faucet-api.cedra.dev";

// Token amounts
const ONE_CEDRA_IN_OCTAS = 100_000_000; // 1 CEDRA = 100 million octas

// Game parameters
const STAKE_AMOUNT = 1000; // octas (0.00001 CEDRA for testing)
const CEDRA_METADATA = "0x000000000000000000000000000000000000000000000000000000000000000a";

// Move types
const MOVE_ROCK = 0;
const MOVE_PAPER = 1;
const MOVE_SCISSORS = 2;

const MOVE_NAMES = ["Rock", "Paper", "Scissors"];

/**
 * Compute commit hash: SHA3-256(move || secret)
 */
function computeCommitHash(move: number, secret: Uint8Array): Uint8Array {
  const data = new Uint8Array(1 + secret.length);
  data[0] = move;
  data.set(secret, 1);
  return sha3_256(data);
}

/**
 * Generate a random secret for commit-reveal
 */
function generateSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return secret;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

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
    const cedraAmount = (amount / ONE_CEDRA_IN_OCTAS).toFixed(8);
    console.log(`${name}'s CEDRA balance is: ${cedraAmount} CEDRA (${amount} octas)`);
    return amount;
  } catch (error) {
    console.error(`Error getting balance for ${name}:`, error);
    return 0;
  }
};

/**
 * Get game information
 */
const getGameInfo = async (cedra: Cedra, gameAddress: string) => {
  try {
    const result = await cedra.view({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_game_info`,
        typeArguments: [],
        functionArguments: [gameAddress]
      }
    });

    const [
      gameId,
      player1,
      player2,
      stakeAmount,
      paymentAsset,
      status,
      player1Committed,
      player2Committed,
      player1Revealed,
      player2Revealed,
      player1Move,
      player2Move,
      winner
    ] = result as [string, string, string, string, string, string, boolean, boolean, boolean, boolean, string, string, string];

    const statusNames = ["Waiting for Player 2", "Ready for Commits", "Ready for Reveals", "Finished"];
    const statusName = statusNames[parseInt(status, 10)] || "Unknown";

    const info = {
      gameId: parseInt(gameId, 10),
      player1,
      player2,
      stakeAmount: parseInt(stakeAmount, 10),
      paymentAsset,
      status: parseInt(status, 10),
      statusName,
      player1Committed,
      player2Committed,
      player1Revealed,
      player2Revealed,
      player1Move: parseInt(player1Move, 10),
      player2Move: parseInt(player2Move, 10),
      winner
    };

    console.log("\n🎮 Game Information:");
    console.log(`   Game ID: ${info.gameId}`);
    console.log(`   Player 1: ${info.player1}`);
    console.log(`   Player 2: ${info.player2 === "0x0" ? "Waiting..." : info.player2}`);
    console.log(`   Stake Amount: ${info.stakeAmount} octas`);
    console.log(`   Status: ${info.statusName} (${info.status})`);
    console.log(`   Player 1 Committed: ${info.player1Committed}`);
    console.log(`   Player 2 Committed: ${info.player2Committed}`);
    console.log(`   Player 1 Revealed: ${info.player1Revealed}`);
    console.log(`   Player 2 Revealed: ${info.player2Revealed}`);
    
    if (info.player1Move !== 255) {
      console.log(`   Player 1 Move: ${MOVE_NAMES[info.player1Move]}`);
    }
    if (info.player2Move !== 255) {
      console.log(`   Player 2 Move: ${MOVE_NAMES[info.player2Move]}`);
    }
    
    if (info.winner !== "0x0") {
      console.log(`   Winner: ${info.winner}`);
    } else if (info.status === 3) {
      console.log(`   Result: Tie!`);
    }

    return info;
  } catch (error) {
    console.error(`Error getting game info:`, error);
    throw error;
  }
};

/**
 * Check if game exists
 */
const checkGameExists = async (cedra: Cedra, gameAddress: string) => {
  try {
    const [exists] = await cedra.view<[boolean]>({
      payload: {
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::game_exists`,
        typeArguments: [],
        functionArguments: [gameAddress]
      }
    });
    console.log(`Game exists check: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`Error checking if game exists:`, error);
    return false;
  }
};

/**
 * Create a new game
 */
const createGame = async (cedra: Cedra, creator: Account, stakeAmount: number = 0) => {
  console.log(`Creating game with stake: ${stakeAmount} octas...`);
  
  const createGameTxn = await cedra.transaction.build.simple({
    sender: creator.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_game`,
      functionArguments: [
        stakeAmount.toString(),
        CEDRA_METADATA
      ] 
    }
  });
  
  console.log("✓ Create game transaction built successfully");
  console.log("Signing transaction...");
  const createGameRes = await cedra.signAndSubmitTransaction({ 
    signer: creator, 
    transaction: createGameTxn 
  });
  console.log(`✓ Create game transaction submitted: ${createGameRes.hash}`);
  
  console.log("Waiting for transaction to be confirmed...");
  await cedra.waitForTransaction({ transactionHash: createGameRes.hash });
  console.log("✓ Create game transaction confirmed!");
  
  // Extract game object address from transaction
  let gameAddress: string | null = null;
  
  try {
    const txDetails = await cedra.getTransactionByHash({ transactionHash: createGameRes.hash });
    
    if (txDetails.changes) {
      for (const change of txDetails.changes) {
        if (change.type === "write_resource" && change.data?.type?.includes("Game")) {
          gameAddress = change.address;
          console.log(`✓ Found game object address: ${gameAddress}`);
          break;
        }
      }
    }
  } catch (error) {
    console.log("⚠️  Could not extract game address from transaction:", error);
  }

  return gameAddress;
};

/**
 * Join a game as player 2
 */
const joinGame = async (cedra: Cedra, player2: Account, gameAddress: string) => {
  console.log(`Player 2 joining game...`);
  
  const joinGameTxn = await cedra.transaction.build.simple({
    sender: player2.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::join_game`,
      functionArguments: [gameAddress]
    }
  });
  
  console.log("✓ Join game transaction built successfully");
  console.log("Signing transaction...");
  const joinGameRes = await cedra.signAndSubmitTransaction({ 
    signer: player2, 
    transaction: joinGameTxn 
  });
  console.log(`✓ Join game transaction submitted: ${joinGameRes.hash}`);
  
  console.log("Waiting for transaction to be confirmed...");
  await cedra.waitForTransaction({ transactionHash: joinGameRes.hash });
  console.log("✓ Join game transaction confirmed!");
};

/**
 * Commit a move
 */
const commitMove = async (cedra: Cedra, player: Account, gameAddress: string, move: number, secret: Uint8Array) => {
  const moveName = MOVE_NAMES[move];
  console.log(`Committing move: ${moveName}...`);
  
  const commitHash = computeCommitHash(move, secret);
  const commitHashHex = bytesToHex(commitHash);
  
  console.log(`Commit hash: ${commitHashHex}`);
  
  // Convert Uint8Array to array of numbers for the SDK
  const commitHashArray = Array.from(commitHash);
  
  const commitTxn = await cedra.transaction.build.simple({
    sender: player.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::commit_move`,
      functionArguments: [
        gameAddress,
        commitHashArray
      ]
    }
  });
  
  console.log("✓ Commit move transaction built successfully");
  console.log("Signing transaction...");
  const commitRes = await cedra.signAndSubmitTransaction({ 
    signer: player, 
    transaction: commitTxn 
  });
  console.log(`✓ Commit move transaction submitted: ${commitRes.hash}`);
  
  console.log("Waiting for transaction to be confirmed...");
  await cedra.waitForTransaction({ transactionHash: commitRes.hash });
  console.log(`✓ Move committed: ${moveName}`);
  
  return { commitHash, secret };
};

/**
 * Reveal a move
 */
const revealMove = async (cedra: Cedra, player: Account, gameAddress: string, move: number, secret: Uint8Array) => {
  const moveName = MOVE_NAMES[move];
  console.log(`Revealing move: ${moveName}...`);
  
  const secretHex = bytesToHex(secret);
  
  // Convert Uint8Array to array of numbers for the SDK
  const secretArray = Array.from(secret);
  
  const revealTxn = await cedra.transaction.build.simple({
    sender: player.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::reveal_move`,
      functionArguments: [
        gameAddress,
        move.toString(),
        secretArray
      ]
    }
  });
  
  console.log("✓ Reveal move transaction built successfully");
  console.log("Signing transaction...");
  const revealRes = await cedra.signAndSubmitTransaction({ 
    signer: player, 
    transaction: revealTxn 
  });
  console.log(`✓ Reveal move transaction submitted: ${revealRes.hash}`);
  
  console.log("Waiting for transaction to be confirmed...");
  await cedra.waitForTransaction({ transactionHash: revealRes.hash });
  console.log(`✓ Move revealed: ${moveName}`);
};

/**
 * Main demo flow
 */
const example = async () => {
  console.log("=".repeat(60));
  console.log("Rock-Paper-Scissors Game Demo");
  console.log("=".repeat(60));
  console.log(`Using module: ${MODULE_FULL_PATH}`);
  console.log(`Network: ${NETWORK}`);
  console.log();

  // Check if module address is set
  if (MODULE_ADDRESS === "_") {
    console.error("❌ ERROR: MODULE_ADDRESS is not set!");
    console.log("\nPlease deploy the contract first:");
    console.log("  1. cd contract");
    console.log("  2. cedra move compile --named-addresses RockPaperScissors=default");
    console.log("  3. cedra move publish --named-addresses RockPaperScissors=default");
    console.log("  4. Update MODULE_ADDRESS in src/index.ts with the deployed address");
    return;
  }

  // Setup - SDK will use default URLs for the specified network
  const config = new CedraConfig({ network: NETWORK, fullnode, faucet });
  const cedra = new Cedra(config);

  // Generate accounts
  const player1 = Account.generate();
  const player2 = Account.generate();
  
  console.log("📝 Generated Accounts:");
  console.log(`   Player 1: ${player1.accountAddress.toString()}`);
  console.log(`   Player 2: ${player2.accountAddress.toString()}`);
  console.log();
  
  // Fund accounts
  console.log("💰 Funding accounts...");
  await fundAccount(cedra, player1.accountAddress, "Player 1");
  await fundAccount(cedra, player2.accountAddress, "Player 2");
  console.log();

  // Check initial balances
  console.log("Checking initial CEDRA balances...");
  await checkBalance(cedra, "Player 1", player1.accountAddress);
  await checkBalance(cedra, "Player 2", player2.accountAddress);
  console.log();

  try {
    // Step 1: Create game
    console.log("Step 1: Creating game...");
    const gameAddress = await createGame(cedra, player1, STAKE_AMOUNT);
    
    if (!gameAddress) {
      console.error("❌ ERROR: Could not extract game address!");
      return;
    }
    
    console.log(`✓ Using game address: ${gameAddress}`);
    console.log();

    // Step 2: Check if game exists
    console.log("Step 2: Checking if game exists...");
    const gameExists = await checkGameExists(cedra, gameAddress);
    console.log();

    if (!gameExists) {
      console.log("⚠️  Game does not exist at the extracted address");
      return;
    }

    // Step 3: Get initial game info
    console.log("Step 3: Getting initial game information...");
    await getGameInfo(cedra, gameAddress);
    console.log();

    // Step 4: Player 2 joins
    console.log("Step 4: Player 2 joining game...");
    await joinGame(cedra, player2, gameAddress);
    console.log();

    // Get updated game info
    await getGameInfo(cedra, gameAddress);
    console.log();

    // Step 5: Both players commit moves
    console.log("Step 5: Players committing moves...");
    
    // Player 1 commits Rock
    const secret1 = generateSecret();
    const { commitHash: commitHash1 } = await commitMove(cedra, player1, gameAddress, MOVE_ROCK, secret1);
    console.log();

    // Player 2 commits Scissors
    const secret2 = generateSecret();
    const { commitHash: commitHash2 } = await commitMove(cedra, player2, gameAddress, MOVE_SCISSORS, secret2);
    console.log();

    // Get updated game info
    await getGameInfo(cedra, gameAddress);
    console.log();

    // Step 6: Both players reveal moves
    console.log("Step 6: Players revealing moves...");
    
    // Player 1 reveals Rock
    await revealMove(cedra, player1, gameAddress, MOVE_ROCK, secret1);
    console.log();

    // Player 2 reveals Scissors
    await revealMove(cedra, player2, gameAddress, MOVE_SCISSORS, secret2);
    console.log();

    // Step 7: Get final game info
    console.log("Step 7: Getting final game information...");
    const finalInfo = await getGameInfo(cedra, gameAddress);
    console.log();

    // Determine winner
    if (finalInfo.winner === player1.accountAddress.toString()) {
      console.log("🎉 Player 1 wins! (Rock beats Scissors)");
    } else if (finalInfo.winner === player2.accountAddress.toString()) {
      console.log("🎉 Player 2 wins!");
    } else if (finalInfo.status === 3) {
      console.log("🤝 It's a tie!");
    }
    console.log();

    // Check final balances
    console.log("Checking final CEDRA balances...");
    await checkBalance(cedra, "Player 1", player1.accountAddress);
    await checkBalance(cedra, "Player 2", player2.accountAddress);
    console.log();

    console.log("=".repeat(60));
    console.log("Demo completed successfully!");
    console.log("=".repeat(60));
    console.log("Operations performed:");
    console.log("  ✓ Account generation and funding");
    console.log("  ✓ Game creation");
    console.log("  ✓ Player 2 joining");
    console.log("  ✓ Commit-reveal moves");
    console.log("  ✓ Winner determination");
    console.log("  ✓ Stake distribution");
    console.log();
    console.log("💡 The commit-reveal mechanism ensures:");
    console.log("  - Players cannot see opponent's move before committing");
    console.log("  - Players cannot change their move after committing");
    console.log("  - Fair and transparent gameplay");
    
  } catch (error) {
    console.error("\n❌ Error during operation:", error);
    console.log("\nThis could be because:");
    console.log("  1. The module address is not set or incorrect");
    console.log("  2. The module has different function signatures than expected");
    console.log("  3. Network connectivity issues");
    console.log("  4. The game address doesn't exist");
    console.log("  5. Insufficient balance for operations");
    if (error instanceof Error) {
      console.log(`\nError details: ${error.message}`);
    }
  }
};

example().catch(console.error);

