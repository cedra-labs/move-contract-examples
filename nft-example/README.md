# ExpandNFT Collection

A production-ready NFT collection implementation on Cedra blockchain using the modern Digital Asset standard. Features batch minting, customizable royalties, flexible collection naming, and comprehensive testing.

## Overview

ExpandNFT is a smart contract system that demonstrates best practices for NFT collection management on Cedra, including:

- **Flexible Collection Naming**: Create collections with custom names
- **Batch Minting**: Mint up to 3 NFTs per transaction for gas efficiency
- **Customizable Royalties**: Configure custom royalty percentages (default 1%)
- **Modern Standards**: Built on `cedra_token_objects` for ecosystem compatibility
- **Production Ready**: Comprehensive test coverage and security considerations

## Project Structure

```
.
├── contract/
│   ├── sources/
│   │    └── cedra_nft.move      # Main NFT collection contract
│   │
│   └── tests/
│       └── test.move             # Comprehensive test suite
│
└── client/
    └── src/
        └── index.ts              # TypeScript integration example
```

## Smart Contract API

### Collection Management

#### `create_collection(creator: &signer)`
Creates the NFT collection with default name and royalty (1%).

**Permissions**: Anyone can call, but collection is tied to caller's address

```move
public entry fun create_collection(creator: &signer)
```

#### `create_collection_with_royalty(creator: &signer, collection_name: String, royalty_basis_points: u64)`
Creates collection with custom name and royalty percentage.

**Parameters**:
- `collection_name`: Custom collection name (must not be empty)
- `royalty_basis_points`: Royalty in basis points (e.g., 500 = 5%, max 10000 = 100%)

**Error Codes**:
- `ENOT_NAME (5)`: Collection name is empty

```move
public entry fun create_collection_with_royalty(
    creator: &signer, 
    collection_name: String, 
    royalty_basis_points: u64
)
```

### Minting Operations

#### `mint_nft(creator: &signer, to: address, name: String, description: String, uri: String)`
Mints a single NFT to specified address.

**Parameters**:
- `to`: Recipient address
- `name`: Unique token name
- `description`: Token description
- `uri`: Metadata URI (typically JSON)

**Requirements**: Caller must be collection creator

```move
public entry fun mint_nft(
    creator: &signer,
    to: address,
    name: String,
    description: String,
    uri: String,
)
```

#### `mint_batch_nft(creator: &signer, to: address, names: vector<String>, descriptions: vector<String>, uris: vector<String>)`
Mints multiple NFTs in a single transaction.

**Parameters**:
- `to`: Recipient address
- `names`, `descriptions`, `uris`: Vectors of equal length (max 3 items)

**Requirements**:
- All vectors must have equal length
- Vectors must not be empty
- Maximum 3 NFTs per transaction

**Error Codes**:
- `EDIFFERENT_LENGTH (2)`: Vector lengths don't match
- `ENOT_VALUES (3)`: Empty vectors provided
- `ETOO_MANY_TOKENS (4)`: Exceeds 3 token limit

```move
public entry fun mint_batch_nft(
    creator: &signer, 
    to: address, 
    names: vector<String>, 
    descriptions: vector<String>, 
    uris: vector<String>
)
```

### Transfer Operations

#### `transfer_nft(from: &signer, object: Object<token::Token>, to: address)`
Transfers NFT between accounts.

**Note**: You can use `object::transfer` directly; this wrapper is for demonstration.

```move
public entry fun transfer_nft(
    from: &signer,
    object: Object<token::Token>,
    to: address,
)
```

### View Functions

#### `collection_exists(creator_address: address): bool`
Checks if default collection exists for given creator address.

```move
#[view]
public fun collection_exists(creator_address: address): bool
```

#### `collection_exists_with_name(creator_address: address, collection_name: String): bool`
Checks if collection with specific name exists for given creator.

**Parameters**:
- `creator_address`: Address of collection creator
- `collection_name`: Name of the collection to check

**Returns**: `true` if collection exists, `false` otherwise

```move
#[view]
public fun collection_exists_with_name(creator_address: address, collection_name: String): bool
```

#### `get_collection_owner(creator_address: address): address`
Returns collection owner/creator address.

```move
#[view]
public fun get_collection_owner(creator_address: address): address
```

#### `get_collection_data(creator_address: address): (String, String, String)`
Returns collection metadata tuple: (name, description, uri).

Returns empty strings if collection doesn't exist.

```move
#[view]
public fun get_collection_data(creator_address: address): (String, String, String)
```

## Integration Guide

### Setup & Deployment

1. **Initialize Cedra account**:
```bash
cd contract
cedra init
```

2. **Compile contract**:
```bash
cedra move compile --named-addresses ExpandNFT=default
```

3. **Deploy to network**:
```bash
cedra move publish --named-addresses ExpandNFT=default
```

4. **Get deployed address**:
```bash
cedra account list --query modules
```

5. **Run the development server**:
```bash
cd ../client
npm install @cedra-labs/ts-sdk
npm run start
```

### TypeScript Integration

#### Basic Setup

```typescript
import { 
  Account, 
  Cedra, 
  CedraConfig, 
  Network,
  Ed25519PrivateKey 
} from "@cedra-labs/ts-sdk";

const config = new CedraConfig({ 
  network: Network.DEVNET,
  fullnode: "https://testnet.cedra.dev/v1",
  faucet: "https://faucet-api.cedra.dev"
});

const cedra = new Cedra(config);
const MODULE_ADDRESS = "0xYourDeployedAddress";
const MODULE_NAME = "ExpandNFT";
```

#### Create Collection with Custom Name and Royalty

```typescript
const createCollectionWithRoyalty = async (
  signer: Account,
  collectionName: string,
  royaltyBasisPoints: number
): Promise<string> => {
  const transaction = await cedra.transaction.build.simple({
    sender: signer.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_collection_with_royalty`,
      functionArguments: [collectionName, royaltyBasisPoints]
    }
  });

  const response = await cedra.signAndSubmitTransaction({
    signer,
    transaction
  });

  await cedra.waitForTransaction({ transactionHash: response.hash });
  return response.hash;
};

// Usage
await createCollectionWithRoyalty(
  deployerAccount,
  "My Custom NFT Collection",
  500 // 5% royalty
);
```

#### Check Collection Exists (with name)

```typescript
const checkCollectionExists = async (
  creatorAddress: string,
  collectionName: string
): Promise<boolean> => {
  const result = await cedra.view({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::collection_exists_with_name`,
      typeArguments: [],
      functionArguments: [creatorAddress, collectionName]
    }
  });
  
  return result[0] as boolean;
};

// Usage
const exists = await checkCollectionExists(
  "0x123...",
  "My Custom NFT Collection"
);
console.log("Collection exists:", exists);
```

#### Mint Single NFT

```typescript
const mintNFT = async (
  signer: Account, 
  to: string, 
  name: string, 
  description: string, 
  uri: string
): Promise<string> => {
  const transaction = await cedra.transaction.build.simple({
    sender: signer.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::mint_nft`,
      functionArguments: [to, name, description, uri]
    }
  });
  
  const response = await cedra.signAndSubmitTransaction({ 
    signer, 
    transaction 
  });
  
  await cedra.waitForTransaction({ transactionHash: response.hash });
  return response.hash;
};
```

#### Batch Mint NFTs

```typescript
interface NFTMetadata {
  name: string;
  description: string;
  uri: string;
}

const mintBatch = async (
  signer: Account, 
  to: string, 
  nfts: NFTMetadata[]
): Promise<string> => {
  // Extract parallel arrays
  const names = nfts.map(nft => nft.name);
  const descriptions = nfts.map(nft => nft.description);
  const uris = nfts.map(nft => nft.uri);
  
  const transaction = await cedra.transaction.build.simple({
    sender: signer.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::mint_batch_nft`,
      functionArguments: [to, names, descriptions, uris]
    }
  });
  
  const response = await cedra.signAndSubmitTransaction({ 
    signer, 
    transaction 
  });
  
  await cedra.waitForTransaction({ transactionHash: response.hash });
  return response.hash;
};
```

#### Transfer NFT

```typescript
const transferNFT = async (
  signer: Account, 
  objectAddress: string,
  to: string
): Promise<string> => {
  const transaction = await cedra.transaction.build.simple({
    sender: signer.accountAddress,
    data: { 
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::transfer_nft`,
      functionArguments: [objectAddress, to]
    }
  });
  
  const response = await cedra.signAndSubmitTransaction({ 
    signer, 
    transaction 
  });
  
  await cedra.waitForTransaction({ transactionHash: response.hash });
  return response.hash;
};
```

#### Query Owned NFTs

```typescript
const getOwnedNFTs = async (address: string): Promise<any[]> => {
  const tokens = await cedra.getAccountOwnedTokens({
    accountAddress: address,
    options: {
      tokenStandard: "v2"
    }
  });
  
  return tokens;
};
```

### Complete Usage Example

```typescript
async function demo() {
  // Setup
  const deployer = Account.generate();
  const recipient = Account.generate();
  
  // Fund accounts
  await cedra.faucet.fundAccount({ 
    accountAddress: deployer.accountAddress, 
    amount: 100_000_000 
  });
  
  // Create collection with custom name and 5% royalty
  await createCollectionWithRoyalty(
    deployer,
    "Epic NFT Collection",
    500
  );
  
  // Verify collection
  const exists = await checkCollectionExists(
    deployer.accountAddress.toString(),
    "Epic NFT Collection"
  );
  console.log(`Collection exists: ${exists}`);
  
  // Batch mint 3 NFTs
  const nfts: NFTMetadata[] = [
    {
      name: "Genesis #1",
      description: "First NFT",
      uri: "https://metadata.example.com/1.json"
    },
    {
      name: "Genesis #2",
      description: "Second NFT",
      uri: "https://metadata.example.com/2.json"
    },
    {
      name: "Special Edition",
      description: "Rare NFT",
      uri: "https://metadata.example.com/special.json"
    }
  ];
  
  await mintBatch(deployer, deployer.accountAddress.toString(), nfts);
  
  // Check balances after indexer update
  await new Promise(resolve => setTimeout(resolve, 3000));
  const tokens = await getOwnedNFTs(deployer.accountAddress.toString());
  console.log(`Owner has ${tokens.length} NFTs`);
  
  // Transfer first NFT
  if (tokens.length > 0) {
    const firstNFT = tokens[0].token_data_id;
    await transferNFT(deployer, firstNFT, recipient.accountAddress.toString());
  }
}
```

## Testing

Run the comprehensive test suite:

```bash
cd contract
cedra move test
```

### Test Coverage

**Collection Creation:**
- ✅ Collection creation with default royalty
- ✅ Collection creation with custom name and royalty
- ✅ Error handling: empty collection name
- ✅ Error handling: royalty exceeding 100%

**NFT Minting:**
- ✅ Single NFT minting
- ✅ Batch NFT minting (valid cases)
- ✅ Error handling: mismatched vector lengths
- ✅ Error handling: empty vectors
- ✅ Error handling: exceeding batch limit

**View Functions:**
- ✅ Collection existence check with default name
- ✅ Collection existence check with custom name

## Security Considerations

### Private Key Management

**⚠️ CRITICAL**: The example code uses environment variables for private keys. In production:

- ✅ Use hardware wallets for high-value operations
- ✅ Implement multi-signature wallets for collection management
- ✅ Use secure key management systems (AWS KMS, HashiCorp Vault)
- ✅ Never commit private keys to version control
- ✅ Use environment variables or secure secret management

### Smart Contract Security

- **Collection Name Validation**: Names must not be empty
- **Royalty Validation**: Royalties are validated to not exceed 100%
- **Access Control**: Only collection creator can mint NFTs
- **Batch Limits**: Enforced 3 NFT limit per transaction prevents resource exhaustion
- **Named Tokens**: Prevents object address collisions with unique naming

## Configuration

Environment variables for client integration:

```bash
# Required
MODULE_ADDRESS=0xYourContractAddress
PRIVATE_KEY=0xYourPrivateKeyHex

# Optional (defaults shown)
NETWORK=devnet
FULLNODE_URL=https://testnet.cedra.dev/v1
FAUCET_URL=https://faucet-api.cedra.dev
```

## Troubleshooting

**Issue**: `ENOT_NAME` error when creating collection
- **Solution**: Ensure collection name is not empty

**Issue**: `EOBJECT_EXISTS` error when minting
- **Solution**: Use unique token names with timestamps or UUIDs

**Issue**: Royalty validation error (abort code 0x10004)
- **Solution**: Ensure royalty basis points don't exceed 10000 (100%)

**Issue**: Indexer shows no NFTs immediately after minting
- **Solution**: Wait 2-3 seconds for indexer synchronization

**Issue**: Batch mint fails with `EDIFFERENT_LENGTH`
- **Solution**: Ensure all arrays (names, descriptions, uris) have equal length

**Issue**: Rate limiting errors
- **Solution**: Reduce request frequency, wait between transactions

## Constants Reference

```move
COLLECTION_NAME: "Cedra NFT Collection V2" (default)
COLLECTION_DESCRIPTION: "A modern collection of unique digital assets..."
COLLECTION_URI: "https://metadata.cedra.dev/collection-v2.json"
LIMIT_MINT_PER_TX: 3
DEFAULT_ROYALTY: 100 (1%)

// Error Codes
ENOT_CREATOR: 1        // Only collection creator can mint
EDIFFERENT_LENGTH: 2   // Batch vectors have different lengths
ENOT_VALUES: 3         // Empty vectors provided
ETOO_MANY_TOKENS: 4    // Exceeds batch limit
ENOT_NAME: 5           // Collection name is empty
```

## Best Practices

### Collection Naming
- Use descriptive, unique names for collections
- Avoid special characters that might cause parsing issues
- Consider including version numbers for upgrades

### Royalty Configuration
- Standard range: 2.5% - 10% (250 - 1000 basis points)
- Maximum: 100% (10000 basis points)
- Zero royalty is valid for public domain projects

### Batch Minting
- Use batch minting for gas efficiency when minting multiple NFTs
- Respect the 3 NFT per transaction limit
- Generate unique names to avoid collisions

### Metadata Management
- Store metadata on IPFS or decentralized storage
- Follow JSON metadata standards for NFT marketplaces
- Include version numbers in URIs for upgrades

## License

MIT License - See LICENSE file for details