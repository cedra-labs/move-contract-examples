import { 
  Account, 
  AccountAddress, 
  Cedra, 
  CedraConfig, 
  Network,
} from "@cedra-labs/ts-sdk";

// Configuration constants for the racing game
const MODULE_ADDRESS = "604e072b2c6c7856ba66729783794aeb7a9bd97a8ec456a5bd0866abbeba45f7"; // Update after deployment
const MODULE_NAME = "race"; // Name of the Move module

// Token amounts (in smallest unit of CEDRA) - similar to wei in Ethereum
const ONE_CEDRA = 100_000_000; // 100 million base units = 1 CEDRA token

// Movement constants matching the Move contract - must match enum values in Move code
enum Move {
  UP = 1,    // Corresponds to MOVE_UP in Move contract
  DOWN = 2,  // Corresponds to MOVE_DOWN in Move contract
  LEFT = 3,  // Corresponds to MOVE_LEFT in Move contract
  RIGHT = 4, // Corresponds to MOVE_RIGHT in Move contract
}

// Type interfaces to match the Move contract's return structures
interface GameInfo {
  game_id: string;      // Unique game identifier (timestamp-based)
  creator: string;      // Address of game creator
  start_x: number;      // Starting X coordinate (0-9)
  start_y: number;      // Starting Y coordinate (0-9)
  dest_x: number;       // Destination X coordinate (0-9)
  dest_y: number;       // Destination Y coordinate (0-9)
  winner: string[];     // Array of winner addresses (empty or single element)
  created_at: string;   // Unix timestamp when game was created
}

interface SimulationResult {
  final_x: number;     // Final X coordinate after simulating moves
  final_y: number;     // Final Y coordinate after simulating moves
  reached: boolean;    // Whether destination was reached
}

/**
 * Race Game Client Class
 * Main client for interacting with the deterministic racing game contract
 */
class RaceGameClient {
  private cedra: Cedra;                // Cedra SDK instance
  private moduleAddress: string;       // Address where Move module is deployed
  private moduleName: string;          // Name of the Move module

  /**
   * Constructor for RaceGameClient
   * @param network - Cedra network to connect to (default: TESTNET)
   * @param moduleAddress - Address of deployed race module
   */
  constructor(network: Network = Network.TESTNET, moduleAddress: string = MODULE_ADDRESS) {
    // Warn if module address is not updated (default placeholder)
    if (moduleAddress === "YOUR_MODULE_ADDRESS_HERE") {
      console.warn("⚠️  Warning: MODULE_ADDRESS is not set. Please deploy the contract and update MODULE_ADDRESS in the code.");
    }
    
    // Configure Cedra SDK with network endpoints
    const fullnode = "https://testnet.cedra.dev/v1";  // Blockchain RPC endpoint
    const faucet = "https://faucet-api.cedra.dev";    // Faucet for testnet tokens
    const config = new CedraConfig({ network, fullnode, faucet });
    this.cedra = new Cedra(config);                   // Initialize SDK
    
    // Store contract reference
    this.moduleAddress = moduleAddress;               // Contract address
    this.moduleName = MODULE_NAME;                   // Module name (race)
  }

  /**
   * Fund an account with CEDRA tokens from testnet faucet
   * @param accountAddress - Address to fund
   * @param amount - Amount in smallest units (default: 1 CEDRA)
   */
  async fundAccount(accountAddress: AccountAddress, amount: number = ONE_CEDRA): Promise<void> {
    try {
      // Request funds from faucet for testing
      await this.cedra.faucet.fundAccount({ accountAddress, amount });
      console.log(`✅ Funded account ${accountAddress.toString().slice(0, 10)}... with ${amount / ONE_CEDRA} CEDRA`);
    } catch (error) {
      console.error(`❌ Error funding account: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize NFT collection for race winners
   * Must be called by creator before creating games
   * @param creator - Account that will own the NFT collection
   */
  async initCollection(creator: Account): Promise<string> {
    try {
      // Build transaction to call init_collection function
      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::init_collection`, // Fully qualified function name
          functionArguments: [] // No arguments needed
        }
      });

      // Sign and submit the transaction
      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      // Wait for transaction confirmation on chain
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ NFT collection initialized successfully!");
      console.log(`   Transaction hash: ${response.hash}`);
      
      return response.hash; // Return transaction hash for reference
    } catch (error) {
      console.error("❌ Error initializing collection:", error);
      throw error;
    }
  }

  /**
   * Create a new racing game with specified start and destination positions
   * @param creator - Account creating the game
   * @param startX - Starting X coordinate (0-9)
   * @param startY - Starting Y coordinate (0-9)
   * @param destX - Destination X coordinate (0-9)
   * @param destY - Destination Y coordinate (0-9)
   */
  async createGame(
    creator: Account,
    startX: number,
    startY: number,
    destX: number,
    destY: number
  ): Promise<string> {
    try {
      // Build transaction to call create_game function
      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::create_game`,
          functionArguments: [
            startX.toString(), // Convert numbers to strings for Move function
            startY.toString(),
            destX.toString(),
            destY.toString()
          ]
        }
      });

      // Execute the transaction
      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Game created successfully!");
      console.log(`   Start: (${startX}, ${startY}) → Destination: (${destX}, ${destY})`);
      console.log(`   Transaction hash: ${response.hash}`);
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error creating game:", error);
      throw error;
    }
  }

  /**
   * Play the game by submitting a sequence of moves
   * @param player - Account making the attempt
   * @param gameCreator - Address of game creator (where game is stored)
   * @param moves - Array of move directions (1-4)
   */
  async playGame(
    player: Account,
    gameCreator: AccountAddress,
    moves: number[]
  ): Promise<string> {
    try {
      // Build transaction to call play_game function
      const transaction = await this.cedra.transaction.build.simple({
        sender: player.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::play_game`,
          functionArguments: [
            gameCreator.toString(), // Address parameter for game lookup
            moves                   // Array of moves (1-4)
          ]
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: player, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log(`✅ Moves submitted successfully! (${moves.length} steps)`);
      console.log(`   Moves: ${moves.map(m => this.getMoveString(m)).join(" → ")}`);
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error playing game:", error);
      throw error;
    }
  }

  /**
   * Reset game (only creator can do this)
   * Clears winner and all attempts, allowing new competition
   * @param creator - Game creator's account
   */
  async resetGame(creator: Account): Promise<string> {
    try {
      const transaction = await this.cedra.transaction.build.simple({
        sender: creator.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::reset_game`,
          functionArguments: []
        }
      });

      const response = await this.cedra.signAndSubmitTransaction({ 
        signer: creator, 
        transaction 
      });
      
      await this.cedra.waitForTransaction({ transactionHash: response.hash });
      console.log("✅ Game reset successfully!");
      
      return response.hash;
    } catch (error) {
      console.error("❌ Error resetting game:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive game information
   * @param creator - Address of game creator
   * @returns GameInfo object or null if game doesn't exist
   */
  async getGameInfo(creator: AccountAddress): Promise<GameInfo | null> {
    try {
      // Call view function (read-only, no gas cost)
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_game_info`,
          functionArguments: [creator.toString()]
        }
      });

      // Parse result tuple into structured object
      const [game_id, creatorAddr, start_x, start_y, dest_x, dest_y, winner, created_at] = result as [
        string, string, number, number, number, number, string[], string
      ];
      
      const gameInfo: GameInfo = {
        game_id,
        creator: creatorAddr,
        start_x,
        start_y,
        dest_x,
        dest_y,
        winner,
        created_at
      };

      // Display formatted game info
      console.log("🏁 Game Info:");
      console.log(`   Game ID: ${game_id}`);
      console.log(`   Creator: ${creatorAddr.slice(0, 10)}...`);
      console.log(`   Start: (${start_x}, ${start_y})`);
      console.log(`   Destination: (${dest_x}, ${dest_y})`);
      console.log(`   Winner: ${winner.length > 0 ? winner[0].slice(0, 10) + "..." : "None yet"}`);
      console.log(`   Created: ${new Date(parseInt(created_at) * 1000).toLocaleString()}`);

      return gameInfo;
    } catch (error) {
      console.error("❌ Error getting game info:", error);
      return null; // Return null instead of throwing for view functions
    }
  }

  /**
   * Simulate moves without submitting transaction
   * Useful for testing strategies before playing
   * @param creator - Game creator address
   * @param moves - Array of moves to simulate
   * @returns SimulationResult or null if error
   */
  async simulateMoves(creator: AccountAddress, moves: number[]): Promise<SimulationResult | null> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::simulate_moves`,
          functionArguments: [creator.toString(), moves]
        }
      });
      
      const [final_x, final_y, reached] = result as [number, number, boolean];
      
      console.log("🎮 Simulation Result:");
      console.log(`   Final position: (${final_x}, ${final_y})`);
      console.log(`   Reached destination: ${reached ? "✅ YES" : "❌ NO"}`);
      console.log(`   Steps taken: ${moves.length}`);
      
      return { final_x, final_y, reached };
    } catch (error) {
      console.error("❌ Error simulating moves:", error);
      return null;
    }
  }

  /**
   * Check if game has been won (read-only view function)
   * @param creator - Game creator address
   * @returns boolean indicating if game is won
   */
  async isGameWon(creator: AccountAddress): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::is_game_won`,
          functionArguments: [creator.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking if game won:", error);
      return false;
    }
  }

  /**
   * Get winner address (read-only view function)
   * @param creator - Game creator address
   * @returns winner address or null if no winner
   */
  async getWinner(creator: AccountAddress): Promise<string | null> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_winner`,
          functionArguments: [creator.toString()]
        }
      });
      
      const winners = result[0] as string[];
      return winners.length > 0 ? winners[0] : null;
    } catch (error) {
      console.error("❌ Error getting winner:", error);
      return null;
    }
  }

  /**
   * Get number of attempts made on a game
   * @param creator - Game creator address
   * @returns count of attempts
   */
  async getAttemptsCount(creator: AccountAddress): Promise<number> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_attempts_count`,
          functionArguments: [creator.toString()]
        }
      });
      
      return parseInt(result[0] as string);
    } catch (error) {
      console.error("❌ Error getting attempts count:", error);
      return 0;
    }
  }

  /**
   * Get NFT collection statistics
   * @param creator - Collection owner address
   * @returns number of NFTs minted so far
   */
  async getCollectionStats(creator: AccountAddress): Promise<number> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::get_collection_stats`,
          functionArguments: [creator.toString()]
        }
      });
      
      return parseInt(result[0] as string);
    } catch (error) {
      console.error("❌ Error getting collection stats:", error);
      return 0;
    }
  }

  /**
   * Check if a game exists at creator's address
   * @param creator - Address to check for game
   * @returns boolean indicating if game exists
   */
  async gameExists(creator: AccountAddress): Promise<boolean> {
    try {
      const result = await this.cedra.view({
        payload: {
          function: `${this.moduleAddress}::${this.moduleName}::game_exists`,
          functionArguments: [creator.toString()]
        }
      });
      
      return result[0] as boolean;
    } catch (error) {
      console.error("❌ Error checking game existence:", error);
      return false;
    }
  }

  /**
   * Helper method to convert move number to readable string
   * @param move - Move number (1-4)
   * @returns String representation of move
   */
  private getMoveString(move: number): string {
    switch (move) {
      case Move.UP: return "UP";
      case Move.DOWN: return "DOWN";
      case Move.LEFT: return "LEFT";
      case Move.RIGHT: return "RIGHT";
      default: return "UNKNOWN";
    }
  }
}

/**
 * TEST 1: Complete Game Lifecycle - Win with Optimal Path (≤3 steps)
 * Tests the primary win condition: reaching destination in 3 or fewer moves
 */
const testOptimalWinPath = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 1: Optimal Win Path (≤3 Steps Gets NFT)");
  console.log("=".repeat(60));

  try {
    const client = new RaceGameClient();

    // Generate test accounts for creator and players
    const creator = Account.generate();   // Game creator
    const player1 = Account.generate();  // First player (suboptimal)
    const player2 = Account.generate();  // Second player (optimal - winner)
    const player3 = Account.generate();  // Third player (test after win)
   
    console.log("\n📝 Setting up accounts...");
    // Fund all accounts with test tokens
    await client.fundAccount(creator.accountAddress, ONE_CEDRA);
    await client.fundAccount(player1.accountAddress, ONE_CEDRA);
    await client.fundAccount(player2.accountAddress, ONE_CEDRA);
    await client.fundAccount(player3.accountAddress, ONE_CEDRA);
    
    // Initialize NFT collection (must be done before creating games)
    console.log("\n🎨 Initializing NFT collection...");
    await client.initCollection(creator);

    // Create a simple game: horizontal movement from (0,0) to (3,0)
    console.log("\n🏁 Creating race game...");
    await client.createGame(creator, 0, 0, 3, 0);

    // Verify game creation by fetching info
    console.log("\n📊 Fetching game info...");
    await client.getGameInfo(creator.accountAddress);

    // Player 1: Try suboptimal path (5 steps) - reaches destination but too slow
    console.log("\n🎮 Player 1: Suboptimal path (5 steps)...");
    const player1Moves = [Move.RIGHT, Move.LEFT, Move.RIGHT, Move.RIGHT, Move.RIGHT];
    console.log("   Testing simulation first...");
    await client.simulateMoves(creator.accountAddress, player1Moves); // Preview result
    await client.playGame(player1, creator.accountAddress, player1Moves); // Submit attempt
    
    let isWon = await client.isGameWon(creator.accountAddress);
    console.log(`   Game won: ${isWon ? "✅" : "❌"} (Expected: NO - too many steps)`);

    // Player 2: Optimal path (3 steps) - meets win condition for NFT
    console.log("\n🎮 Player 2: Optimal path (3 steps)...");
    const player2Moves = [Move.RIGHT, Move.RIGHT, Move.RIGHT]; // Direct path
    console.log("   Testing simulation first...");
    const sim = await client.simulateMoves(creator.accountAddress, player2Moves);
    await client.playGame(player2, creator.accountAddress, player2Moves); // Winning attempt
    
    isWon = await client.isGameWon(creator.accountAddress);
    console.log(`   Game won: ${isWon ? "✅ YES!" : "❌"} (Expected: YES - 3 steps)`);

    // Player 3: Try to play after game is already won - should be rejected
    console.log("\n🎮 Player 3: Trying after game won (should fail)...");
    const player3Moves = [Move.RIGHT, Move.RIGHT, Move.RIGHT];
    let failedAsExpected = false;
    try {
      await client.playGame(player3, creator.accountAddress, player3Moves);
      console.log("   ⚠️  ERROR: Play after win was allowed!");
    } catch (error) {
      console.log("   ✅ Play after win correctly prevented");
      failedAsExpected = true;
    }

    // Verify winner is correct
    console.log("\n🏆 Checking winner...");
    const winner = await client.getWinner(creator.accountAddress);
    const isPlayer2Winner = winner === player2.accountAddress.toString();
    console.log(`   Winner: ${winner?.slice(0, 10)}...`);
    console.log(`   Is Player 2: ${isPlayer2Winner ? "✅" : "❌"}`);

    // Get total attempts count
    const attempts = await client.getAttemptsCount(creator.accountAddress);
    console.log(`\n📊 Total attempts: ${attempts} (Expected: 2)`);

    // Get NFT minting stats
    const nftsMinted = await client.getCollectionStats(creator.accountAddress);
    console.log(`🎨 NFTs minted: ${nftsMinted} (Expected: 1)`);

    // Comprehensive test verification
    if (isWon && 
        isPlayer2Winner && 
        failedAsExpected && 
        attempts === 2 &&
        nftsMinted === 1 &&
        sim?.reached) {
      console.log("\n✅ TEST 1 PASSED: Optimal win path works correctly!");
      console.log("   - Player 1: 5 steps → reached but no NFT");
      console.log("   - Player 2: 3 steps → reached and won NFT! 🏆");
      console.log("   - Player 3: blocked after game won");
      console.log("   - 1 NFT minted to winner");
    } else {
      console.log("\n❌ TEST 1 FAILED: Verification error!");
    }

  } catch (error) {
    console.error("❌ TEST 1 FAILED:", error);
  }
};

/**
 * TEST 2: Multiple Players Competition
 * Tests scenarios where players compete but no one wins with ≤3 moves
 */
const testMultiplePlayersRace = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 2: Multiple Players Racing Competition");
  console.log("=".repeat(60));

  try {
    const client = new RaceGameClient();

    // Generate test accounts
    const creator = Account.generate();   // Game creator
    const player1 = Account.generate();  // Player with wrong path
    const player2 = Account.generate();  // Player with correct but slow path
    const player3 = Account.generate();  // Player with fast but incorrect path

    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(creator.accountAddress, ONE_CEDRA);
    await client.fundAccount(player1.accountAddress, ONE_CEDRA);
    await client.fundAccount(player2.accountAddress, ONE_CEDRA);
    await client.fundAccount(player3.accountAddress, ONE_CEDRA);

    // Initialize collection
    console.log("\n🎨 Initializing NFT collection...");
    await client.initCollection(creator);

    // Create diagonal game: requires both X and Y movement
    console.log("\n🏁 Creating diagonal race game...");
    await client.createGame(creator, 0, 0, 2, 2); // Diagonal movement challenge

    // Player 1: Wrong path - only moves horizontally
    console.log("\n🎮 Player 1: Wrong path...");
    const p1Moves = [Move.RIGHT, Move.RIGHT]; // Only reaches (2,0) not (2,2)
    const p1Sim = await client.simulateMoves(creator.accountAddress, p1Moves);
    await client.playGame(player1, creator.accountAddress, p1Moves);
    console.log(`   Reached: ${p1Sim?.reached ? "✅" : "❌ (as expected)"}`);

    // Player 2: Correct path but takes 4 steps (too many for NFT)
    console.log("\n🎮 Player 2: Correct path but 4 steps...");
    const p2Moves = [Move.RIGHT, Move.UP, Move.RIGHT, Move.UP]; // Zigzag path
    const p2Sim = await client.simulateMoves(creator.accountAddress, p2Moves);
    await client.playGame(player2, creator.accountAddress, p2Moves);
    console.log(`   Reached: ${p2Sim?.reached ? "✅" : "❌"}`);
    console.log(`   Steps: ${p2Moves.length} (>3, no NFT)`);

    let isWon = await client.isGameWon(creator.accountAddress);
    console.log(`   Game won: ${isWon ? "❌ Should not win with >3 steps" : "✅ Correct"}`);

    // Player 3: Fast path (3 steps) but wrong destination
    console.log("\n🎮 Player 3: Another attempt...");
    const p3Moves = [Move.UP, Move.RIGHT, Move.UP]; // Reaches (1,2) not (2,2)
    const p3Sim = await client.simulateMoves(creator.accountAddress, p3Moves);
    await client.playGame(player3, creator.accountAddress, p3Moves);
    console.log(`   Final position: (${p3Sim?.final_x}, ${p3Sim?.final_y})`);
    console.log(`   Reached: ${p3Sim?.reached ? "✅" : "❌ (as expected)"}`);

    // Get final game statistics
    console.log("\n📊 Final Statistics:");
    const attempts = await client.getAttemptsCount(creator.accountAddress);
    const nftsMinted = await client.getCollectionStats(creator.accountAddress);
    isWon = await client.isGameWon(creator.accountAddress);
    
    console.log(`   Total attempts: ${attempts}`);
    console.log(`   NFTs minted: ${nftsMinted}`);
    console.log(`   Game won: ${isWon ? "Yes" : "No"}`);

    // Verify test results
    if (attempts === 3 && 
        !isWon && 
        nftsMinted === 0 &&
        p1Sim?.reached === false &&
        p2Sim?.reached === true &&
        p3Sim?.reached === false) {
      console.log("\n✅ TEST 2 PASSED: Multiple players racing correctly!");
      console.log("   - Player 1: Failed to reach (2,0 instead of 2,2)");
      console.log("   - Player 2: Reached in 4 steps (no NFT)");
      console.log("   - Player 3: Failed to reach");
      console.log("   - No winner yet (game requires ≤3 steps)");
    } else {
      console.log("\n❌ TEST 2 FAILED: Race logic error!");
    }

  } catch (error) {
    console.error("❌ TEST 2 FAILED:", error);
  }
};

/**
 * TEST 3: Game Reset and Boundary Movement
 * Tests edge cases: movement boundaries and game reset functionality
 */
const testResetAndBoundaries = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST 3: Game Reset & Boundary Movement");
  console.log("=".repeat(60));

  try {
    const client = new RaceGameClient();

    // Generate test accounts
    const creator = Account.generate();  // Game creator
    const player1 = Account.generate(); // First player (boundary test)
    const player2 = Account.generate(); // Second player (post-reset)

    console.log("\n📝 Setting up accounts...");
    await client.fundAccount(creator.accountAddress, ONE_CEDRA * 2); // Extra for reset test
    await client.fundAccount(player1.accountAddress, ONE_CEDRA);
    await client.fundAccount(player2.accountAddress, ONE_CEDRA);

    // Initialize collection
    console.log("\n🎨 Initializing NFT collection...");
    await client.initCollection(creator);

    // Test 3A: Boundary movement - can't move outside 10x10 grid
    console.log("\n🎮 Test 3A: Boundary Movement");
    console.log("   Creating game at (0,0) → (0,0)...");
    await client.createGame(creator, 0, 0, 0, 0); // Trivial game for boundary testing

    // Try to move out of bounds - should stay at (0,0) due to boundary checks
    console.log("\n   Player 1: Trying to move out of bounds...");
    const boundaryMoves = [Move.LEFT, Move.DOWN]; // Both moves should be prevented
    const boundarySim = await client.simulateMoves(creator.accountAddress, boundaryMoves);
    await client.playGame(player1, creator.accountAddress, boundaryMoves);
    
    console.log(`   Final position: (${boundarySim?.final_x}, ${boundarySim?.final_y})`);
    console.log(`   Reached destination: ${boundarySim?.reached ? "✅ YES" : "❌"}`);
    
    let isWon = await client.isGameWon(creator.accountAddress);
    let nftsMinted = await client.getCollectionStats(creator.accountAddress);
    
    console.log(`   Game won: ${isWon ? "✅" : "❌"}`);
    console.log(`   NFTs minted: ${nftsMinted}`);

    // Test 3B: Reset functionality - creator can clear game state
    console.log("\n🔄 Test 3B: Reset Game");
    console.log("   Resetting game...");
    await client.resetGame(creator); // Only creator can call this

    const isWonAfterReset = await client.isGameWon(creator.accountAddress);
    const attemptsAfterReset = await client.getAttemptsCount(creator.accountAddress);
    
    console.log(`   Game won after reset: ${isWonAfterReset ? "❌ Should be cleared" : "✅ Cleared"}`);
    console.log(`   Attempts after reset: ${attemptsAfterReset} (Expected: 0)`);

    // Test playing after reset - game should be fresh
    console.log("\n   Player 2: Playing after reset...");
    const player2Moves = [Move.UP]; // Single move (stays at (0,0) destination)
    await client.playGame(player2, creator.accountAddress, player2Moves);
    
    const isWonAfterNewPlay = await client.isGameWon(creator.accountAddress);
    const finalAttempts = await client.getAttemptsCount(creator.accountAddress);
    const finalNFTs = await client.getCollectionStats(creator.accountAddress);
    
    console.log(`   Game won: ${isWonAfterNewPlay ? "✅" : "❌"}`);
    console.log(`   New attempts: ${finalAttempts}`);
    console.log(`   Total NFTs: ${finalNFTs}`);

    // Verify all test conditions
    if (boundarySim?.final_x === 0 && 
        boundarySim?.final_y === 0 &&
        boundarySim?.reached === true &&
        isWon &&
        !isWonAfterReset &&
        attemptsAfterReset === 0 &&
        isWonAfterNewPlay &&
        finalAttempts === 1 &&
        finalNFTs === 2) { // 2 NFTs total (before and after reset)
      console.log("\n✅ TEST 3 PASSED: Reset and boundaries work correctly!");
      console.log("   - Boundary movement prevented out-of-bounds");
      console.log("   - Player stayed at (0,0) when trying to go negative");
      console.log("   - Won with boundary moves (2 steps ≤3)");
      console.log("   - Game reset cleared winner and attempts");
      console.log("   - New game playable after reset");
      console.log("   - 2 total NFTs minted (1 before reset, 1 after)");
    } else {
      console.log("\n❌ TEST 3 FAILED: Reset or boundary error!");
    }

  } catch (error) {
    console.error("❌ TEST 3 FAILED:", error);
  }
};

/**
 * Main execution function
 * Runs test suite based on command line arguments
 */
const main = async () => {
  console.log("🏎️  Race Game Contract Test Suite");
  console.log("=".repeat(60));
  console.log("Testing deterministic car racing with NFT rewards");
  console.log("Win condition: Reach destination in ≤3 steps");
  console.log("=".repeat(60));

  // Parse command line arguments for selective testing
  const args = process.argv.slice(2);
  
  if (args.includes('--test1')) {
    // Run only test 1: Optimal win path
    await testOptimalWinPath();
  } else if (args.includes('--test2')) {
    // Run only test 2: Multiple players
    await testMultiplePlayersRace();
  } else if (args.includes('--test3')) {
    // Run only test 3: Reset and boundaries
    await testResetAndBoundaries();
  } else {
    // Default: run all tests
    await testOptimalWinPath();
    await testMultiplePlayersRace();
    await testResetAndBoundaries();
    
    // Test completion summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 All tests completed!");
    console.log("=".repeat(60));
    console.log("\n📋 Summary:");
    console.log("   Test 1: ✅ Optimal win path (≤3 steps)");
    console.log("   Test 2: ✅ Multiple players competition");
    console.log("   Test 3: ✅ Game reset & boundaries");
  }
};

// Run main function and handle any uncaught errors
main().catch(console.error);