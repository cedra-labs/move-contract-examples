# English Auction Example Usage

This document demonstrates how to interact with the English Auction smart contract.

## Prerequisites

- Cedra CLI installed
- An NFT to auction
- A payment token (fungible asset)

## Example Flow

### 1. Create an Auction

```bash
# Create an English auction for your NFT
cedra move run \
  --function-id 'default::english_auction::create_auction' \
  --args \
    object:YOUR_NFT_ADDRESS \
    u64:1000000 \
    u64:3600 \
    object:YOUR_PAYMENT_TOKEN_ADDRESS
```

**Parameters:**
- `nft`: The NFT object to auction
- `starting_price`: Minimum bid amount (e.g., 1000000 = 1 token with 6 decimals)
- `duration`: Auction duration in seconds (e.g., 3600 = 1 hour)
- `payment_token`: The fungible asset used for payment

### 2. Place a Bid

```bash
# Place a bid on auction #1
cedra move run \
  --function-id 'default::english_auction::place_bid' \
  --args \
    u64:1 \
    u64:1500000
```

**Parameters:**
- `auction_id`: The ID of the auction (starts from 1)
- `amount`: Your bid amount (must be >= current highest bid + 1)

**Note:** If you're outbid, your previous bid will be automatically refunded!

### 3. Check Current Bid

```bash
# View the current highest bid for auction #1
cedra move view \
  --function-id 'default::english_auction::get_current_bid' \
  --args u64:1
```

### 4. Check Auction Details

```bash
# Get detailed information about auction #1
cedra move view \
  --function-id 'default::english_auction::get_auction_info' \
  --args u64:1
```

**Returns:**
- Seller address
- NFT object
- Starting price
- Current highest bid
- Current highest bidder
- Start time
- End time
- Duration
- Is finalized

### 5. Finalize the Auction

```bash
# After the auction ends, anyone can finalize it
cedra move run \
  --function-id 'default::english_auction::finalize_auction' \
  --args u64:1
```

**Note:** This can only be called after the auction end time has passed and there's at least one bid.

### 6. Cancel an Auction (Seller Only, No Bids)

```bash
# Seller can cancel if there are no bids yet
cedra move run \
  --function-id 'default::english_auction::cancel_auction' \
  --args u64:1
```

## Key Features

### Automatic Refunds
When a bidder is outbid, their previous bid is **automatically refunded** immediately. No need to manually claim refunds!

### Anti-Sniping Protection
If a bid is placed in the last 5 minutes of the auction, the end time is automatically extended by 5 minutes. This prevents last-second sniping and gives other bidders a fair chance to respond.

### Example Scenario

1. **Alice** creates an auction for her rare NFT with a starting price of 10 tokens, duration of 1 hour
2. **Bob** bids 10 tokens at the start
3. **Charlie** bids 15 tokens 30 minutes later
   - Bob is automatically refunded his 10 tokens
4. **Diana** bids 20 tokens with only 3 minutes left
   - Charlie is automatically refunded his 15 tokens
   - The auction is extended by 5 minutes (anti-sniping)
5. No one else bids, auction ends
6. Anyone calls `finalize_auction`
   - Diana receives the NFT
   - Alice receives 20 tokens

## Error Handling

Common errors you might encounter:

- **E_BID_TOO_LOW**: Your bid must be at least `current_highest_bid + 1`
- **E_AUCTION_NOT_ENDED**: Cannot finalize before the auction ends
- **E_NO_BIDS**: Cannot finalize an auction with no bids
- **E_AUCTION_ALREADY_FINALIZED**: This auction has already been finalized
- **E_NOT_SELLER**: Only the seller can cancel the auction

## Tips

- Always check the current highest bid before placing your bid
- Remember that bids in the last 5 minutes will extend the auction
- Your funds are automatically refunded if you're outbid - no action needed!
- Make sure you have enough balance in the payment token before bidding

