# Cedra NFT Collection V2 - Cedra Development Demo

This repository demonstrates Cedra development concepts using a Move smart contract for NFT collections and a TypeScript client application.

## Project Structure

- `/contract` - Move contract demonstrating Cedra NFT Collection concepts
- `/client` - TypeScript client for Cedra development integration

## Deploying the Contract

1. Configure Cedra CLI with your account:

```bash
cd contract
cedra init
```

This will create a new account or use an existing one. Follow the prompts to set it up.

2. Compile the contract:

```bash
cedra move compile --named-addresses CedraNFTV2=default
```

3. Publish the contract:

```bash
cedra move publish --named-addresses CedraNFTV2=default
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
npm install
```

3. Update the configuration in `src/index.ts` with your contract address:

```typescript
// Update these constants with your deployed contract information
const MODULE_ADDRESS = "_"; // Replace with your address
const MODULE_NAME = "CedraCollectionV2";
const DEPLOYER_PRIVATE_KEY_RAW = "_"; // Replace with your private key
```

**⚠️ Security Warning**: Never commit real private keys to version control. The placeholder values must be replaced with your actual values locally.

4. Run the client:

```bash
npm run start
```

## What the Demo Does

This demo demonstrates Cedra development concepts through a complete NFT lifecycle using modern blockchain standards:

1. **Account Setup**: 
   - Creates deployer account from private key
   - Generates two fresh user accounts
   - Funds user accounts with APT for transaction fees

2. **Collection Verification**: 
   - Verifies the NFT collection exists and is properly deployed

3. **NFT Minting**: 
   - Mints 3 unique NFTs with session-based names to prevent collisions
   - Distributes NFTs to different users (User1 gets 2, User2 gets 1)

4. **Balance Checking**: 
   - Displays NFT ownership counts using indexer APIs

5. **NFT Transfer**: 
   - Transfers one NFT from User1 to User2
   - Demonstrates ownership changes

6. **Final Verification**: 
   - Shows final NFT distribution (User1: 1 NFT, User2: 2 NFTs)

## Troubleshooting

If you encounter issues with the client:

1. Make sure the contract is deployed correctly
2. Check that the MODULE_ADDRESS and DEPLOYER_PRIVATE_KEY_RAW in the client match your deployed contract
3. Ensure your Node.js version is LTS (use `nvm use --lts` if you have nvm installed)
4. Check the network connectivity to network
5. If you get "EOBJECT_EXISTS" errors, the demo uses unique session IDs to prevent this
6. Rate limiting errors are temporary - wait a few minutes and try again

## Cedra Module Details

The Move contract demonstrates Cedra development patterns with the following functions:

### Collection Management
- `create_collection`: Creates the NFT collection (called automatically on module deployment)
- `collection_exists`: Checks if the collection exists
- `get_collection_owner`: Returns the collection owner address
- `get_collection_data`: Returns collection metadata (name, description, URI)

### NFT Operations
- `mint_nft`: Creates a new NFT and assigns it to an account (admin only)
- `transfer_nft`: Transfers an NFT between accounts using object address

### Cedra Development Features

- **Modern Digital Asset Standard**: Demonstrates Cedra's use of `cedra_token_objects` for better ecosystem integration
- **Automatic Collection Creation**: Collection is created when the module is deployed
- **Owner-Only Minting**: Only the deployer can mint new NFTs
- **Object-Based Architecture**: Uses Cedra Object model for NFTs
- **Indexer Integration**: Client demonstrates Cedra's integration with indexer APIs
- **Session-Based Naming**: Prevents object collision errors with unique token names

## Security Notes

⚠️ **CRITICAL - Educational Use Only**: This example demonstrates Cedra development concepts for educational purposes only. 

**NEVER do this in production:**

- ❌ Never hardcode private keys in source code
- ❌ Never commit private keys to version control (git)
- ❌ Never share private keys in chat, email, or any communication
- ❌ Never store private keys in plain text files

**Production Best Practices:**

- ✅ Use environment variables for sensitive configuration
- ✅ Use secure key management solutions (AWS KMS, HashiCorp Vault, etc.)
- ✅ Implement proper authentication and authorization
- ✅ Consider using multi-signature wallets for collection management
- ✅ Use hardware wallets for high-value operations
- ✅ Implement proper access controls and monitoring

**This demo is designed for learning Move/Cedra development concepts - treat all private keys as compromised and never use them for real assets.**

## License

MIT 