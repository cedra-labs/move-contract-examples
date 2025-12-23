# Dutch Auction for NFTs

A Move smart contract implementation of a Dutch auction system for NFTs on the Cedra blockchain. In a Dutch auction, the price starts high and decreases linearly over time until someone purchases the NFT at the current price.

## Overview

This contract implements a Dutch auction mechanism where:
- **Price decreases linearly** from `start_price` to `end_price` over `duration` seconds
- **First buyer wins** - the first person to call `buy_now` purchases at the current price
- **Instant settlement** - NFT and payment are transferred immediately upon purchase
- **Seller can cancel** - The seller can cancel the auction before it's sold

## Price Formula

The current price is calculated using a linear decay formula:

```
current_price = start_price - ((start_price - end_price) * elapsed_time / duration)
```

Where:
- `start_price`: Initial (highest) price
- `end_price`: Final (lowest) price  
- `elapsed_time`: Time since auction started (in seconds)
- `duration`: Total auction duration (in seconds)

### Price Calculation Examples

- **At start (0% elapsed)**: `price = start_price`
- **At midpoint (50% elapsed)**: `price = start_price - (price_range * 0.5)`
- **At end (100% elapsed)**: `price = end_price`

Example: If `start_price = 1000`, `end_price = 100`, `duration = 3600` seconds:
- At 0 seconds: `1000 - ((1000-100) * 0 / 3600) = 1000`
- At 1800 seconds: `1000 - ((1000-100) * 1800 / 3600) = 1000 - 450 = 550`
- At 3600 seconds: `100 = end_price`

## Core Functions

### `create_auction`

Creates a new Dutch auction for an NFT.

```move
public entry fun create_auction(
    seller: &signer,
    nft: Object<token::Token>,
    start_price: u64,
    end_price: u64,
    duration: u64,
    payment_asset: Object<Metadata>,
)
```

**Parameters:**
- `seller`: The account creating the auction (must own the NFT)
- `nft`: The NFT token object to auction
- `start_price`: Starting price (highest price, must be > 0)
- `end_price`: Ending price (lowest price, must be <= start_price)
- `duration`: Auction duration in seconds (must be > 0)
- `payment_asset`: Fungible asset metadata for payment

**Requirements:**
- Seller must own the NFT
- `start_price > 0`
- `end_price <= start_price`
- `duration > 0`

**Events Emitted:**
- `PriceUpdateEvent` with initial price

### `get_current_price`

Calculates and returns the current auction price based on elapsed time.

```move
#[view]
public fun get_current_price(auction_address: address): u64
```

**Parameters:**
- `auction_address`: Address of the auction object

**Returns:**
- Current price (u64), or 0 if auction is sold

**Price Calculation:**
- Uses linear decay formula: `start_price - ((start_price - end_price) * elapsed_time / duration)`
- Returns `end_price` if auction has expired (elapsed_time >= duration)
- Returns 0 if auction is already sold

### `buy_now`

Purchases the NFT at the current price (instant purchase).

```move
public entry fun buy_now(
    buyer: &signer,
    auction_address: address,
)
```

**Parameters:**
- `buyer`: The account purchasing the NFT
- `auction_address`: Address of the auction object

**Requirements:**
- Auction must exist
- Auction must not be sold
- Buyer must have sufficient balance of payment asset

**Actions:**
1. Calculates current price
2. Transfers payment from buyer to seller
3. Transfers NFT from auction to buyer
4. Marks auction as sold

**Events Emitted:**
- `PurchaseEvent` with buyer, seller, price, and NFT address
- `PriceUpdateEvent` with final price

### `cancel_auction`

Cancels the auction and returns the NFT to the seller.

```move
public entry fun cancel_auction(
    seller: &signer,
    auction_address: address,
)
```

**Parameters:**
- `seller`: The seller account (must match auction seller)
- `auction_address`: Address of the auction object

**Requirements:**
- Seller must be the auction creator
- Auction must not be sold

**Actions:**
1. Transfers NFT back to seller
2. Marks auction as sold (prevents further operations)

## View Functions

### `get_auction_info`

Returns detailed information about an auction.

```move
#[view]
public fun get_auction_info(auction_address: address): (
    u64,        // auction_id
    address,    // nft address
    address,    // seller
    u64,        // start_price
    u64,        // end_price
    u64,        // start_time
    u64,        // duration
    bool,       // sold
    address,    // buyer
    address     // payment_asset address
)
```

### `auction_exists`

Checks if an auction exists at the given address.

```move
#[view]
public fun auction_exists(auction_address: address): bool
```

### `is_auction_expired`

Checks if an auction has expired (reached end_price).

```move
#[view]
public fun is_auction_expired(auction_address: address): bool
```

## Events

### `PurchaseEvent`

Emitted when an NFT is purchased.

```move
struct PurchaseEvent has drop, store {
    auction_id: u64,
    buyer: address,
    seller: address,
    price: u64,
    nft: address,
}
```

### `PriceUpdateEvent`

Emitted when price is queried or updated (for tracking price changes).

```move
struct PriceUpdateEvent has drop, store {
    auction_id: u64,
    current_price: u64,
    elapsed_time: u64,
}
```

## Error Codes

- `E_AUCTION_NOT_FOUND` (1): Auction does not exist
- `E_NOT_SELLER` (2): Caller is not the auction seller
- `E_AUCTION_ALREADY_SOLD` (3): Auction has already been sold
- `E_INSUFFICIENT_PAYMENT` (4): Insufficient payment (not currently enforced, buyer pays exact current price)
- `E_INVALID_PRICE` (5): Invalid price parameters
- `E_INVALID_DURATION` (6): Invalid duration (must be > 0)
- `E_AUCTION_EXPIRED` (7): Auction has expired (reached end_price)
- `E_NOT_NFT_OWNER` (8): Caller does not own the NFT

## Project Structure

```
auction-dutch-nft/
├── contract/              # Move smart contract
│   ├── Move.toml
│   ├── sources/
│   │   └── dutch_auction.move
│   └── tests/
│       └── dutch_auction_test.move
├── client/                # TypeScript client
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
└── README.md
```

## Usage Example

### 1. Deploy the Contract

```bash
cd contract
cedra move compile --named-addresses AuctionDutchNFT=default
cedra move publish --named-addresses AuctionDutchNFT=default
```

After publishing, note the deployed contract address and update it in the client.

### 2. Setup the Client

```bash
cd client
npm install
```

Update `src/index.ts` with your deployed contract address:
```typescript
const MODULE_ADDRESS = "0x..."; // Your deployed contract address
```

### 3. Run the Client Example

```bash
npm start
```

### 4. Using the Client Programmatically

```typescript
import { DutchAuctionClient } from './src/index';
import { Account, Network } from "@cedra-labs/ts-sdk";

const client = new DutchAuctionClient(Network.TESTNET, "0x...");

// Create accounts
const seller = Account.generate();
const buyer = Account.generate();

// Fund accounts
await client.fundAccount(seller.accountAddress);
await client.fundAccount(buyer.accountAddress);

// Create auction (requires NFT object address)
const txHash = await client.createAuction(
  seller,
  nftAddress,  // NFT object address from NFT contract
  1000,        // start_price
  100,         // end_price
  3600         // duration (1 hour in seconds)
);

// Get current price
const currentPrice = await client.getCurrentPrice(auctionAddress);

// Buy NFT at current price
await client.buyNow(buyer, auctionAddress);

// Or cancel auction (seller only)
await client.cancelAuction(seller, auctionAddress);

// Get auction information
const info = await client.getAuctionInfo(auctionAddress);
```

### 5. Direct Move Contract Usage

You can also interact with the contract directly using Move:

```move
// Create auction
create_auction(
    seller,
    nft_object,
    1000,  // start_price
    100,   // end_price
    3600,  // duration (1 hour)
    payment_asset_metadata
);

// Query current price
let current_price = get_current_price(auction_address);

// Purchase NFT
buy_now(buyer, auction_address);

// Cancel auction (seller only)
cancel_auction(seller, auction_address);
```

## Testing

### Run Contract Tests

```bash
cd contract
cedra move test
```

### Run Client Example

```bash
cd client
npm install
npm start
```

### Test Coverage

The test suite covers:
- ✅ Price calculation at different times (start, midpoint, end)
- ✅ Successful purchase
- ✅ Cancellation by seller
- ✅ Expired auction (reached end_price)
- ✅ Invalid inputs (end_price > start_price, zero duration, zero start_price)
- ✅ Linear price decrease verification
- ✅ Price formula correctness

## Security Features

1. **Ownership Verification**: Only NFT owner can create auction
2. **Seller Verification**: Only seller can cancel auction
3. **Sold State Check**: Prevents operations on sold auctions
4. **Instant Settlement**: Atomic transfer of NFT and payment
5. **Price Floor**: Price never goes below `end_price`

## Important Notes

1. **Auction Address**: The `create_auction` function creates an auction object. You need to track the auction object address to interact with it. In a production system, you might want to return the auction address or store it in a registry.

2. **Payment Asset**: The buyer must have sufficient balance of the specified payment asset. The contract transfers the exact current price amount.

3. **Time-based Pricing**: Price is calculated based on `timestamp::now_seconds()`. Ensure your application accounts for blockchain time.

4. **First Buyer Wins**: The first person to call `buy_now` wins, even if multiple people try simultaneously. The transaction that gets included first wins.

5. **Gas Efficiency**: The contract is optimized to be under 150 lines as specified, focusing on core functionality.

## Contract Statistics

- **Lines of Code**: ~310 lines (including tests and documentation)
- **Core Contract**: ~150 lines
- **Test Coverage**: Comprehensive test suite
- **Functions**: 4 core functions + 3 view functions

## License

MIT

