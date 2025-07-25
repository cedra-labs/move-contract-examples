# DEX Client Example

A basic TypeScript client that demonstrates all core functionality of the DEX implementation.

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Deployed DEX contracts on Cedra testnet

## Setup

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Deploy the DEX contracts first (from the parent directory):
```bash
cd ..
cedra move compile --named-addresses math_amm=default,swap=default,slippage=default,multihop=default
cedra move publish --named-addresses math_amm=default,swap=default,slippage=default,multihop=default
```

3. Update the module addresses in `src/index.ts` with your deployed addresses:
```typescript
const MODULE_ADDRESSES = {
  math_amm: "0x123...", // Your deployed address
  swap: "0x123...",     // Your deployed address
  slippage: "0x123...", // Your deployed address
  multihop: "0x123..."  // Your deployed address
};
```

## Running the Example

```bash
npm start
# or
pnpm start
```

## What the Client Does

The client demonstrates a complete DEX workflow using Cedra's built-in test assets:

1. **Account Setup**: Creates and funds test accounts
2. **Asset Minting**: Uses Cedra's test minter to mint ETH, BTC, and USDC
3. **DEX Setup**: Creates trading pairs (ETH/BTC and BTC/USDC)
4. **Liquidity Provision**: Adds initial liquidity to both pools
5. **Token Swaps**: Performs various swap operations:
   - Simple swap (ETH → BTC)
   - Safe swap with slippage protection
   - Multi-hop swap (ETH → BTC → USDC)
6. **Balance Tracking**: Shows balances before and after operations

## Features Demonstrated

- ✅ AMM constant product formula (x*y=k)
- ✅ 0.3% trading fee
- ✅ Liquidity provision with LP tokens
- ✅ Token swapping with real test assets (ETH, BTC, USDC)
- ✅ Slippage protection (max 5% default)
- ✅ Price impact protection (max 3%)
- ✅ Multi-hop routing for better prices
- ✅ Integration with Cedra's test asset minter

## Security Note

⚠️ **WARNING**: This example uses generated private keys for educational purposes only. Never use private keys directly in production applications. Always use secure wallet connections instead.

## Output Example

```
🚀 Starting DEX Example...

📝 Creating accounts...
Deployer: 0x123...
Liquidity Provider: 0x456...
Trader: 0x789...

💰 Funding accounts...
✅ Accounts funded successfully

🪙 Minting test assets...
✅ Minted 10 ETH
✅ Minted 5 BTC
✅ Minted 50,000 USDC

...and more
```

## Troubleshooting

- **Module not found**: Make sure you've deployed the contracts and updated the addresses
- **Insufficient balance**: The faucet might be rate-limited, wait a bit and try again
- **Transaction failed**: Check that your account has enough gas fees
- **Minting failed**: Ensure you're using the correct Cedra testnet and the minter contract is available

## Alternative: Manual Asset Minting

If you prefer to mint assets manually using the Cedra CLI:

```bash
# Mint test ETH (1 ETH):
cedra move run --function-id 0x45d869282e5605c700c8f153c80770b5dc9af2beadc3a35aa1c03aabff25f41c::minter::mint_ETH --args u64:100000000 --assume-yes

# Mint test BTC (1 BTC):
cedra move run --function-id 0x45d869282e5605c700c8f153c80770b5dc9af2beadc3a35aa1c03aabff25f41c::minter::mint_BTC --args u64:100000000 --assume-yes

# Mint test USDC (1000 USDC):
cedra move run --function-id 0x45d869282e5605c700c8f153c80770b5dc9af2beadc3a35aa1c03aabff25f41c::minter::mint_USDC --args u64:100000000000 --assume-yes
```