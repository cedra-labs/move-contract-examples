# English Auction Client

TypeScript client for interacting with the English Auction NFT contract on Cedra.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the contract addresses in `src/index.ts`:
```typescript
const MODULE_ADDRESS = "0x..."; // Your deployed English Auction contract address
const NFT_MODULE_ADDRESS = "0x..."; // Your deployed NFT contract address (or "_" to skip NFT minting)
```

## Usage

### Run the example:
```bash
npm start
```

The client will:
1. ✅ Generate seller and bidder accounts
2. ✅ Fund accounts with CEDRA tokens
3. ✅ Mint an NFT (if NFT_MODULE_ADDRESS is set)
4. ✅ Create an English auction
5. ✅ Place multiple bids
6. ✅ Show automatic refund tracking
7. ✅ Wait for auction to expire
8. ✅ Finalize the auction
9. ✅ Claim refunds for losing bidders

## Testing the Full Flow

The client is configured with a **60-second auction duration** for testing. This allows you to see the complete flow:

1. **Auction Creation**: Creates auction with starting price
2. **Bidding**: Multiple bidders place increasing bids
3. **Automatic Refunds**: Previous bidders are automatically refunded when outbid
4. **Time Extension**: If a bid is placed in the last 5 minutes, auction time extends
5. **Finalization**: After expiration, auction is finalized and NFT transferred to winner
6. **Refund Claims**: Losing bidders can claim their refunds

## Example Output

```
============================================================
English Auction NFT Demo
============================================================
Using module: 0x...::EnglishAuction
Network: testnet

📝 Generated Accounts:
   Seller: 0x...
   Bidder 1: 0x...
   Bidder 2: 0x...

💰 Funding accounts...
✓ Funding completed for Seller
✓ Funding completed for Bidder 1
✓ Funding completed for Bidder 2

Step 0: Minting NFT for auction...
✓ NFT minted successfully

Step 1: Creating English auction...
✓ Auction created

Step 4: Placing bids...
✓ Bid 1 confirmed (1000 octas)
✓ Bid 2 confirmed (1500 octas - outbids Bidder 1)

Step 5: Waiting for auction to expire...
Auction expires in 60 seconds
Waiting 65 seconds for auction to expire...
✓ Wait completed
✓ Auction expired

Finalizing auction...
✓ Auction finalized!
✓ NFT transferred to winner
✓ Payment transferred to seller

Bidder 1 claiming refund...
✓ Refund claimed (1000 octas)

============================================================
Demo completed successfully!
============================================================
```

## Configuration

You can customize the auction parameters in `src/index.ts`:

```typescript
const STARTING_PRICE = 1000;        // Starting price in octas
const DURATION_SECONDS = 60;       // Auction duration (60 seconds for testing, 3600 for 1 hour)
```

## Troubleshooting

### "MODULE_ADDRESS is not set!"
- Update `MODULE_ADDRESS` with your deployed contract address

### "No NFT found"
- Set `NFT_MODULE_ADDRESS` to a valid NFT contract address
- Or ensure the seller account already owns an NFT

### "Auction has not expired yet"
- The client automatically waits for expiration
- For testing, duration is set to 60 seconds
- In production, use longer durations (e.g., 3600 seconds = 1 hour)

## API Reference

The client demonstrates all core functions:
- `create_auction` - Creates a new English auction
- `place_bid` - Places a bid (automatically refunds previous bidder)
- `finalize_auction` - Finalizes expired auction
- `claim_refund` - Claims refund for losing bidders
- `cancel_auction` - Seller cancels auction (if no bids)
- `get_auction_info` - Gets auction details
- `get_refund_amount` - Gets refund amount for a bidder
