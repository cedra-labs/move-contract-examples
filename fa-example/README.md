# CedraAsset - Cedra Fungible Asset Demo

This repository contains a Move smart contract for a fungible asset called "CedraAsset" and a TypeScript client application to interact with it.

## Prerequisites

- [CLI](https://docs.cedra.network/getting-started/cli) (v1.0.0 or later)
- [Node.js](https://nodejs.org/) LTS version (v16.x or later)
- [pnpm](https://pnpm.io/) (v6.x or later)

## Project Structure

- `/contract` - Move contract for CedraAsset
- `/client` - TypeScript client application

## Deploying the Contract

1. Configure CLI with your account:

```bash
cd contract
cedra init
```

This will create a new account or use an existing one. Follow the prompts to set it up.

2. Compile the contract:

```bash
cedra move compile --named-addresses CedraFungible=default
```

3. Publish the contract:

```bash
cedra move publish --named-addresses CedraFungible=default
```

4. Take note of the account address where the contract is deployed, you'll need it for the client:

```bash
cedra account list --query modules
```

## Setting Up and Running the Client

1. Navigate to the client directory:

```bash
cd ../client
```

2. Install the dependencies:

```bash
pnpm install
```

3. Update the configuration in `src/index.ts` with your contract address:

```typescript
// Update these constants with your deployed contract information
const MODULE_ADDRESS = "_"; // Replace with your address
const MODULE_NAME = "_";
const ADMIN_PRIVATE_KEY = "_"; // Using private key to create account is a security risk, this is only for educational purposes. For production use, do not define your private key as this will expose to the public
```

4. Run the client:

```bash
pnpm run start
```

Or run the deflationary token example:

```bash
pnpm run deflationary
```

## What the Demo Does

This demo performs a complete lifecycle of CedraAsset token operations:

1. Creates two accounts: 
   - Admin (the deployer account)
   - User (a new account)

2. Funds the User account with enough APT to pay for transaction fees

3. Checks initial token balances for both accounts

4. Mints CedraAsset tokens from Admin to User (500 tokens)

5. Transfers tokens from User back to Admin (250 tokens)

6. Verifies the final token balances after all operations

## Troubleshooting

If you encounter issues with the client:

1. Make sure the contract is deployed correctly
2. Check that the MODULE_ADDRESS and ADMIN_PRIVATE_KEY in the client match your deployed contract
3. Ensure your Node.js version is LTS (use `nvm use --lts` if you have nvm installed)
4. Check the network connectivity to Cedra devnet

## Cedra Module Details

The Move contract implements a fungible asset with the following functions:

- `mint`: Mints new tokens to a specified account (only callable by admin)
- `transfer`: Transfers tokens between accounts
- `burn`: Burns tokens from the sender's account, permanently removing them from circulation

## Token Burning: When and Why

### What is Token Burning?

Token burning is the process of permanently removing tokens from circulation by sending them to an unspendable address or destroying them. This reduces the total supply of the token.

### When to Burn Tokens

1. **Deflationary Token Model**: Create a deflationary token where the supply decreases over time, potentially increasing the value of remaining tokens.

2. **Fee Collection**: Burn a portion of transaction fees to reduce supply and create value for token holders.

3. **Excess Supply Reduction**: If too many tokens were minted, burning can help restore balance to the tokenomics.

4. **Proof of Burn**: Users can burn tokens as a way to prove commitment or participate in certain protocols.

5. **Revenue Sharing**: Projects can buy back and burn tokens using revenue, similar to stock buybacks.

### Why Burn Tokens?

- **Value Appreciation**: Reducing supply (assuming constant or increasing demand) can increase the value of remaining tokens
- **Tokenomics Control**: Maintain better control over token supply and inflation
- **Community Trust**: Demonstrates commitment to token value and long-term sustainability
- **Deflationary Pressure**: Creates natural deflationary pressure that can benefit holders

### Deflationary Token Example

This contract supports deflationary token mechanics. Here's how it works:

1. **Initial Supply**: Tokens are minted by the admin
2. **Usage**: Tokens are transferred between users
3. **Burning**: Users can burn their tokens, reducing total supply
4. **Result**: Over time, the total supply decreases, making each remaining token potentially more valuable

**Example Scenario:**
- Initial supply: 1,000,000 tokens
- Users burn 100,000 tokens over time
- Final supply: 900,000 tokens
- If demand stays constant, each token becomes more valuable

### Using the Burn Function

Users can burn their own tokens by calling the `burn` function:

```move
burn(sender: &signer, amount: u64)
```

This permanently removes the specified amount of tokens from the sender's account and from the total supply.

## License

MIT