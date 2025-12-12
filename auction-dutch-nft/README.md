# Dutch Auction Contract (Descending Price)

A production-ready Dutch auction smart contract for NFTs on the Cedra network. In a Dutch auction, the price starts high and decreases linearly over time until a buyer purchases at the current price.

## Features

- **Linear Price Decrease**: Price decreases from start_price to end_price over a specified duration
- **Instant Purchase**: Buyers can purchase immediately at the current price (no waiting period unlike English auction)
- **Secure Escrow**: Payment is escrowed during purchase, NFT transferred upon seller confirmation
- **Seller Cancellation**: Sellers can cancel if no buyer has purchased yet
- **Price Formula**: `current_price = start_price - ((start_price - end_price) * elapsed_time / duration)`
- **Gas Optimized**: Efficient calculations and minimal storage operations

## Prerequisites

- [Cedra CLI](https://docs.cedranetwork.com/getting-started/cli) v1.0.4+
- Node.js v18+ (for TypeScript examples)
- A Cedra testnet account with funds

## Project Structure

```
auction-dutch-nft/
├── Move.toml                 # Package configuration
├── sources/
│   └── auction.move          # Smart contract implementation
├── tests/
│   └── auction_tests.move    # Unit tests (13 test cases)
├── scripts/
│   └── example_usage.ts      # TypeScript usage example
└── README.md                 # This file
```

## Setup & Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/cedra-labs/move-contract-examples.git
   cd move-contract-examples/auction-dutch-nft
   ```

2. **Install dependencies** (for example script)
   ```bash
   npm install
   ```

## Usage

### 1. Compile the Contract

```bash
cedra move compile --dev
```

### 2. Run Tests

```bash
cedra move test --dev
```

**Expected Output**: All 13 tests passing

- Price calculation at different times
- Successful purchase flow
- Auction cancellation
- Expired auction handling
- Edge cases (invalid parameters, double purchase, etc.)

### 3. Deploy

```bash
cedra move publish
```

### 4. TypeScript Example

```bash
npx ts-node scripts/example_usage.ts
```

## Contract Functions

### `create_auction`

Creates a new Dutch auction with linearly decreasing price.

```move
public entry fun create_auction(
    seller: &signer,
    nft: Object<Token>,
    start_price: u64,
    end_price: u64,
    duration: u64
)
```

**Parameters**:

- `seller`: Signer creating the auction
- `nft`: NFT object to auction
- `start_price`: Initial price (must be > end_price)
- `end_price`: Final minimum price
- `duration`: Auction duration in seconds (must be > 0)

**Emits**: `AuctionCreated`

### `get_current_price`

View function to calculate current price based on elapsed time.

```move
#[view]
public fun get_current_price(auction_addr: address): u64
```

**Returns**: Current price (returns end_price if duration has passed)

**Formula**:

```
if elapsed >= duration:
    return end_price
else:
    price_drop = (start_price - end_price) * elapsed / duration
    return start_price - price_drop
```

### `buy_now`

Buyer purchases NFT at current price. Payment is escrowed to auction address.

```move
public entry fun buy_now(
    buyer: &signer,
    auction_addr: address
)
```

**Effects**:

- Calculates current price
- Transfers payment to auction escrow
- Records buyer and final price
- Marks auction as sold

**Emits**: `AuctionCompleted`

### `finalize_sale`

Seller completes the transfer after buyer purchases.

```move
public entry fun finalize_sale(
    seller: &signer,
    auction_addr: address
)
```

**Effects**:

- Transfers NFT to buyer
- Transfers payment from escrow to seller

> [!NOTE] > **Instant Settlement**: The two-step process (`buy_now` + `finalize_sale`) ensures instant settlement with no waiting period. The seller can finalize immediately after purchase, unlike English auctions which require waiting for the auction end time.

### `cancel_auction`

Seller cancels auction if no purchase has been made.

```move
public entry fun cancel_auction(
    seller: &signer,
    auction_addr: address
)
```

**Requirements**: Auction must not be sold

**Emits**: `AuctionCancelled`

### `get_auction`

View function to get auction details.

```move
#[view]
public fun get_auction(auction_addr: address): (
    address,  // seller
    u64,      // start_price
    u64,      // end_price
    u64,      // start_time
    u64,      // duration
    bool,     // sold
    address,  // buyer
    u64       // final_price
)
```

## Price Calculation Examples

| Time Elapsed | Start: 1000, End: 100, Duration: 900s | Price |
| ------------ | ------------------------------------- | ----- |
| 0s (start)   | 1000 - (900 × 0/900) = 1000           | 1000  |
| 450s (50%)   | 1000 - (900 × 450/900) = 550          | 550   |
| 900s (end)   | 1000 - (900 × 900/900) = 100          | 100   |
| 1000s (past) | Returns end_price                     | 100   |

## Error Codes

| Code | Name                  | Description                      |
| ---- | --------------------- | -------------------------------- |
| 1    | `E_AUCTION_NOT_FOUND` | Auction doesn't exist at address |
| 2    | `E_ALREADY_SOLD`      | Auction already completed/sold   |
| 3    | `E_NOT_SELLER`        | Caller is not the auction seller |
| 4    | `E_INVALID_PRICE`     | start_price must be > end_price  |
| 5    | `E_INVALID_DURATION`  | duration must be > 0             |

## Architecture

**Dutch Auction Flow**:

1. **Creation**: Seller creates auction with start/end prices and duration. NFT is escrowed to seller's address.

2. **Price Decay**: Price decreases linearly based on `current_price = start_price - ((start_price - end_price) * elapsed / duration)`

3. **Purchase**:
   - Buyer calls `buy_now` at any time
   - Current price is calculated
   - Payment transferred to auction escrow
   - Buyer and price recorded
4. **Finalization**:

   - Seller calls `finalize_sale` (can be done immediately - no waiting)
   - NFT transferred to buyer
   - Payment transferred from escrow to seller

5. **Cancellation**: Seller can cancel anytime before purchase by calling `cancel_auction`

**Key Design Decisions**:

- **Two-step settlement**: Required by Cedra's object ownership model where only the NFT owner can transfer it
- **Escrow pattern**: Payment held at auction address ensures atomic swap
- **No waiting period**: Unlike English auction, seller can finalize immediately (instant settlement)
- **Gas efficiency**: Inline price calculation in `buy_now` avoids extra function call

## Test Coverage

All 13 tests pass with full coverage:

✅ **Price Calculation**:

- Price at start, midpoint, end, and beyond duration
- Precision with large numbers

✅ **Purchase Flow**:

- Successful purchase at various timepoints
- Instant purchase at start price
- Purchase at last second before end
- Purchase after expiration

✅ **Error Handling**:

- Cannot buy twice
- Cannot cancel after sold
- Only seller can cancel
- Invalid price range (start <= end)
- Zero duration
- Auction not found

## Gas Efficiency

- Inline price calculation avoids redundant function calls
- Minimal storage reads via borrow patterns
- Efficient arithmetic using integer operations
- Single escrow transfer operation

## Comparison: Dutch vs English Auction

| Feature         | Dutch Auction      | English Auction    |
| --------------- | ------------------ | ------------------ |
| Price Direction | Decreasing         | Increasing         |
| Purchase Timing | Anytime (instant)  | After auction ends |
| Bidding         | No bidding         | Multiple bids      |
| Settlement      | Two-step (instant) | Finalize after end |
| Price Formula   | Linear decrease    | Highest bid wins   |
| Waiting Period  | None               | Must wait for end  |

## License

MIT

---

**Built for Cedra Builders Forge** | [Issue #66](https://github.com/cedra-labs/docs/issues/66)
