# 🏎️ Deterministic Car Racing Game on Cedra Blockchain

A competitive racing game built on the Cedra blockchain where players submit movement sequences to navigate from a starting position to a destination. The first player to reach the destination in **3 steps or fewer** wins an NFT reward!

## 📋 Table of Contents

- [Overview](#overview)
- [Game Mechanics](#game-mechanics)
- [Technical Architecture](#technical-architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Contract Deployment](#contract-deployment)
- [Running the Tests](#running-the-tests)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Testing Strategy](#testing-strategy)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 🎮 Overview

The Deterministic Car Racing Game is a blockchain-based puzzle game where:

- **Players compete** to find the optimal path from start to destination
- **Movement is deterministic** - same moves always produce same results
- **Winners earn NFTs** - only if they complete the challenge in ≤3 steps
- **Transparent & Fair** - all game logic runs on-chain with full verification

### Key Features

✅ **Deterministic Movement System** - Predictable, reproducible gameplay  
✅ **NFT Rewards** - Winners receive unique collectible tokens  
✅ **Move Simulation** - Test strategies before committing on-chain  
✅ **Grid-Based Navigation** - 10x10 coordinate system with boundary protection  
✅ **Attempt History** - Track all player attempts and strategies  
✅ **Game Reset** - Creators can reset games for new competitions  

---

## 🎯 Game Mechanics

### Movement System

Players navigate a **10x10 grid** (coordinates 0-9) using four directional moves:

| Move | Value | Effect |
|------|-------|--------|
| **UP** | 1 | Increases Y coordinate by 1 |
| **DOWN** | 2 | Decreases Y coordinate by 1 |
| **LEFT** | 3 | Decreases X coordinate by 1 |
| **RIGHT** | 4 | Increases X coordinate by 1 |

### Win Condition

To win an NFT reward, a player must:

1. ✅ **Reach the destination** - Final position matches target coordinates
2. ✅ **Complete in ≤3 steps** - Use optimal or near-optimal path
3. ✅ **Be the first** - Game must not already have a winner

### Example Game

```
Start: (0, 0)
Destination: (3, 0)

Optimal Solution (3 steps):
→ RIGHT → RIGHT → RIGHT
Result: (3, 0) ✅ WIN + NFT!

Suboptimal Solution (5 steps):
→ RIGHT → LEFT → RIGHT → RIGHT → RIGHT
Result: (3, 0) ❌ Reached but no NFT (too slow)
```

---

## 🏗️ Technical Architecture

### Smart Contract Components

```
race::race (Move Module)
├── GameData          - Individual game state
├── GameAttempts      - Player attempt history
├── CollectionManager - NFT minting tracker
└── View Functions    - Read-only game queries
```

### Client SDK Components

```
RaceGameClient (TypeScript)
├── Game Management
│   ├── initCollection()
│   ├── createGame()
│   ├── playGame()
│   └── resetGame()
├── View Functions
│   ├── getGameInfo()
│   ├── simulateMoves()
│   ├── isGameWon()
│   └── getWinner()
└── Utilities
    ├── fundAccount()
    └── getMoveString()
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js** v18+ and npm/yarn
  ```bash
  node --version  # Should be v18 or higher
  npm --version
  ```

- **TypeScript** v5+
  ```bash
  npm install -g typescript
  tsc --version
  ```

### Development Tools (Optional)

- **Git** - For version control
- **VS Code** - Recommended IDE with Move extension
- **Postman/Insomnia** - For API testing

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
# Clone the project
git clone <repository-url>
cd race-game

# Or if starting fresh, create directory
mkdir race-game && cd race-game
```

### Step 2: Install Dependencies

```bash
# Initialize npm project (if needed)
npm init -y

# Install Cedra TypeScript SDK
npm install @cedra-labs/ts-sdk

# Install TypeScript and type definitions
npm install --save-dev typescript @types/node

# Install additional development dependencies
npm install --save-dev ts-node
```

### Step 3: Project Structure Setup

Create the following directory structure:

```
race-game/
├── contract/
│   ├── Move.toml
│   |── sources/
│   ├   |── race.move          # Main contract
│   └── tests/
|       |── race_tests.move    # Move unit tests
├── client/
│   └── test.ts                # TypeScript test suite
├── package.json
├── tsconfig.json
└── README.md
```

### Step 4: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./client",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["client/**/*"],
  "exclude": ["node_modules"]
}
```

### Step 5: Configure Move Package

Create `move/Move.toml`:

```toml
[package]
name = "race"
version = "1.0.0"
upgrade_policy = "compatible"

[addresses]
race = "_"

[dependencies]
CedraFramework = { git = "https://github.com/cedra-labs/cedra-framework.git", subdir = "cedra-move/framework/cedra-framework", rev = "main" }
CedraTokenObjects = { git = "https://github.com/cedra-labs/cedra-framework.git", subdir = "cedra-move/framework/cedra-token-objects", rev = "main" }

[dev-dependencies]
```

---

## 🚢 Contract Deployment

### Step 1: Initialize Cedra Account

```bash
# Initialize Cedra CLI configuration
cedra init

# Select testnet network when prompted
# Follow prompts to create/import account
```

### Step 2: Fund Your Account

```bash
# Request testnet tokens from faucet
cedra account fund-with-faucet --account default

# Verify balance
cedra account list
```

### Step 3: Compile the Contract

```bash
# Navigate to move directory
cd move

# Compile Move package
cedra move compile

# You should see output like:
# {
#   "Result": [
#     "<address>::race"
#   ]
# }
```

### Step 4: Deploy to Testnet

```bash
# Deploy the compiled module
cedra move publish --named-addresses race=default

# Save the transaction hash and module address from output
# Example output:
# {
#   "Result": {
#     "transaction_hash": "0x...",
#     "gas_used": 1234,
#     "success": true
#   }
# }
```

### Step 5: Update Client Configuration

After deployment, update `MODULE_ADDRESS` in `client/test.ts`:

```typescript
// Replace with your deployed contract address
const MODULE_ADDRESS = "YOUR_DEPLOYED_ADDRESS_HERE";
```

To find your address:
```bash
cedra account list
# Copy the address shown for your account
```

---

## 🧪 Running the Tests

### Move Unit Tests (On-Chain)

Run comprehensive Move tests to verify contract logic:

```bash
# Navigate to move directory
cd move

# Run all Move tests
cedra move test

# Run with verbose output
cedra move test --verbose

# Run specific test
cedra move test --filter test_optimal_win_path

```

**Expected Output:**
```
Running Move unit tests
[PASS] test_init_collection_success
[PASS] test_create_game_success
[PASS] test_play_game_simple_success
[PASS] test_play_game_win_three_steps
[PASS] test_multiple_players_attempts
[PASS] test_complete_game_lifecycle
...
Test result: OK. Total tests: 25; passed: 25; failed: 0
```

### TypeScript Integration Tests

Run end-to-end tests that interact with deployed contract:

```bash
# Navigate to project root
cd ..

# Run all tests
npm run test

# Or use ts-node directly
npx ts-node client/test.ts

# Run specific test suite
npx ts-node client/test.ts --test1  # Optimal path test
npx ts-node client/test.ts --test2  # Multiple players test
npx ts-node client/test.ts --test3  # Reset & boundaries test
```

**Expected Output:**
```
🏎️  Race Game Contract Test Suite
============================================================
Testing deterministic car racing with NFT rewards
============================================================

🧪 TEST 1: Optimal Win Path (≤3 Steps Gets NFT)
============================================================
📝 Setting up accounts...
✅ Funded account 0x123456... with 1 CEDRA
🎨 Initializing NFT collection...
✅ NFT collection initialized successfully!
...
✅ TEST 1 PASSED: Optimal win path works correctly!
```

### Test Coverage

The test suite includes:

| Test Category | Tests | Description |
|--------------|-------|-------------|
| **Collection Tests** | 3 | NFT collection initialization and management |
| **Game Creation** | 4 | Game creation, validation, and constraints |
| **Movement Tests** | 8 | Player moves, win conditions, and boundaries |
| **Reset Tests** | 2 | Game reset and authorization |
| **View Functions** | 4 | Read-only query functions |
| **Integration** | 4 | Complete game lifecycle scenarios |

---

## 💻 Usage Examples

### Example 1: Create and Play a Simple Game

```typescript
import { RaceGameClient } from './client';
import { Account, Network } from "@cedra-labs/ts-sdk";

const main = async () => {
  // Initialize client
  const client = new RaceGameClient(Network.TESTNET);
  
  // Create accounts
  const creator = Account.generate();
  const player = Account.generate();
  
  // Fund accounts
  await client.fundAccount(creator.accountAddress);
  await client.fundAccount(player.accountAddress);
  
  // Initialize NFT collection
  await client.initCollection(creator);
  
  // Create game: (0,0) → (3,0)
  await client.createGame(creator, 0, 0, 3, 0);
  
  // Player attempts optimal path
  const moves = [4, 4, 4]; // RIGHT, RIGHT, RIGHT
  await client.playGame(player, creator.accountAddress, moves);
  
  // Check winner
  const winner = await client.getWinner(creator.accountAddress);
  console.log(`Winner: ${winner}`);
};
```

### Example 2: Simulate Moves Before Playing

```typescript
// Simulate without spending gas
const moves = [4, 1, 4, 1]; // RIGHT, UP, RIGHT, UP
const result = await client.simulateMoves(
  creatorAddress, 
  moves
);

console.log(`Final position: (${result.final_x}, ${result.final_y})`);
console.log(`Reached destination: ${result.reached}`);

// Only submit if simulation succeeds
if (result.reached && moves.length <= 3) {
  await client.playGame(player, creatorAddress, moves);
}
```

### Example 3: Query Game Statistics

```typescript
// Get comprehensive game information
const gameInfo = await client.getGameInfo(creatorAddress);
console.log(`Game ID: ${gameInfo.game_id}`);
console.log(`Start: (${gameInfo.start_x}, ${gameInfo.start_y})`);
console.log(`Destination: (${gameInfo.dest_x}, ${gameInfo.dest_y})`);

// Check attempts
const attempts = await client.getAttemptsCount(creatorAddress);
console.log(`Total attempts: ${attempts}`);

// Check NFT stats
const nfts = await client.getCollectionStats(creatorAddress);
console.log(`NFTs minted: ${nfts}`);
```

### Example 4: Reset and Replay

```typescript
// Creator resets the game
await client.resetGame(creator);

// New player can now compete
const newPlayer = Account.generate();
await client.fundAccount(newPlayer.accountAddress);

const moves = [4, 4, 4];
await client.playGame(newPlayer, creator.accountAddress, moves);
```

---

## 📚 API Reference

### RaceGameClient Class

#### Constructor

```typescript
constructor(
  network?: Network,
  moduleAddress?: string
)
```

**Parameters:**
- `network` - Cedra network (default: `Network.TESTNET`)
- `moduleAddress` - Deployed contract address

#### Methods

##### Game Management

**`initCollection(creator: Account): Promise<string>`**
- Initializes NFT collection for winners
- **Must be called before creating games**
- Returns: Transaction hash

**`createGame(creator, startX, startY, destX, destY): Promise<string>`**
- Creates new racing game
- Coordinates must be 0-9
- Returns: Transaction hash

**`playGame(player, gameCreator, moves): Promise<string>`**
- Submit move sequence (1-10 moves)
- Moves must be valid directions (1-4)
- Returns: Transaction hash

**`resetGame(creator: Account): Promise<string>`**
- Reset game state (creator only)
- Clears winner and attempts
- Returns: Transaction hash

##### View Functions (No Gas Cost)

**`getGameInfo(creator: AccountAddress): Promise<GameInfo>`**
- Returns complete game state
- Includes start, destination, winner, timestamps

**`simulateMoves(creator, moves): Promise<SimulationResult>`**
- Test moves without submitting transaction
- Returns final position and success status

**`isGameWon(creator: AccountAddress): Promise<boolean>`**
- Check if game has winner

**`getWinner(creator: AccountAddress): Promise<string | null>`**
- Get winner's address (null if no winner)

**`getAttemptsCount(creator: AccountAddress): Promise<number>`**
- Get total number of attempts made

**`getCollectionStats(creator: AccountAddress): Promise<number>`**
- Get number of NFTs minted

**`gameExists(creator: AccountAddress): Promise<boolean>`**
- Check if game exists at address

---

## 🧪 Testing Strategy

### Three-Tier Testing Approach

#### 1. Move Unit Tests (`race_tests.move`)
- **Purpose:** Verify contract logic in isolation
- **Coverage:** All functions, error conditions, edge cases
- **Execution:** Fast, deterministic, no network required
- **Command:** `cedra move test`

#### 2. TypeScript Integration Tests (`test.ts`)
- **Purpose:** Test real blockchain interactions
- **Coverage:** End-to-end workflows, multi-player scenarios
- **Execution:** Slower, requires testnet connection
- **Command:** `npx ts-node client/test.ts`

#### 3. Manual Testing
- **Purpose:** User experience validation
- **Coverage:** UI flows, error messages, edge cases
- **Execution:** Interactive testing with real accounts

### Test Scenarios Covered

✅ **Happy Path:** Optimal solution wins NFT  
✅ **Suboptimal Path:** Reaches destination but too slow  
✅ **Failed Attempts:** Wrong direction or missed target  
✅ **Boundary Conditions:** Grid edge movement  
✅ **Authorization:** Only creator can reset  
✅ **Race Conditions:** Multiple players competing  
✅ **State Management:** Game lifecycle from creation to completion  

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue: "Module address not set"
**Solution:**
```typescript
// Update MODULE_ADDRESS in test.ts after deployment
const MODULE_ADDRESS = "0x604e072b..."; // Your deployed address
```

#### Issue: "Insufficient funds" error
**Solution:**
```bash
# Request more testnet tokens
cedra account fund-with-faucet --account default

# Or in TypeScript
await client.fundAccount(accountAddress, ONE_CEDRA * 2);
```

#### Issue: "Game already exists" error
**Solution:**
- Each creator can only have one active game
- Use a different account or reset existing game
```typescript
await client.resetGame(creator);
```

#### Issue: "Invalid move" error
**Solution:**
- Ensure moves are 1-4 (UP=1, DOWN=2, LEFT=3, RIGHT=4)
- Check move sequence length (1-10 moves max)
```typescript
const moves = [4, 4, 4]; // Valid: RIGHT, RIGHT, RIGHT
const invalid = [5, 6, 7]; // Invalid: not 1-4
```

#### Issue: Move tests fail to compile
**Solution:**
```bash
# Update dependencies
cd move
cedra move clean
cedra move compile

# If still failing, check Move.toml has correct dependency versions
```

#### Issue: TypeScript compilation errors
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check tsconfig.json is properly configured
```

---

## 📊 Performance Metrics

### Gas Costs (Approximate)

| Operation | Gas Units | CEDRA Cost |
|-----------|-----------|------------|
| Init Collection | ~500 | ~0.0005 |
| Create Game | ~300 | ~0.0003 |
| Play Game | ~400 | ~0.0004 |
| Reset Game | ~200 | ~0.0002 |
| View Functions | 0 | Free |

### Scalability

- **Games per second:** ~1000 (network dependent)
- **Concurrent players:** Unlimited
- **Max moves per attempt:** 10
- **Grid size:** 10x10 (expandable)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`cedra move test && npm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🎓 Additional Resources

### Documentation
- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Book](https://move-language.github.io/move/)
- [TypeScript SDK Reference](https://cedra.dev/ts-sdk)

### Community
- [Discord](https://discord.gg/cedra)
- [GitHub Issues](https://github.com/cedra-labs/race-game/issues)
- [Forum](https://forum.cedra.dev)

### Related Projects
- [Cedra Framework](https://github.com/cedra-labs/cedra-framework)
- [Move Examples](https://github.com/move-language/move/tree/main/language/documentation/examples)

---

## 🏆 Credits

**Author:** COAT  
**Blockchain:** Cedra Testnet  
**Language:** Move & TypeScript  
**SDK:** @cedra-labs/ts-sdk  

---

**Built with ❤️ for the Cedra blockchain community**