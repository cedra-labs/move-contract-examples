# DEX Client Example

This TypeScript client demonstrates how to interact with a decentralized exchange (DEX) smart contract on the Cedra network.

## Overview

The client showcases all essential DEX operations:
- Creating trading pairs
- Adding liquidity (initial and subsequent)
- Executing token swaps
- Understanding price impact
- Handling common errors

## Prerequisites

- Node.js (v16 or higher)
- npm or pnpm package manager
- Access to Cedra testnet

## Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## Configuration

The client connects to Cedra testnet by default. Key configuration in `src/index.ts`:

```typescript
const MODULE_ADDRESS = "0xbeaeaff8da45012f8fff424eab43c39c5330cd8c1066cbe04542a91734468df8";
const NETWORK = Network.DEVNET;
const NODE_URL = "https://testnet.cedra.dev/v1";
```

To use your own deployed DEX contract, update the `MODULE_ADDRESS`.

## Running the Example

```bash
npm start
```

This will run through all DEX examples sequentially:
1. Setting up accounts and minting test tokens
2. Creating an ETH/BTC trading pair
3. Adding initial liquidity (demonstrates LP token calculation)
4. Adding more liquidity (shows ratio maintenance)
5. Executing swaps with price impact
6. Demonstrating common errors and protections

## Example Output

The client provides clear, educational output:
- Token balances displayed in tables
- Step-by-step transaction confirmations
- Mathematical calculations shown (AMM formulas)
- Price impact analysis
- Error handling demonstrations

## Customization

To build your own DEX client:

1. **Deploy your DEX contract** and update `MODULE_ADDRESS`
2. **Modify token types** in the `getTokenMetadata()` function
3. **Adjust trading pairs** in the example scenarios
4. **Add custom features** like:
   - Multi-hop swaps
   - Slippage protection
   - Liquidity mining rewards
   - Advanced order types

## Key Functions

- `createTradingPair()` - Creates a new liquidity pool
- `addLiquidity()` - Adds tokens to a pool
- `executeSwap()` - Swaps tokens using the AMM
- `calculateSwapOutput()` - Predicts swap output using AMM math
- `displayPoolInfo()` - Shows pool reserves and metrics

## Understanding the AMM

This DEX uses the constant product formula:
```
x * y = k
```

Where:
- `x` = reserve of token X
- `y` = reserve of token Y
- `k` = constant product

Each swap includes a 0.3% fee that stays in the pool.

## Troubleshooting

If you encounter errors:
1. Ensure the DEX contract is deployed at the correct address
2. Check network connectivity to Cedra testnet
3. Verify test tokens module is initialized
4. Make sure you have enough CEDRA for gas fees

## Next Steps

1. Study the contract source code in `../../sources/`
2. Modify swap amounts to observe price impacts
3. Implement additional features like limit orders
4. Deploy your own customized DEX!

## Resources

- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Reference](https://move-language.github.io/move/)
- DEX Contract: See `../../sources/` directory