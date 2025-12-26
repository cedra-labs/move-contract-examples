
# English Auction Contract

A comprehensive NFT English auction system built on Cedra blockchain with Move smart contracts and a TypeScript/React frontend. This contract enables competitive bidding where the highest bidder wins, with automatic refunds and anti-sniping protection.

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
- ✅ **Ascending Price Auction**: Competitive bidding drives price up
- ✅ **Automatic Refunds**: Previous bidders instantly refunded when outbid
- ✅ **Anti-Sniping Protection**: 5-minute time extension for bids in last 5 minutes
- ✅ **Seller Cancellation**: Cancel auction if no bids received

### Additional Features
- 📊 **View Functions**: Queries for auction data and current bids
- 🎨 **Modern Frontend**: Full-featured React UI with live bidding and countdown
- 🔒 **Security**: Atomic NFT escrow and payment transfers
- ⚡ **Efficient Storage**: O(1) auction lookups using Move Table
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🔔 **Event Emissions**: Track all auction activities on-chain

## 🏗 Architecture

### Smart Contract Components

```
AuctionState (Global)
├── next_auction_id: u64
└── auction_objects: Table<u64, Object<AuctionObject>>

AuctionObject (Per-Auction)
├── auction_id: u64
├── seller: address
├── nft: Object<Token>         // NFT held in escrow
├── starting_price: u64
├── current_highest_bid: u64
├── current_highest_bidder: address
├── start_time: u64
├── end_time: u64
├── duration: u64
├── payment_token: Object<Metadata>
├── is_finalized: bool
└── extend_ref: ExtendRef       // For NFT transfers
```

### Bidding Mechanics

**Minimum Bid Rules:**
- First bid: Must be >= starting_price
- Subsequent bids: Must be >= current_highest_bid + 1

**Anti-Sniping Protection:**
```
If bid placed in last 5 minutes:
  new_end_time = current_time + 5 minutes
```

**Example Timeline:**
```
Time: 0:00 - Auction created (ends at 1:00:00)
Time: 0:30 - Alice bids 1.0 CEDRA
Time: 0:57 - Bob bids 2.0 CEDRA (3 min left)
  → Auction extended to 1:02:00 (5 more minutes)
Time: 1:01 - Charlie bids 3.0 CEDRA (1 min left)
  → Auction extended to 1:06:00 (5 more minutes)
Time: 1:06 - Auction ends, Charlie wins
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── home.tsx (Browse all auctions)
│   │   └── create.tsx (Create new auction)
│   ├── components/
│   │   ├── AuctionCard.tsx (Auction display with bidding UI)
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
cd "English Auction Contract"
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
INCLUDING DEPENDENCY CedraTokenObjects
INCLUDING DEPENDENCY MoveStdlib
BUILDING english_auction
{
  "Result": ["a70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::english_auction"]
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
cedra move test --filter test_normal_auction_flow
```

### Test Coverage

Our test suite includes **13 comprehensive tests** covering:

1. **Auction Creation Tests** (1 test)
   - Successful auction creation
   - Initial auction state validation

2. **Bidding Tests** (3 tests)
   - Normal auction flow with single bidder
   - Multiple bidders with automatic refunds
   - Time extension (anti-sniping mechanism)

3. **Finalization Tests** (2 tests)
   - Successful finalization after auction ends
   - Failed finalization without bids

4. **Cancellation Tests** (2 tests)
   - Seller cancellation with no bids
   - Failed cancellation with bids

5. **Error Handling Tests** (5 tests)
   - Bid too low (below starting price)
   - Bid below current highest bid
   - Bid after auction ended
   - Finalize already finalized auction
   - Finalize before auction ended
   - Cancel by non-seller

**Expected Test Output:**
```
Running Move unit tests
[ PASS    ] 0x1337::english_auction_test::test_create_auction
[ PASS    ] 0x1337::english_auction_test::test_normal_auction_flow
[ PASS    ] 0x1337::english_auction_test::test_multiple_bidders
...
Test result: OK. Total tests: 13; passed: 13; failed: 0
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
https://cedrascan.com/account/0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da/modules/packages/english_auction?network=testnet
```

### 4. Configure Frontend

The frontend is already configured with the deployed contract address in `frontend/src/utils/contract.ts`:

```typescript
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'english_auction'
```

## 💻 Frontend Usage

### Home Dashboard (`/`)

**Features:**
1. **Browse All Auctions** - View active and ended auctions
2. **Live Bidding** - Place bids with real-time updates
3. **Auto-refresh** - Updates every 5 seconds
4. **Filter Tabs** - Filter by All, Active, Ended, or My Auctions
5. **Statistics Overview** - Total, active, ended, and your auctions
6. **Finalize Button** - Anyone can finalize ended auctions
7. **Cancel Button** - Sellers can cancel auctions with no bids

**User Flow:**
```
1. Connect Wallet → 2. Browse Auctions → 3. Click Place Bid → 4. Enter Amount → 5. Approve Transaction
```

### Create Auction Page (`/create`)

**Features:**
1. **NFT Input** - Enter your NFT Object address
2. **Price Configuration** - Set starting price (reserve price)
3. **Duration Setting** - Set auction duration in seconds
4. **Payment Token** - Specify payment token metadata (default: CEDRA)
5. **Validation** - Real-time validation of inputs
6. **Tips & Examples** - Helpful guidance for auction configuration

**User Flow:**
```
1. Connect Wallet → 2. Navigate to /create → 3. Enter NFT & Price → 4. Submit → 5. Approve Transaction
```

### How to Find Your NFT Object Address

To create an auction, you need the NFT's **Object Address**. Follow these steps to find it:

**Step 1: Go to Cedrascan**
- Navigate to [https://cedrascan.com/](https://cedrascan.com/)

**Step 2: Search Your Wallet Address**
- Enter your wallet address in the search bar
- Press Enter to load your account

**Step 3: Navigate to Tokens Tab**
- Once your account page loads, click on the **"Tokens"** tab
- You'll see a list of all NFTs you own

**Step 4: Select Your NFT**
- Browse through your NFT collection
- Click on the NFT you want to auction

**Step 5: Find the Token ID**
- On the NFT details page, look for the **"Overview"** tab
- Under this section, you'll see the **Token ID**
- Click on the Token ID to open the token object view page

**Step 6: Copy the Object Address**
- On the token object view page, you'll see the **Object Address**
- Copy this address (it should start with `0x...`)
- Paste this address into the "NFT Object Address" field when creating your auction

**Visual Example:**
```
Cedrascan → Search: 0xYourWalletAddress → Tokens Tab → Select NFT → 
Overview Tab → Token ID (click) → Copy Object Address (0x...)
```

**Important Notes:**
- The Object Address is different from your wallet address
- Make sure you own the NFT before trying to create an auction
- You must have the NFT in your wallet (not staked or locked elsewhere)

## 📚 Smart Contract API

### Entry Functions (Write Operations)

#### `create_auction(seller: &signer, nft: Object<Token>, starting_price: u64, duration: u64, payment_token: Object<Metadata>)`

Creates a new English auction for an NFT.

**Parameters:**
- `seller`: Signer reference (transaction sender)
- `nft`: The NFT token object to auction
- `starting_price`: Minimum bid amount in octas (must be > 0)
- `duration`: Auction duration in seconds (must be > 0)
- `payment_token`: Fungible asset metadata for payment

**Effects:**
- Transfers NFT from seller to auction object (escrow)
- Emits `AuctionCreated` event

**Errors:**
- `E_INVALID_PRICE` (5): starting_price must be > 0
- `E_INVALID_DURATION` (7): duration must be > 0

**Example:**
```move
english_auction::create_auction(
    seller,
    my_nft,
    100_000_000,  // 1.0 CEDRA (8 decimals)
    3600,         // 1 hour
    cedra_fa_metadata
);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: englishAuctionClient.getFunction('create_auction'),
    functionArguments: [
      nftAddress,
      startingPriceOctas.toString(),
      duration.toString(),
      paymentTokenAddress
    ],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `place_bid(bidder: &signer, auction_id: u64, amount: u64)`

Place a bid on an active auction.

**Parameters:**
- `bidder`: Signer reference (transaction sender)
- `amount`: ID of the auction
- `amount`: Bid amount in octas (must be >= current_bid + 1 or >= starting_price)

**Effects:**
- Transfers payment from bidder to auction object
- Refunds previous highest bidder (if any)
- Extends auction time if bid is in last 5 minutes
- Emits `BidPlaced` event

**Errors:**
- `E_AUCTION_NOT_FOUND` (2): Invalid auction ID
- `E_BID_TOO_LOW` (6): Bid amount too low
- `E_AUCTION_NOT_ENDED` (8): Auction has ended

**Example:**
```move
// Place bid of 1.5 CEDRA
english_auction::place_bid(bidder, 1, 150_000_000);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: englishAuctionClient.getFunction('place_bid'),
    functionArguments: [auctionId.toString(), bidAmountOctas.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `finalize_auction(auction_id: u64)`

Finalize an ended auction (anyone can call).

**Parameters:**
- `auction_id`: ID of the auction to finalize

**Effects:**
- Transfers NFT from auction object to highest bidder
- Transfers payment from auction object to seller
- Marks auction as finalized
- Emits `AuctionFinalized` event

**Errors:**
- `E_AUCTION_NOT_FOUND` (2): Invalid auction ID
- `E_AUCTION_NOT_ENDED` (8): Auction hasn't ended yet
- `E_NO_BIDS` (9): No bids placed on auction
- `E_AUCTION_ALREADY_FINALIZED` (3): Already finalized

**Example:**
```move
english_auction::finalize_auction(1);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: englishAuctionClient.getFunction('finalize_auction'),
    functionArguments: [auctionId.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `cancel_auction(seller: &signer, auction_id: u64)`

Cancel an auction with no bids (seller only).

**Parameters:**
- `seller`: Signer reference (must be auction creator)
- `auction_id`: ID of the auction to cancel

**Effects:**
- Returns NFT from auction object to seller
- Marks auction as finalized (prevents further operations)
- Emits `AuctionCancelled` event

**Errors:**
- `E_AUCTION_NOT_FOUND` (2): Invalid auction ID
- `E_NOT_SELLER` (4): Caller is not the auction creator
- `E_NO_BIDS` (9): Cannot cancel auction with bids

**Example:**
```move
english_auction::cancel_auction(seller, 1);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: englishAuctionClient.getFunction('cancel_auction'),
    functionArguments: [auctionId.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

### View Functions (Read Operations)

#### `get_current_bid(auction_id: u64): u64`

Get the current highest bid amount.

**Parameters:**
- `auction_id`: ID of the auction to query

**Returns:** `u64` - Current highest bid in payment token units (octas), or 0 if no bids

**Example:**
```move
let current_bid = english_auction::get_current_bid(1);
// Returns: 150_000_000 (1.5 CEDRA)
```

**Frontend Usage:**
```typescript
const currentBid = await englishAuctionClient.getCurrentBid(auctionId)
// Returns: number (in octas)
```

---

#### `auction_exists(auction_id: u64): bool`

Check if an auction exists.

**Parameters:**
- `auction_id`: ID of the auction to check

**Returns:** `bool`
- `true` if auction exists
- `false` if auction doesn't exist

**Example:**
```move
if (english_auction::auction_exists(1)) {
    // Auction exists - safe to query or bid
};
```

**Frontend Usage:**
```typescript
const exists = await englishAuctionClient.auctionExists(auctionId)
```

---

#### `get_auction_info(auction_id: u64): (address, Object<Token>, u64, u64, address, u64, u64, u64, bool)`

Get complete auction details.

**Parameters:**
- `auction_id`: ID of the auction to query

**Returns:** Tuple with:
- `seller: address` - Auction creator address
- `nft: Object<Token>` - NFT token object
- `starting_price: u64` - Starting/reserve price
- `current_highest_bid: u64` - Current highest bid
- `current_highest_bidder: address` - Current highest bidder address
- `start_time: u64` - Auction start timestamp
- `end_time: u64` - Auction end timestamp
- `duration: u64` - Auction duration in seconds
- `is_finalized: bool` - Whether auction is completed

**Example:**
```move
let (seller, nft, start, bid, bidder, start_t, end_t, dur, finalized) = 
    english_auction::get_auction_info(1);
```

**Frontend Usage:**
```typescript
const info = await englishAuctionClient.getAuctionInfo(auctionId)
// Returns: AuctionInfo object
```

---

## 🛡 Security Features

Our English auction system includes multiple layers of security:

### 1. **NFT Escrow with Object Pattern**

```move
// Create dedicated object to hold NFT
let constructor_ref = object::create_object(@module_addr);
let auction_object_signer = object::generate_signer(&constructor_ref);
let extend_ref = object::generate_extend_ref(&constructor_ref);

// Transfer NFT to auction object
object::transfer(seller, nft, auction_object_addr);
```

NFTs are held in a dedicated object during auction, not in a shared resource.

### 2. **Atomic Refunds and Transfers**

```move
// All happens in one transaction - atomic
if (auction.current_highest_bid > 0) {
    // Refund previous bidder
    primary_fungible_store::transfer(&auction_obj_signer, payment_token, previous_bidder, previous_bid);
}
// New bid payment
primary_fungible_store::transfer(bidder, payment_token, auction_obj_addr, amount);
```

### 3. **Anti-Sniping Protection**

```move
// Extend auction if bid comes in last 5 minutes
let time_remaining = auction.end_time - now;
if (time_remaining < TIME_EXTENSION_SECONDS) {
    auction.end_time = now + TIME_EXTENSION_SECONDS;
}
```

### 4. **Strict Bid Validation**

```move
let min_bid = if (auction.current_highest_bid > 0) {
    auction.current_highest_bid + 1
} else {
    auction.starting_price
};
assert!(amount >= min_bid, error::invalid_argument(E_BID_TOO_LOW));
```

### 5. **Access Control**

```move
assert!(auction.seller == seller_addr, error::permission_denied(E_NOT_SELLER));
```

Only the original seller can cancel their auction.

### 6. **State Consistency**

```move
assert!(!auction.is_finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
```

Prevents double finalization and ensures auction state integrity.

### 7. **Instant Refunds**

Previous bidders are automatically refunded when outbid - no separate claim function needed.

## 📁 Project Structure

```
English Auction Contract/
│
├── contract/                        # Smart contract directory
│   ├── sources/
│   │   └── english_auction.move     # Main auction contract (397 lines)
│   ├── tests/
│   │   └── english_auction_test.move # Test suite (428 lines, 13 tests)
│   ├── Move.toml                    # Package configuration
│   ├── .cedra/
│   │   └── config.yaml              # Deployment configuration
│   └── build/                       # Compiled artifacts (generated)
│
├── frontend/                        # React TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── home.tsx            # Browse auctions dashboard (300+ lines)
│   │   │   └── create.tsx          # Create auction page (320+ lines)
│   │   ├── components/
│   │   │   ├── AuctionCard.tsx     # Auction display with bidding (330+ lines)
│   │   │   └── WalletSelectorModal.tsx  # Wallet connection UI
│   │   ├── contexts/
│   │   │   ├── WalletProvider.tsx  # Wallet state management
│   │   │   └── useWallet.tsx       # Wallet hook
│   │   ├── utils/
│   │   │   └── contract.ts         # English auction client (210+ lines)
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

Edit `contract/sources/english_auction.move`:

```move
// Time extension for anti-sniping (5 minutes)
const TIME_EXTENSION_SECONDS: u64 = 300;

// Error codes are fixed for consistency
const E_NOT_INITIALIZED: u64 = 1;
const E_AUCTION_NOT_FOUND: u64 = 2;
// ... more error codes
```

### Frontend Configuration

Edit `frontend/src/utils/contract.ts`:

```typescript
// Contract address (deployed on testnet)
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'english_auction'

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
VITE_MODULE_NAME=english_auction
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

**Issue:** Bid fails with `E_BID_TOO_LOW`
```
Solution: 
1. Check current highest bid
2. Your bid must be at least current_bid + 1
3. If no bids, must be >= starting_price
```

**Issue:** Cannot finalize auction
```
Solution:
1. Ensure auction has ended (check end_time)
2. Verify at least one bid was placed
3. Check auction is not already finalized
```

**Issue:** Cannot cancel auction
```
Solution:
1. Only seller can cancel
2. Cannot cancel if bids have been placed
3. Cannot cancel if already finalized
```

## 📝 Error Codes Reference

| Code | Name | Description | User Action |
|------|------|-------------|-------------|
| 1 | `E_NOT_INITIALIZED` | Contract not initialized | Contact admin |
| 2 | `E_AUCTION_NOT_FOUND` | Auction doesn't exist | Check auction ID |
| 3 | `E_AUCTION_ALREADY_FINALIZED` | Auction completed | Cannot bid/cancel |
| 4 | `E_NOT_SELLER` | Not auction creator | Only seller can cancel |
| 5 | `E_INVALID_PRICE` | starting_price ≤ 0 | Set price > 0 |
| 6 | `E_BID_TOO_LOW` | Bid amount too low | Increase bid amount |
| 7 | `E_INVALID_DURATION` | Duration is zero | Set duration > 0 |
| 8 | `E_AUCTION_NOT_ENDED` | Auction still active | Wait for auction to end |
| 9 | `E_NO_BIDS` | No bids placed | Cannot finalize/cancel |
| 10 | `E_NOT_BIDDER` | Not the bidder | Only bidder can claim |
| 11 | `E_ALREADY_REFUNDED` | Already refunded | Refund already processed |

## 🔗 Resources

- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Guide](https://move-language.github.io/move/)
- [Cedra GitHub](https://github.com/cedra-labs)
- [Testnet Explorer](https://cedrascan.com)
- [Testnet Faucet](https://faucet.cedra.dev)
