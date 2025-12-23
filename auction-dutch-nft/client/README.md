# Dutch Auction Client

TypeScript client for interacting with the Dutch Auction NFT contract on Cedra.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the contract address in `src/index.ts`:
```typescript
const MODULE_ADDRESS = "0x..."; // Your deployed contract address
```

## Usage

### Run the example:
```bash
npm start
```

### Use programmatically:

```typescript
import { DutchAuctionClient } from './src/index';
import { Account, Network } from "@cedra-labs/ts-sdk";

const client = new DutchAuctionClient(Network.TESTNET, "0x...");

// Create auction
await client.createAuction(
  seller,
  nftAddress,
  1000,  // start_price
  100,   // end_price
  3600   // duration (seconds)
);

// Get current price
const price = await client.getCurrentPrice(auctionAddress);

// Buy NFT
await client.buyNow(buyer, auctionAddress);

// Cancel auction
await client.cancelAuction(seller, auctionAddress);
```

## API Reference

### `createAuction(seller, nftAddress, startPrice, endPrice, durationSeconds)`
Creates a new Dutch auction for an NFT.

### `getCurrentPrice(auctionAddress)`
Gets the current price of an auction based on elapsed time.

### `buyNow(buyer, auctionAddress)`
Purchases the NFT at the current price.

### `cancelAuction(seller, auctionAddress)`
Cancels the auction (seller only).

### `getAuctionInfo(auctionAddress)`
Gets detailed information about an auction.

### `auctionExists(auctionAddress)`
Checks if an auction exists.

### `isAuctionExpired(auctionAddress)`
Checks if an auction has expired.

