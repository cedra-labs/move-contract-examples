# CedraAsset - Cedra Fungible Asset Demo

This repository contains a Move smart contract for a fungible asset called "CedraAsset" and a TypeScript client application to interact with it.

## Prerequisites

- [CLI](https://aptos.dev/tools/aptos-cli/install-cli/) (v2.0.0 or later)
- [Node.js](https://nodejs.org/) LTS version (v16.x or later)
- [pnpm](https://pnpm.io/) (v6.x or later)

## Project Structure

- `/contract` - Move contract for CedraAsset
- `/client` - TypeScript client application

## Deploying the Contract

1. Configure CLI with your account:

```bash
cd contract
aptos init
```

This will create a new account or use an existing one. Follow the prompts to set it up.

2. Compile the contract:

```bash
aptos move compile
```

3. Publish the contract:

```bash
aptos move publish
```

4. Take note of the account address where the contract is deployed, you'll need it for the client:

```bash
aptos account list --query modules
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
4. Check the network connectivity to Aptos devnet

## Aptos Module Details

The Move contract implements a fungible asset with the following functions:

- `mint`: Mints new tokens to a specified account (only callable by admin)
- `transfer`: Transfers tokens between accounts

## License

MIT