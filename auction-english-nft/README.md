# English Auction for NFTs

A Move smart contract implementation of an English auction system for NFTs on the Cedra blockchain. In an English auction, bidders place increasing bids, and the highest bidder at the end wins the NFT.

## Overview

This contract implements an English auction mechanism where:
- **Price increases with each bid** - Each new bid must be higher than the previous highest bid
- **Automatic refunds** - Previous highest bidder is automatically refunded when outbid
- **Anti-sniping protection** - Auction time extends by 5 minutes if a bid is placed in the last 5 minutes
- **Finalization** - After auction expires, seller or anyone can finalize to transfer NFT to winner
- **Refund claims** - Losing bidders can claim their refunds after finalization

## Core Functions

### `create_auction`

Creates a new English auction for an NFT.

```move
public entry fun create_auction(
    seller: &signer,
    nft: Object<token::Token>,
    starting_price: u64,
    duration: u64,
    payment_asset: Object<Metadata>,
)
```

**Parameters:**
- `seller`: The account creating the auction (must own the NFT)
- `nft`: The NFT token object to auction
- `starting_price`: Minimum starting price (must be > 0)
- `duration`: Auction duration in seconds (must be > 0)
- `payment_asset`: Fungible asset metadata for payment

**Requirements:**
- Seller must own the NFT
- `starting_price > 0`
- `duration > 0`

**Events Emitted:**
- None (auction creation doesn't emit events, but bid events will be emitted when bids are placed)

### `place_bid`

Places a bid on the auction. Automatically refunds the previous highest bidder if outbid.

```move
public entry fun place_bid(
    bidder: &signer,
    auction_address: address,
    amount: u64,
)
```

**Parameters:**
- `bidder`: The account placing the bid
- `auction_address`: Address of the auction object
- `amount`: Bid amount (must be >= starting_price for first bid, or > highest_bid for subsequent bids)

**Requirements:**
- Auction must exist and not be finalized
- Auction must not be expired
- Bid amount must be sufficient (>= starting_price for first bid, > highest_bid otherwise)
- Bidder must have sufficient balance of payment asset

**Actions:**
1. Validates bid amount
2. Refunds previous highest bidder (stores refund amount)
3. Transfers payment from new bidder to auction object
4. Updates highest bidder and bid amount
5. Extends auction time if bid placed in last 5 minutes (anti-sniping)

**Events Emitted:**
- `BidEvent` with bidder, amount, previous bidder info, and new end time

### `finalize_auction`

Finalizes the auction after expiration, transferring NFT to winner and payment to seller.

```move
public entry fun finalize_auction(
    auction_address: address,
)
```

**Parameters:**
- `auction_address`: Address of the auction object

**Requirements:**
- Auction must exist
- Auction must not be finalized
- Auction must be expired (current time >= end_time)
- There must be at least one bid

**Actions:**
1. Transfers highest bid amount from auction object to seller
2. Transfers NFT from auction object to highest bidder
3. Marks auction as finalized

**Events Emitted:**
- `FinalizeEvent` with winner, final price, seller, and NFT address

### `claim_refund`

Allows losing bidders to claim their refunds after auction finalization.

```move
public entry fun claim_refund(
    bidder: &signer,
    auction_address: address,
)
```

**Parameters:**
- `bidder`: The bidder claiming the refund
- `auction_address`: Address of the auction object

**Requirements:**
- Auction must be finalized
- Bidder must not be the winner
- Bidder must have a refund amount > 0

**Actions:**
1. Transfers refund amount from auction object to bidder
2. Sets bidder's refund amount to 0 (prevents double claiming)

### `cancel_auction`

Cancels the auction and returns the NFT to the seller (only if no bids).

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
- Auction must not be finalized
- Auction must have no bids (highest_bidder == @0x0)

**Actions:**
1. Transfers NFT back to seller
2. Marks auction as finalized (prevents further operations)

## View Functions

### `get_auction_info`

Returns detailed information about an auction.

```move
#[view]
public fun get_auction_info(auction_address: address): (
    u64,        // auction_id
    address,    // nft address
    address,    // seller
    u64,        // starting_price
    u64,        // end_time
    u64,        // duration
    address,    // highest_bidder
    u64,        // highest_bid
    bool,       // finalized
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

Checks if an auction has expired.

```move
#[view]
public fun is_auction_expired(auction_address: address): bool
```

### `get_refund_amount`

Gets the refund amount for a bidder.

```move
#[view]
public fun get_refund_amount(bidder: address): u64
```

## Events

### `BidEvent`

Emitted when a bid is placed.

```move
struct BidEvent has drop, store {
    auction_id: u64,
    bidder: address,
    amount: u64,
    previous_bidder: address,
    previous_amount: u64,
    new_end_time: u64,
}
```

### `FinalizeEvent`

Emitted when an auction is finalized.

```move
struct FinalizeEvent has drop, store {
    auction_id: u64,
    winner: address,
    final_price: u64,
    seller: address,
    nft: address,
}
```

## Error Codes

- `E_AUCTION_NOT_FOUND` (1): Auction does not exist
- `E_NOT_SELLER` (2): Caller is not the auction seller
- `E_AUCTION_ALREADY_FINALIZED` (3): Auction has already been finalized
- `E_AUCTION_NOT_EXPIRED` (4): Auction has not expired yet
- `E_INSUFFICIENT_BID` (5): Bid amount is insufficient
- `E_INVALID_PRICE` (6): Invalid price parameters
- `E_INVALID_DURATION` (7): Invalid duration (must be > 0)
- `E_NOT_NFT_OWNER` (8): Caller does not own the NFT
- `E_NO_BIDS` (9): No bids were placed on the auction
- `E_NOT_BIDDER` (10): Caller is not a bidder or is the winner
- `E_ALREADY_CLAIMED` (11): Refund has already been claimed

## Project Structure

```
auction-english-nft/
├── contract/              # Move smart contract
│   ├── Move.toml
│   ├── sources/
│   │   └── english_auction.move
│   └── tests/
│       └── english_auction_test.move
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
cedra move compile --named-addresses AuctionEnglishNFT=default
cedra move publish --named-addresses AuctionEnglishNFT=default
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
import { Account, Network } from "@cedra-labs/ts-sdk";
import { Cedra, CedraConfig } from "@cedra-labs/ts-sdk";

const config = new CedraConfig({ network: Network.TESTNET });
const cedra = new Cedra(config);

// Create accounts
const seller = Account.generate();
const bidder1 = Account.generate();
const bidder2 = Account.generate();

// Fund accounts
await cedra.faucet.fundAccount({ accountAddress: seller.accountAddress, amount: 100_000_000 });
await cedra.faucet.fundAccount({ accountAddress: bidder1.accountAddress, amount: 100_000_000 });
await cedra.faucet.fundAccount({ accountAddress: bidder2.accountAddress, amount: 100_000_000 });

// Create auction (requires NFT object address)
const createTxn = await cedra.transaction.build.simple({
  sender: seller.accountAddress,
  data: { 
    function: `${MODULE_ADDRESS}::EnglishAuction::create_auction`,
    functionArguments: [nftAddress, "1000", "3600", CEDRA_METADATA]
  }
});
await cedra.signAndSubmitTransaction({ signer: seller, transaction: createTxn });

// Place bids
const bid1Txn = await cedra.transaction.build.simple({
  sender: bidder1.accountAddress,
  data: { 
    function: `${MODULE_ADDRESS}::EnglishAuction::place_bid`,
    functionArguments: [auctionAddress, "1000"]
  }
});
await cedra.signAndSubmitTransaction({ signer: bidder1, transaction: bid1Txn });

const bid2Txn = await cedra.transaction.build.simple({
  sender: bidder2.accountAddress,
  data: { 
    function: `${MODULE_ADDRESS}::EnglishAuction::place_bid`,
    functionArguments: [auctionAddress, "1500"]
  }
});
await cedra.signAndSubmitTransaction({ signer: bidder2, transaction: bid2Txn });

// Finalize auction (after expiration)
const finalizeTxn = await cedra.transaction.build.simple({
  sender: seller.accountAddress,
  data: { 
    function: `${MODULE_ADDRESS}::EnglishAuction::finalize_auction`,
    functionArguments: [auctionAddress]
  }
});
await cedra.signAndSubmitTransaction({ signer: seller, transaction: finalizeTxn });

// Claim refund (for losing bidders)
const claimRefundTxn = await cedra.transaction.build.simple({
  sender: bidder1.accountAddress,
  data: { 
    function: `${MODULE_ADDRESS}::EnglishAuction::claim_refund`,
    functionArguments: [auctionAddress]
  }
});
await cedra.signAndSubmitTransaction({ signer: bidder1, transaction: claimRefundTxn });
```

### 5. Direct Move Contract Usage

You can also interact with the contract directly using Move:

```move
// Create auction
create_auction(
    seller,
    nft_object,
    1000,  // starting_price
    3600,  // duration (1 hour)
    payment_asset_metadata
);

// Place bid
place_bid(bidder, auction_address, 1000);

// Place higher bid (automatically refunds previous bidder)
place_bid(another_bidder, auction_address, 1500);

// Finalize auction (after expiration)
finalize_auction(auction_address);

// Claim refund (for losing bidders)
claim_refund(bidder, auction_address);

// Cancel auction (seller only, if no bids)
cancel_auction(seller, auction_address);
```

## Testing

### Run Contract Tests

```bash
cd contract
cedra move test --named-addresses AuctionEnglishNFT=0xcafe
```

### Run Client Example

```bash
cd client
npm install
npm start
```

### Test Coverage

The test suite covers:
- ✅ Auction creation
- ✅ Invalid inputs (zero price, zero duration)
- ✅ Placing bids
- ✅ Multiple bidders
- ✅ Time extension (anti-sniping)
- ✅ Auction cancellation (no bids)
- ✅ Cancellation failure (with bids)
- ✅ Refund claiming
- ✅ View functions (auction_exists, get_auction_info, is_auction_expired)

## Key Features

### Automatic Refunds

When a bidder is outbid, their previous bid amount is automatically tracked for refund. The refund can be claimed after the auction is finalized.

### Anti-Sniping Protection

If a bid is placed within the last 5 minutes of the auction, the auction end time is automatically extended by 5 minutes. This prevents last-second sniping and gives other bidders a chance to respond.

### Time Extension Logic

```move
let time_remaining = auction.end_time - now;
if (time_remaining <= E_TIME_EXTENSION_SECONDS) {
    auction.end_time = now + E_TIME_EXTENSION_SECONDS;
};
```

### Bid Validation

- First bid must be >= `starting_price`
- Subsequent bids must be > `highest_bid`
- Auction must not be expired
- Auction must not be finalized

## Security Features

1. **Ownership Verification**: Only NFT owner can create auction
2. **Seller Verification**: Only seller can cancel auction (if no bids)
3. **Finalized State Check**: Prevents operations on finalized auctions
4. **Bid Validation**: Ensures bids are sufficient
5. **Automatic Refunds**: Previous bidders are automatically refunded when outbid
6. **Atomic Transfers**: NFT and payment transfers are atomic
7. **Refund Tracking**: Prevents double claiming of refunds

## Important Notes

1. **Auction Address**: The `create_auction` function creates an auction object. You need to track the auction object address to interact with it. In a production system, you might want to return the auction address or store it in a registry.

2. **Payment Asset**: Bidders must have sufficient balance of the specified payment asset. Funds are held in the auction object's fungible store until finalization.

3. **Time-based Expiration**: Auction expiration is based on `timestamp::now_seconds()`. Ensure your application accounts for blockchain time.

4. **Finalization**: Anyone can finalize an expired auction (not just the seller). This ensures the auction can be finalized even if the seller is unavailable.

5. **Refund Claims**: Losing bidders must actively claim their refunds after finalization. Refunds are not automatically sent.

6. **Code Size**: The contract is designed to be simple and readable, under 200 lines of core logic.

## Contract Statistics

- **Lines of Code**: ~380 lines (including tests and documentation)
- **Core Contract**: ~180 lines
- **Test Coverage**: Comprehensive test suite
- **Functions**: 4 core functions + 1 cancellation function + 4 view functions
- **Events**: 2 event types (BidEvent, FinalizeEvent)

## License

MIT

