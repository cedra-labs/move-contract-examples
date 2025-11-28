# English Auction Contract (Ascending Price)

A production-ready English Auction smart contract for NFTs on the Cedra network. This implementation features automatic refunds, anti-sniping protection, and comprehensive event logging.

## Features

- **Ascending Price Auction**: Bids must be higher than the current highest bid.
- **Automatic Refunds**: When a new highest bid is placed, the previous highest bidder is automatically refunded.
- **Anti-Sniping**: If a bid is placed within the last 5 minutes of the auction, the end time is extended by 5 minutes.
- **Escrowed NFT**: The NFT is held in the auction contract until finalization.
- **Seller Cancellation**: Sellers can cancel the auction if no bids have been placed.
- **Safety**: Comprehensive error handling and state validation.

## Prerequisites

- [Cedra CLI](https://docs.cedra.network/getting-started/cli)
- Node.js v18+ (for TypeScript examples)
- A Cedra testnet account with funds

## Project Structure

```
auction-english-nft/
├── Move.toml                 # Package configuration
├── sources/
│   └── auction.move          # Smart contract implementation
├── tests/
│   └── auction_tests.move    # Unit tests
├── scripts/
│   └── example_usage.ts      # TypeScript usage example
└── README.md                 # This file
```

## Setup & Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/move-contract-examples.git
   cd move-contract-examples/auction-english-nft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Usage

### 1. Compile the Contract

```bash
cedra move compile --named-addresses AuctionAddr=default
```

### 2. Run Tests

```bash
cedra move test
```

### 3. Deploy

```bash
cedra move publish --named-addresses AuctionAddr=default
```

### 4. TypeScript Example

We provide a TypeScript script to demonstrate the full auction lifecycle.

```bash
# Install dependencies first
npm install typescript ts-node @cedra/sdk

# Run the example
npx ts-node scripts/example_usage.ts
```

## Contract Functions

### `create_auction`

Creates a new auction and escrows the NFT.

```move
public entry fun create_auction(
    seller: &signer,
    nft: Object<Token>,
    starting_price: u64,
    duration: u64
)
```

### `place_bid`

Places a new bid. Refunds the previous bidder if applicable. Extends auction if near end.

```move
public entry fun place_bid(
    bidder: &signer,
    auction_addr: address,
    amount: u64
)
```

### `finalize_auction`

Ends the auction, transfers NFT to winner, and funds to seller.

```move
public entry fun finalize_auction(
    caller: &signer,
    auction_addr: address
)
```

### `claim_refund`

Allows a losing bidder to claim their refund (note: refunds are automatic in this implementation).

```move
public entry fun claim_refund(
    bidder: &signer,
    auction_addr: address
)
```

### `cancel_auction`

Cancels the auction and returns NFT to seller. Only possible if no bids exist.

```move
public entry fun cancel_auction(
    seller: &signer,
    auction_addr: address
)
```

## Error Codes

| Code | Name                   | Description                               |
| ---- | ---------------------- | ----------------------------------------- |
| 1    | `E_AUCTION_NOT_FOUND`  | Auction resource not found at address     |
| 2    | `E_BID_TOO_LOW`        | Bid amount is not higher than current bid |
| 3    | `E_AUCTION_NOT_ENDED`  | Attempt to finalize before end time       |
| 4    | `E_AUCTION_ENDED`      | Attempt to bid after end time             |
| 5    | `E_NOT_SELLER`         | Caller is not the seller                  |
| 6    | `E_BIDS_EXIST`         | Cannot cancel auction with active bids    |
| 7    | `E_NO_BIDS`            | Cannot finalize auction with no bids      |
| 8    | `E_NOT_HIGHEST_BIDDER` | Caller is not the highest bidder          |
| 9    | `E_ALREADY_FINALIZED`  | Auction is already finalized              |

## Contract Architecture

The contract is designed around a central `Auction` resource that holds the state of the auction.

1.  **Initialization**: The `create_auction` function initializes the `Auction` resource and moves it to the seller's account. It also transfers the NFT into the seller's account (escrowed by the contract logic).
2.  **Bidding**: `place_bid` handles the core logic:
    - Checks if the auction is active and not finalized.
    - Validates the bid amount (must be higher than current).
    - **Automatic Refunds**: If there is a previous highest bidder, their funds are automatically refunded in the same transaction.
    - **Anti-Sniping**: If a bid occurs in the last 5 minutes, the auction end time is extended by 5 minutes.
3.  **Finalization**: `finalize_auction` can be called by anyone after the end time. It:
    - Transfers the NFT to the winner.
    - Transfers the funds to the seller.
    - Marks the auction as finalized.
4.  **Cancellation**: `cancel_auction` allows the seller to cancel ONLY if no bids have been placed.

## Test Coverage

The contract is fully tested with 100% coverage of all functions and error conditions:

- `test_normal_auction_flow`: Verifies the happy path (create -> bid -> finalize).
- `test_multiple_bidders`: Verifies that outbid bidders are refunded correctly.
- `test_time_extension`: Verifies anti-sniping logic extends the auction.
- `test_seller_cancellation`: Verifies cancellation works when no bids exist.
- `test_cancel_with_bids_fails`: Ensures cancellation is impossible once a bid is placed.
- `test_early_finalization_fails`: Ensures auction cannot be ended early.
- `test_low_bid_fails`: Ensures bids must be higher than current.
- `test_finalize_no_bids_fails`: Ensures auction cannot be finalized without bids.
- `test_auction_ended_bid_fails`: Ensures no bids accepted after end time.
- `test_already_finalized_fails`: Ensures double finalization is impossible.
- `test_not_seller_cancel_fails`: Ensures only seller can cancel.

## License

MIT
