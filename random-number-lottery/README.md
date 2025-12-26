# Random Number Lottery Contract

A comprehensive lottery system built on Cedra blockchain with Move smart contracts and a TypeScript/React frontend. This contract enables fair and transparent lotteries using timestamp-based randomness, where participants buy tickets and a winner is randomly selected after the lottery ends.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Frontend Usage](#frontend-usage)
- [Smart Contract API](#smart-contract-api)
- [Security Features](#security-features)
- [Project Structure](#project-structure)

## ✨ Features

### Core Functionality
- ✅ **Fair Randomness**: Timestamp-based pseudo-random winner selection
- ✅ **Automatic Prize Pool**: All ticket sales accumulate in prize pool
- ✅ **Instant Payout**: Winner receives entire prize pool automatically
- ✅ **Permissionless Draw**: Anyone can trigger winner draw after lottery ends

### Additional Features
- 📊 **View Functions**: Queries for lottery data and participant information
- 🎨 **Modern Frontend**: Full-featured React UI with live countdown and stats
- 🔒 **Security**: Atomic prize pool management using FungibleStore
- ⚡ **Efficient Storage**: O(1) lottery lookups using Move Table
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🔔 **Event Emissions**: Track all lottery activities on-chain

## 🏗 Architecture

### Smart Contract Components

```
LotteryState (Global)
├── next_lottery_id: u64
└── lottery_objects: Table<u64, address>

LotteryObject (Per-Lottery)
├── lottery_id: u64
├── organizer: address
├── ticket_price: u64
├── end_time: u64
├── participants: vector<address>
├── winner: address
├── is_drawn: bool
├── payment_token: Object<Metadata>
├── prize_store: Object<FungibleStore>  // Holds prize pool
└── extend_ref: ExtendRef               // For prize transfers
```

### Randomness Formula

```
random_seed = generate_random_seed(lottery_id, timestamp, participant_count)
winner_index = random_seed % participant_count
```

**Random Seed Generation:**
```move
seed = lottery_id
seed = (seed * 31 + timestamp) % 0xFFFFFFFF
seed = (seed * 31 + participant_count) % 0xFFFFFFFF
// Additional mixing for better distribution
seed = seed ^ (seed >> 16)
seed = (seed * 1103515245 + 12345) % 0xFFFFFFFF
// ... more mixing operations
```

**Example:**
- Lottery ID: 1 | End Time: 1234567890 | Participants: 50
- Random Seed: 3847562910 (deterministic but unpredictable before draw)
- Winner Index: 3847562910 % 50 = 10
- Winner: participants[10]

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── home.tsx (Browse all lotteries)
│   │   └── create.tsx (Create new lottery)
│   ├── components/
│   │   ├── LotteryCard.tsx (Lottery display with live countdown)
│   │   └── WalletSelectorModal.tsx (Wallet connection UI)
│   ├── contexts/
│   │   ├── WalletProvider.tsx (Wallet state management)
│   │   └── useWallet.tsx (Wallet hook)
│   └── utils/
│       └── contract.ts (Blockchain interaction layer)
```

## 📦 Prerequisites

### For Smart Contract Development
- **Cedra CLI**: Install from [Cedra Installation Guide](https://docs.cedra.dev/cli-tools/install-cedra-cli)
- **Move Compiler**: Included with Cedra CLI
- **Git**: For cloning dependencies

### For Frontend Development
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Cedra Wallet**: Browser extension for testing (Zedra Wallet recommended)

### System Requirements
- Windows, macOS, or Linux
- Internet connection for package downloads
- Testnet account with tokens for testing

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd "random-number-lottery"
```

### 2. Smart Contract Setup

```bash
cd contract

# Initialize Cedra if not done already
cedra init

# Compile the contract
cedra move compile --dev
```

**Expected Output:**
```
Compiling, may take a little while to download git dependencies...
INCLUDING DEPENDENCY CedraFramework
INCLUDING DEPENDENCY CedraStdlib
INCLUDING DEPENDENCY MoveStdlib
BUILDING lottery
{
  "Result": ["a70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::lottery"]
}
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 🧪 Testing

### Run Smart Contract Tests

```bash
cd contract

# Run all tests
cedra move test

# Run tests with verbose output
cedra move test --verbose

# Run specific test
cedra move test --filter test_create_lottery
```

### Test Coverage

Our test suite includes **8 comprehensive tests** covering:

1. **Lottery Creation Tests** (1 test)
   - Successful lottery creation
   - Initial lottery state validation

2. **Ticket Purchase Tests** (2 tests)
   - Single participant ticket purchase
   - Multiple participants buying tickets
   - Prize pool accumulation

3. **Winner Draw Tests** (2 tests)
   - Successful winner draw with participants
   - Prize transfer to winner
   - Random seed generation

4. **Error Handling Tests** (3 tests)
   - Cannot buy ticket after lottery ends
   - Cannot draw winner before lottery ends
   - Cannot draw winner without participants
   - Cannot draw winner twice

**Expected Test Output:**
```
Running Move unit tests
[ PASS    ] 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::lottery_test::test_create_lottery
[ PASS    ] 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::lottery_test::test_buy_ticket
[ PASS    ] 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::lottery_test::test_draw_winner
...
Test result: OK. Total tests: 8; passed: 8; failed: 0
```

## 📤 Deployment

### 1. Prepare for Deployment

```bash
cd contract

# Ensure you have a funded account
cedra account fund-with-faucet
```

### 2. Deploy to Testnet

```bash
# Publish with named addresses
cedra move publish --named-addresses module_addr=<youraddress>
```

**Example:**
```bash
# The contract is already deployed at:
# 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da
```

### 3. Verify Deployment

```bash
# Check the deployed contract on the explorer
https://cedrascan.com/account/0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da/modules/packages/lottery?network=testnet
```

### 4. Configure Frontend

The frontend is already configured with the deployed contract address in `frontend/src/utils/contract.ts`:

```typescript
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'lottery'
```

## 💻 Frontend Usage

### Home Dashboard (`/`)

**Features:**
1. **Browse All Lotteries** - View active and ended lotteries
2. **Live Countdown** - Real-time countdown to lottery end
3. **Auto-refresh** - Updates every 5 seconds
4. **Filter Tabs** - Filter by All, Active, Ended, or My Lotteries
5. **Statistics Overview** - Total, active, ended, and your lotteries
6. **Buy Tickets** - Purchase tickets for active lotteries
7. **Draw Winner** - Anyone can draw winner after lottery ends

**User Flow:**
```
1. Connect Wallet → 2. Browse Lotteries → 3. Click Buy Ticket → 4. Approve Transaction → 5. Wait for Draw
```

### Create Lottery Page (`/create`)

**Features:**
1. **Ticket Price Input** - Set price per ticket in CEDRA
2. **Duration Setting** - Set lottery duration in seconds
3. **Payment Token** - Specify payment token metadata (default: CEDRA)
4. **Validation** - Real-time validation of inputs
5. **Duration Display** - Live conversion to days/hours/minutes
6. **Tips & Examples** - Helpful guidance for lottery configuration

**User Flow:**
```
1. Connect Wallet → 2. Navigate to /create → 3. Enter Price & Duration → 4. Submit → 5. Approve Transaction
```

## 📚 Smart Contract API

### Entry Functions (Write Operations)

#### `create_lottery(organizer: &signer, ticket_price: u64, duration: u64, payment_token: Object<Metadata>)`

Creates a new lottery with specified parameters.

**Parameters:**
- `organizer`: Signer reference (transaction sender)
- `ticket_price`: Price per ticket in octas (must be > 0)
- `duration`: Lottery duration in seconds (must be > 0)
- `payment_token`: Fungible asset metadata for payment

**Effects:**
- Creates lottery object with prize store
- Emits `LotteryCreated` event

**Errors:**
- `E_INVALID_TICKET_PRICE` (5): ticket_price must be > 0

**Example:**
```move
lottery::create_lottery(
    organizer,
    1_000_000,    // 0.01 CEDRA (8 decimals)
    86400,        // 1 day
    cedra_fa_metadata
);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: lotteryClient.getFunction('create_lottery'),
    functionArguments: [
      ticketPriceOctas.toString(),
      durationSeconds.toString(),
      paymentTokenAddress
    ],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `buy_ticket(participant: &signer, lottery_id: u64, lottery_obj_addr: address)`

Purchase a ticket for a lottery.

**Parameters:**
- `participant`: Signer reference (transaction sender)
- `lottery_id`: ID of the lottery
- `lottery_obj_addr`: Address of the lottery object

**Effects:**
- Transfers ticket price from participant to lottery prize store
- Adds participant to lottery participants list
- Emits `TicketPurchased` event

**Errors:**
- `E_LOTTERY_NOT_FOUND` (2): Invalid lottery ID or address
- `E_LOTTERY_ALREADY_DRAWN` (3): Lottery already completed
- `E_LOTTERY_ENDED` (8): Lottery has ended
- `E_INSUFFICIENT_PAYMENT` (9): Participant lacks sufficient funds

**Example:**
```move
lottery::buy_ticket(participant, 1, lottery_obj_addr);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: lotteryClient.getFunction('buy_ticket'),
    functionArguments: [lotteryId.toString(), lotteryObjAddr],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `draw_winner(lottery_id: u64, lottery_obj_addr: address)`

Draw the winner using timestamp-based randomness (anyone can call after lottery ends).

**Parameters:**
- `lottery_id`: ID of the lottery
- `lottery_obj_addr`: Address of the lottery object

**Effects:**
- Generates random seed from lottery data and timestamp
- Selects winner from participants list
- Transfers entire prize pool to winner
- Marks lottery as drawn
- Emits `WinnerDrawn` event

**Errors:**
- `E_LOTTERY_NOT_FOUND` (2): Invalid lottery ID or address
- `E_LOTTERY_ALREADY_DRAWN` (3): Lottery already completed
- `E_LOTTERY_NOT_ENDED` (6): Lottery hasn't ended yet
- `E_NO_PARTICIPANTS` (7): No participants in lottery

**Example:**
```move
lottery::draw_winner(1, lottery_obj_addr);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: lotteryClient.getFunction('draw_winner'),
    functionArguments: [lotteryId.toString(), lotteryObjAddr],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

### View Functions (Read Operations)

#### `get_lottery_address(lottery_id: u64): address`

Get lottery object address by ID.

**Parameters:**
- `lottery_id`: ID of the lottery to query

**Returns:** `address` - Lottery object address

**Example:**
```move
let lottery_addr = lottery::get_lottery_address(1);
```

**Frontend Usage:**
```typescript
const lotteryAddr = await lotteryClient.getLotteryAddress(lotteryId)
```

---

#### `lottery_exists(lottery_obj_addr: address): bool`

Check if a lottery exists.

**Parameters:**
- `lottery_obj_addr`: Address of the lottery object

**Returns:** `bool`
- `true` if lottery exists
- `false` if lottery doesn't exist

**Example:**
```move
if (lottery::lottery_exists(lottery_obj_addr)) {
    // Lottery exists - safe to query or buy ticket
};
```

**Frontend Usage:**
```typescript
const exists = await lotteryClient.lotteryExists(lotteryObjAddr)
```

---

#### `get_lottery_info(lottery_obj_addr: address): (u64, address, u64, u64, u64, u64, address, bool)`

Get complete lottery details.

**Parameters:**
- `lottery_obj_addr`: Address of the lottery object

**Returns:** Tuple with:
- `lottery_id: u64` - Lottery ID
- `organizer: address` - Lottery creator address
- `ticket_price: u64` - Price per ticket
- `end_time: u64` - Lottery end timestamp
- `participant_count: u64` - Number of participants
- `prize_amount: u64` - Current prize pool amount
- `winner: address` - Winner address (0x0 if not drawn)
- `is_drawn: bool` - Whether winner has been drawn

**Example:**
```move
let (id, org, price, end, count, prize, winner, drawn) = 
    lottery::get_lottery_info(lottery_obj_addr);
```

**Frontend Usage:**
```typescript
const info = await lotteryClient.getLotteryInfo(lotteryObjAddr)
// Returns: LotteryInfo object
```

---

#### `get_participant(lottery_obj_addr: address, index: u64): address`

Get participant address at specific index.

**Parameters:**
- `lottery_obj_addr`: Address of the lottery object
- `index`: Index in participants list

**Returns:** `address` - Participant address at index

**Example:**
```move
let participant = lottery::get_participant(lottery_obj_addr, 0);
```

**Frontend Usage:**
```typescript
// Note: This function is available but not commonly used in frontend
// Most participant data is accessed through get_lottery_info
```

---

## 🛡 Security Features

Our lottery system includes multiple layers of security:

### 1. **Prize Pool Escrow with FungibleStore**

```move
// Create dedicated fungible store to hold prize pool
let prize_store = fungible_asset::create_store(&lottery_constructor_ref, payment_token);

// All ticket payments go directly to prize store
let fa = primary_fungible_store::withdraw(participant, payment_token, ticket_price);
fungible_asset::deposit(prize_store, fa);
```

Prize pool is held in a dedicated FungibleStore, not in user accounts.

### 2. **Atomic Prize Transfer**

```move
// All happens in one transaction - atomic
let lottery_signer = object::generate_signer_for_extending(&lottery.extend_ref);
let prize_amount = fungible_asset::balance(lottery.prize_store);
let prize_fa = fungible_asset::withdraw(&lottery_signer, lottery.prize_store, prize_amount);
primary_fungible_store::deposit(winner_addr, prize_fa);
```

### 3. **ExtendRef Pattern for Secure Transfers**

```move
let lottery_signer = object::generate_signer_for_extending(&lottery.extend_ref);
let prize_fa = fungible_asset::withdraw(&lottery_signer, lottery.prize_store, prize_amount);
```

Uses ExtendRef to generate signer for prize transfers from lottery object.

### 4. **Deterministic Randomness**

```move
fun generate_random_seed(lottery_id: u64, timestamp: u64, participant_count: u64): u64 {
    let seed = lottery_id;
    seed = (seed * 31 + timestamp) % 0xFFFFFFFF;
    seed = (seed * 31 + participant_count) % 0xFFFFFFFF;
    // Additional mixing operations...
}
```

Random seed is deterministic but unpredictable before draw time.

### 5. **State Validation**

```move
assert!(!lottery.is_drawn, error::invalid_state(E_LOTTERY_ALREADY_DRAWN));
assert!(now >= lottery.end_time, error::invalid_state(E_LOTTERY_NOT_ENDED));
assert!(vector::length(&lottery.participants) > 0, error::invalid_state(E_NO_PARTICIPANTS));
```

Comprehensive validation prevents invalid operations.

### 6. **Input Validation**

```move
assert!(ticket_price > 0, error::invalid_argument(E_INVALID_TICKET_PRICE));
assert!(now < lottery.end_time, error::invalid_state(E_LOTTERY_ENDED));
```

Ensures all inputs meet requirements before processing.

### 7. **Permissionless Draw**

Anyone can call `draw_winner` after lottery ends - no special permissions required. This prevents organizer from refusing to draw if they don't like the outcome.

## 📁 Project Structure

```
Random Number Lottery/
│
├── contract/                        # Smart contract directory
│   ├── sources/
│   │   └── lottery.move             # Main lottery contract (292 lines)
│   ├── tests/
│   │   └── lottery_test.move        # Test suite (278 lines, 8 tests)
│   ├── Move.toml                    # Package configuration
│   └── build/                       # Compiled artifacts (generated)
│
├── frontend/                        # React TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── home.tsx            # Browse lotteries dashboard (320+ lines)
│   │   │   └── create.tsx          # Create lottery page (340+ lines)
│   │   ├── components/
│   │   │   ├── LotteryCard.tsx     # Lottery display with actions (280+ lines)
│   │   │   └── WalletSelectorModal.tsx  # Wallet connection UI
│   │   ├── contexts/
│   │   │   ├── WalletProvider.tsx  # Wallet state management
│   │   │   └── useWallet.tsx       # Wallet hook
│   │   ├── utils/
│   │   │   └── contract.ts         # Lottery contract client (230+ lines)
│   │   ├── App.tsx                 # Router configuration
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── package.json                # Dependencies
│   └── vite.config.ts              # Vite configuration
│
└── README.md                        # This file (main documentation)
```

## 🔧 Configuration

### Contract Constants

Edit `contract/sources/lottery.move`:

```move
// Error codes are fixed for consistency
const E_NOT_INITIALIZED: u64 = 1;
const E_LOTTERY_NOT_FOUND: u64 = 2;
const E_LOTTERY_ALREADY_DRAWN: u64 = 3;
const E_NOT_ORGANIZER: u64 = 4;
const E_INVALID_TICKET_PRICE: u64 = 5;
const E_LOTTERY_NOT_ENDED: u64 = 6;
const E_NO_PARTICIPANTS: u64 = 7;
const E_LOTTERY_ENDED: u64 = 8;
const E_INSUFFICIENT_PAYMENT: u64 = 9;
```

### Frontend Configuration

Edit `frontend/src/utils/contract.ts`:

```typescript
// Contract address (deployed on testnet)
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'lottery'

// Network configuration
this.client = new Cedra(new CedraConfig({
  network: Network.TESTNET,
  fullnode: 'https://testnet.cedra.dev/v1',
}))
```

### Environment Variables (Optional)

Create `.env` in the `frontend/` directory:

```env
VITE_NETWORK=testnet
VITE_MODULE_ADDRESS=0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da
VITE_MODULE_NAME=lottery
```

## 🐛 Troubleshooting

### Common Issues

**Issue:** `Module not found` error in frontend
```
Solution: Verify MODULE_ADDRESS in frontend/src/utils/contract.ts matches deployed address
```

**Issue:** Tests fail with compilation errors
```
Solution: Run `cedra move compile --dev` first, then `cedra move test`
```

**Issue:** Wallet not connecting
```
Solution: 
1. Ensure Cedra wallet extension is installed
2. Check wallet is on Testnet network
3. Refresh the page and try again
```

**Issue:** Cannot buy ticket
```
Solution:
1. Check lottery hasn't ended yet
2. Verify you have sufficient balance for ticket price + gas
3. Ensure lottery hasn't been drawn already
```

**Issue:** Cannot draw winner
```
Solution:
1. Ensure lottery has ended (check end_time)
2. Verify at least one participant has bought a ticket
3. Check lottery hasn't been drawn already
```

**Issue:** Prize not received
```
Solution:
1. Prize is automatically transferred when draw_winner is called
2. Check your wallet balance after draw
3. Verify you were the selected winner
```

## 📝 Error Codes Reference

| Code | Name | Description | User Action |
|------|------|-------------|-------------|
| 1 | `E_NOT_INITIALIZED` | Contract not initialized | Contact admin |
| 2 | `E_LOTTERY_NOT_FOUND` | Lottery doesn't exist | Check lottery ID/address |
| 3 | `E_LOTTERY_ALREADY_DRAWN` | Lottery completed | Cannot buy/draw |
| 4 | `E_NOT_ORGANIZER` | Not lottery creator | Only organizer can perform action |
| 5 | `E_INVALID_TICKET_PRICE` | ticket_price ≤ 0 | Set price > 0 |
| 6 | `E_LOTTERY_NOT_ENDED` | Lottery still active | Wait for end time |
| 7 | `E_NO_PARTICIPANTS` | No tickets sold | Cannot draw winner |
| 8 | `E_LOTTERY_ENDED` | Lottery has ended | Cannot buy tickets |
| 9 | `E_INSUFFICIENT_PAYMENT` | Buyer lacks funds | Add more funds |

## 🔗 Resources

- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Guide](https://move-language.github.io/move/)
- [Cedra GitHub](https://github.com/cedra-labs)
- [Testnet Explorer](https://cedrascan.com)
- [Testnet Faucet](https://faucet.cedra.dev)
