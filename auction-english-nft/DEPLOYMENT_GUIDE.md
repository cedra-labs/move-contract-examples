# Complete Deployment Guide - English Auction with NFT Minting

This guide will help you deploy both the NFT contract and the English Auction contract, then run the full demo.

## Step 1: Deploy the NFT Contract (for minting test NFTs)

First, we need to deploy an NFT contract so we can mint NFTs for testing:

```powershell
# Navigate to NFT example
cd ..\nft-example\contract

# Initialize Cedra (if not already done)
cedra init

# Fund your account
cedra account fund-with-faucet

# Compile the NFT contract
cedra move compile --named-addresses CedraNFTV2=default

# Publish the NFT contract
cedra move publish --named-addresses CedraNFTV2=default
```

**Important**: After publishing, note the deployed contract address. You'll see it in the output, or get it with:
```powershell
cedra account list --query modules
```

The address will look like: `0x1234567890abcdef...`

## Step 2: Deploy the English Auction Contract

```powershell
# Navigate to English auction contract
cd ..\..\auction-english-nft\contract

# Compile the auction contract
cedra move compile --named-addresses AuctionEnglishNFT=default

# Publish the auction contract
cedra move publish --named-addresses AuctionEnglishNFT=default
```

**Important**: Note this deployed address too!

## Step 3: Configure the Client

Edit `auction-english-nft\client\src\index.ts`:

1. **Set the Auction Contract Address** (line 5):
```typescript
const MODULE_ADDRESS = "0x..."; // Your English Auction contract address from Step 2
```

2. **Set the NFT Contract Address** (line 10):
```typescript
const NFT_MODULE_ADDRESS = "0x..."; // Your NFT contract address from Step 1
```

## Step 4: Run the Client

```powershell
cd ..\auction-english-nft\client
npm install
npm start
```

## Quick Start (If You Already Have Contracts Deployed)

If you already have contracts deployed, just update the addresses in `client/src/index.ts`:

```typescript
const MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // Your auction contract
const NFT_MODULE_ADDRESS = "0x..."; // Your NFT contract address
```

Then run:
```powershell
npm start
```

## What Happens When You Run

1. ✅ Creates seller and bidder accounts
2. ✅ Funds accounts with CEDRA tokens
3. ✅ **Mints an NFT to the seller** (if NFT_MODULE_ADDRESS is set)
4. ✅ Creates an English auction with the NFT
5. ✅ Places multiple bids
6. ✅ Shows automatic refunds
7. ✅ Finalizes auction
8. ✅ Claims refunds

## Troubleshooting

### "NFT_MODULE_ADDRESS not set"
- Deploy the NFT contract from `nft-example` and set the address

### "Collection doesn't exist"
- The NFT contract should auto-create the collection on deployment
- If not, the client will try to create it automatically

### "No NFT found"
- Make sure NFT_MODULE_ADDRESS is set correctly
- Wait a few seconds after minting for the indexer to update

## Alternative: Use Existing NFT Contract

If there's a public NFT contract on testnet, you can use that address instead of deploying your own. Just set `NFT_MODULE_ADDRESS` to that address.

