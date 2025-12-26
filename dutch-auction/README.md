# Dutch Auction Contract

A comprehensive NFT Dutch auction system built on Cedra blockchain with Move smart contracts and a TypeScript/React frontend. This contract enables sellers to list NFTs with descending prices, where the first buyer to accept the current price wins the NFT.

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
- ✅ **Dutch Auction Mechanism**: Price decreases linearly from start to end price over time
- ✅ **Instant Settlement**: First buyer to accept current price wins immediately
- ✅ **Seller Cancellation**: Sellers can cancel unsold auctions and reclaim NFT
- ✅ **Real-time Pricing**: Live price updates calculated from elapsed time

### Additional Features
- 📊 **View Functions**: Queries for auction data and current prices
- 🎨 **Modern Frontend**: Full-featured React UI with live countdown and price tracking
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
├── start_price: u64
├── end_price: u64
├── start_time: u64
├── duration: u64
├── payment_token: Object<Metadata>
├── is_sold: bool
└── extend_ref: ExtendRef       // For NFT transfers
```

### Price Decay Formula

```
current_price = start_price - ((start_price - end_price) * elapsed_time / duration)

After duration expires: current_price = end_price
```

**Example:**
- Start: 1.0 CEDRA | End: 0.1 CEDRA | Duration: 3600s (1 hour)
- At 0s → 1.0 CEDRA
- At 1800s (30min) → 0.55 CEDRA
- At 3600s+ → 0.1 CEDRA

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── home.tsx (Browse all auctions)
│   │   └── create.tsx (Create new auction)
│   ├── components/
│   │   ├── AuctionCard.tsx (Auction display with live countdown)
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
cd "Dutch Auction Contract"
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
BUILDING dutch_auction
{
  "Result": ["a70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::dutch_auction"]
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
cedra move test --filter test_price_at_start
```

### Test Coverage

Our test suite includes **12 comprehensive tests** covering:

1. **Price Calculation Tests** (4 tests)
   - Price at auction start (should equal start_price)
   - Price at midpoint (should equal average)
   - Price at end of duration (should equal end_price)
   - Price after duration expires (should stay at end_price)

2. **Purchase Flow Tests** (3 tests)
   - Successful purchase at start price
   - Purchase at reduced price (after time passes)
   - Payment correctly transferred to seller
   - NFT correctly transferred to buyer

3. **Cancellation Tests** (2 tests)
   - Seller can cancel unsold auction
   - NFT returned to seller on cancellation

4. **Error Handling Tests** (3 tests)
   - Cannot buy already sold auction
   - Cannot cancel after sold
   - Non-seller cannot cancel
   - Invalid price parameters rejected
   - Zero duration rejected

**Expected Test Output:**
```
Running Move unit tests
[ PASS    ] 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::dutch_auction_test::test_price_at_start
[ PASS    ] 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::dutch_auction_test::test_price_at_midpoint
...
Test result: OK. Total tests: 12; passed: 12; failed: 0
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
https://cedrascan.com/account/0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da/modules/packages/dutch_auction?network=testnet
```

### 4. Configure Frontend

The frontend is already configured with the deployed contract address in `frontend/src/utils/contract.ts`:

```typescript
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'dutch_auction'
```

## 💻 Frontend Usage

### Home Dashboard (`/`)

**Features:**
1. **Browse All Auctions** - View active and completed auctions
2. **Live Price Updates** - Real-time price decay with countdown timers
3. **Auto-refresh** - Updates every 5 seconds
4. **Statistics Overview** - Total active and sold auctions
5. **Buy Now** - Purchase NFT at current price
6. **Cancel Auction** - Sellers can cancel their unsold auctions
7. **Filter Tabs** - Filter by All, Active, Completed, or My Auctions

**User Flow:**
```
1. Connect Wallet → 2. Browse Auctions → 3. Click Buy Now → 4. Approve Transaction → 5. Receive NFT
```

### Create Auction Page (`/create`)

**Features:**
1. **NFT Input** - Enter your NFT Object address
2. **Price Configuration** - Set start price, end price, and duration
3. **Payment Token** - Specify payment token metadata (default: CEDRA)
4. **Validation** - Real-time validation of inputs
5. **Tips & Examples** - Helpful guidance for auction configuration

**User Flow:**
```
1. Connect Wallet → 2. Navigate to /create → 3. Enter NFT & Prices → 4. Submit → 5. Approve Transaction
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

#### `create_auction(seller: &signer, nft: Object<Token>, start_price: u64, end_price: u64, duration: u64, payment_token: Object<Metadata>)`

Creates a new Dutch auction for an NFT.

**Parameters:**
- `seller`: Signer reference (transaction sender)
- `nft`: The NFT token object to auction
- `start_price`: Starting price in octas (must be > end_price)
- `end_price`: Minimum floor price in octas
- `duration`: Auction duration in seconds (must be > 0)
- `payment_token`: Fungible asset metadata for payment

**Effects:**
- Transfers NFT from seller to auction object (escrow)
- Emits `AuctionCreated` event

**Errors:**
- `E_INVALID_PRICE` (5): start_price must be > end_price
- `E_INVALID_DURATION` (7): duration must be > 0

**Example:**
```move
dutch_auction::create_auction(
    seller,
    my_nft,
    100_000_000,  // 1.0 CEDRA (8 decimals)
    10_000_000,   // 0.1 CEDRA
    3600,         // 1 hour
    cedra_fa_metadata
);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: dutchAuctionClient.getFunction('create_auction'),
    functionArguments: [
      nftAddress,
      startPriceOctas.toString(),
      endPriceOctas.toString(),
      duration.toString(),
      paymentTokenAddress
    ],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `buy_now(buyer: &signer, auction_id: u64)`

Purchase the NFT at the current price.

**Parameters:**
- `buyer`: Signer reference (transaction sender)
- `auction_id`: ID of the auction to purchase

**Effects:**
- Transfers payment from buyer to seller at current calculated price
- Transfers NFT from auction object to buyer
- Marks auction as sold
- Emits `AuctionPurchased` event

**Errors:**
- `E_AUCTION_NOT_FOUND` (2): Invalid auction ID
- `E_AUCTION_ALREADY_SOLD` (3): Auction already completed
- `E_INSUFFICIENT_PAYMENT` (6): Buyer lacks sufficient funds

**Example:**
```move
// Check current price first
let price = dutch_auction::get_current_price(1);
// If acceptable, buy
dutch_auction::buy_now(buyer, 1);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: dutchAuctionClient.getFunction('buy_now'),
    functionArguments: [auctionId.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `cancel_auction(seller: &signer, auction_id: u64)`

Cancel an unsold auction and return NFT to seller.

**Parameters:**
- `seller`: Signer reference (must be auction creator)
- `auction_id`: ID of the auction to cancel

**Effects:**
- Returns NFT from auction object to seller
- Marks auction as sold (prevents further operations)
- Emits `AuctionCancelled` event

**Errors:**
- `E_AUCTION_NOT_FOUND` (2): Invalid auction ID
- `E_NOT_SELLER` (4): Caller is not the auction creator
- `E_AUCTION_ALREADY_SOLD` (3): Cannot cancel sold auction

**Example:**
```move
dutch_auction::cancel_auction(seller, 1);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: dutchAuctionClient.getFunction('cancel_auction'),
    functionArguments: [auctionId.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

### View Functions (Read Operations)

#### `get_current_price(auction_id: u64): u64`

Calculate the current price based on elapsed time.

**Parameters:**
- `auction_id`: ID of the auction to query

**Returns:** `u64` - Current price in payment token units (octas)

**Formula:**
```
current_price = start_price - ((start_price - end_price) * elapsed_time / duration)
```

**Example:**
```move
let current_price = dutch_auction::get_current_price(1);
// If 30 minutes into 1-hour auction from 1.0 to 0.1:
// current_price ≈ 55_000_000 (0.55 CEDRA)
```

**Frontend Usage:**
```typescript
const price = await dutchAuctionClient.getCurrentPrice(auctionId)
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
if (dutch_auction::auction_exists(1)) {
    // Auction exists - safe to query or buy
};
```

**Frontend Usage:**
```typescript
const exists = await dutchAuctionClient.auctionExists(auctionId)
```

---

#### `get_auction_info(auction_id: u64): (address, Object<Token>, u64, u64, u64, u64, bool)`

Get complete auction details.

**Parameters:**
- `auction_id`: ID of the auction to query

**Returns:** Tuple with:
- `seller: address` - Auction creator address
- `nft: Object<Token>` - NFT token object
- `start_price: u64` - Starting price
- `end_price: u64` - Ending price
- `start_time: u64` - Auction start timestamp
- `duration: u64` - Auction duration in seconds
- `is_sold: bool` - Whether auction is completed

**Example:**
```move
let (seller, nft, start, end, time, dur, sold) = dutch_auction::get_auction_info(1);
```

**Frontend Usage:**
```typescript
const info = await dutchAuctionClient.getAuctionInfo(auctionId)
// Returns: AuctionInfo object
```

---

## 🛡 Security Features

Our Dutch auction system includes multiple layers of security:

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

### 2. **Atomic Payment and Transfer**

```move
// All happens in one transaction - atomic
primary_fungible_store::transfer(buyer, payment_token, seller, current_price);
object::transfer(&auction_obj_signer, nft, buyer_addr);
auction.is_sold = true;
```

### 3. **ExtendRef Pattern for Secure Transfers**

```move
let auction_obj_signer = object::generate_signer_for_extending(&auction.extend_ref);
object::transfer(&auction_obj_signer, nft, buyer_addr);
```

Uses ExtendRef to generate signer for NFT transfers from auction object.

### 4. **Access Control**

```move
assert!(auction.seller == seller_addr, error::permission_denied(E_NOT_SELLER));
```

Only the original seller can cancel their auction.

### 5. **Duplicate Sale Prevention**

```move
assert!(!auction.is_sold, error::invalid_state(E_AUCTION_ALREADY_SOLD));
```

Once sold, auction cannot be purchased or cancelled again.

### 6. **Input Validation**

```move
assert!(start_price > end_price, error::invalid_argument(E_INVALID_PRICE));
assert!(duration > 0, error::invalid_argument(E_INVALID_DURATION));
```

Ensures all parameters are valid before creating auction.

### 7. **Safe Price Calculation**

```move
// Prevents underflow
let elapsed = if (now > start_time) { now - start_time } else { 0 };
if (elapsed >= duration) { return end_price };
```

Handles edge cases in price decay formula.

## 📁 Project Structure

```
Dutch Auction Contract/
│
├── contract/                        # Smart contract directory
│   ├── sources/
│   │   └── dutch_auction.move       # Main auction contract (303 lines)
│   ├── tests/
│   │   └── dutch_auction_test.move  # Test suite (349 lines, 12 tests)
│   ├── Move.toml                    # Package configuration
│   ├── .cedra/
│   │   └── config.yaml              # Deployment configuration
│   └── build/                       # Compiled artifacts (generated)
│
├── frontend/                        # React TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── home.tsx            # Browse auctions dashboard (280 lines)
│   │   │   └── create.tsx          # Create auction page (310 lines)
│   │   ├── components/
│   │   │   ├── AuctionCard.tsx     # Auction display with live updates (250 lines)
│   │   │   └── WalletSelectorModal.tsx  # Wallet connection UI
│   │   ├── contexts/
│   │   │   ├── WalletProvider.tsx  # Wallet state management
│   │   │   └── useWallet.tsx       # Wallet hook
│   │   ├── utils/
│   │   │   └── contract.ts         # Dutch auction client (200 lines)
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

Edit `contract/sources/dutch_auction.move`:

```move
// Error codes are fixed for consistency
const E_NOT_INITIALIZED: u64 = 1;
const E_AUCTION_NOT_FOUND: u64 = 2;
const E_AUCTION_ALREADY_SOLD: u64 = 3;
const E_NOT_SELLER: u64 = 4;
const E_INVALID_PRICE: u64 = 5;
const E_INSUFFICIENT_PAYMENT: u64 = 6;
const E_INVALID_DURATION: u64 = 7;
```

### Frontend Configuration

Edit `frontend/src/utils/contract.ts`:

```typescript
// Contract address (deployed on testnet)
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'dutch_auction'

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
VITE_MODULE_NAME=dutch_auction
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

**Issue:** Transaction fails with `E_INSUFFICIENT_PAYMENT`
```
Solution: Ensure buyer account has sufficient balance for current price + gas fees
```

**Issue:** Cannot create auction with NFT
```
Solution: 
1. Verify you own the NFT at the specified object address
2. Ensure NFT is not already in an auction or locked
3. Check that start_price > end_price
```

**Issue:** Price not updating in real-time
```
Solution:
1. Frontend auto-refreshes every 5 seconds
2. Manual refresh button available in UI
3. Check browser console for errors
```

## 📝 Error Codes Reference

| Code | Name | Description | User Action |
|------|------|-------------|-------------|
| 1 | `E_NOT_INITIALIZED` | Contract not initialized | Contact admin |
| 2 | `E_AUCTION_NOT_FOUND` | Auction doesn't exist | Check auction ID |
| 3 | `E_AUCTION_ALREADY_SOLD` | Auction completed | Cannot buy/cancel |
| 4 | `E_NOT_SELLER` | Not auction creator | Only seller can cancel |
| 5 | `E_INVALID_PRICE` | start_price ≤ end_price | Increase start price |
| 6 | `E_INSUFFICIENT_PAYMENT` | Buyer lacks funds | Add more funds |
| 7 | `E_INVALID_DURATION` | Duration is zero | Set duration > 0 |


## 🔗 Resources

- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Guide](https://move-language.github.io/move/)
- [Cedra GitHub](https://github.com/cedra-labs)
- [Testnet Explorer](https://cedrascan.com)
- [Testnet Faucet](https://faucet.cedra.dev)
