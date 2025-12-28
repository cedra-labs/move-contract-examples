# ExpandNFT Metadata Standards

This document defines the metadata standards for the ExpandNFT collection on Cedra blockchain, based on the contract implementation in `ExpandNFT.move`.

## Table of Contents

- [Overview](#overview)
- [Contract Metadata Configuration](#contract-metadata-configuration)
- [Token Metadata Format](#token-metadata-format)
- [Collection Metadata](#collection-metadata)
- [Implementation Guide](#implementation-guide)
- [Validation](#validation)
- [Examples from Client Code](#examples-from-client-code)

## Overview

The ExpandNFT contract uses Cedra's `cedra_token_objects` standard with the following configuration:

```move
const COLLECTION_NAME: vector<u8> = b"Cedra NFT Collection V2";
const COLLECTION_DESCRIPTION: vector<u8> = b"A modern collection of unique digital assets using Cedra Digital Asset standard";
const COLLECTION_URI: vector<u8> = b"https://metadata.cedra.dev/collection-v2.json";
const DEFAULT_ROYALTY: u64 = 100; // 1% (100 basis points out of 10000)
```

## Contract Metadata Configuration

### Collection Constants

The contract defines these hardcoded collection parameters:

| Constant | Value | Description |
|----------|-------|-------------|
| `COLLECTION_NAME` | `"Cedra NFT Collection V2"` | Fixed collection name |
| `COLLECTION_DESCRIPTION` | `"A modern collection of unique digital assets using Cedra Digital Asset standard"` | Collection description |
| `COLLECTION_URI` | `"https://metadata.cedra.dev/collection-v2.json"` | Collection metadata URI |
| `LIMIT_MINT_PER_TX` | `3` | Maximum NFTs per batch mint |
| `DEFAULT_ROYALTY` | `100` | Default royalty (1%) |

### Royalty Configuration

The contract supports two royalty configurations:

**Default Royalty (1%):**
```move
public entry fun create_collection(creator: &signer)
```

**Custom Royalty:**
```move
public entry fun create_collection_with_royalty(creator: &signer, royalty_basis_points: u64)
```

Royalty is calculated as: `royalty_basis_points / 10000`
- Example: `100` = 1%, `500` = 5%, `1000` = 10%
- Maximum: `10000` (100%)

## Token Metadata Format

### Required Parameters for Minting

Based on the `mint_nft` function signature:

```move
public entry fun mint_nft(
    creator: &signer,
    to: address,
    name: String,
    description: String,
    uri: String,
)
```

Each token requires three metadata strings:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | `String` | Unique token name (must not exist in collection) | `"Cedra Genesis #1 [1704067200]"` |
| `description` | `String` | Token description | `"First NFT in the collection"` |
| `uri` | `String` | URL to JSON metadata file | `"https://metadata.cedra.dev/v2/genesis-1.json"` |

### URI Metadata File Format

The `uri` parameter should point to a JSON file with this structure:

```json
{
  "name": "Cedra Genesis #1",
  "description": "First NFT in the collection",
  "image": "https://metadata.cedra.dev/images/genesis-1.png",
  "attributes": [
    {
      "trait_type": "Edition",
      "value": "Genesis"
    },
    {
      "trait_type": "Mint Number",
      "value": 1
    }
  ]
}
```

### Token Naming Strategy

From the client implementation, tokens use session-based unique names to prevent collisions:

```typescript
const SESSION_ID: number = Date.now();
const nftName1 = `Cedra Genesis #1 [${SESSION_ID}]`;
```

**Best Practice:** Include a unique identifier (timestamp, UUID, or sequential number) in token names to avoid `EOBJECT_EXISTS` errors.

## Collection Metadata

The collection URI (`https://metadata.cedra.dev/collection-v2.json`) should contain:

```json
{
  "name": "Cedra NFT Collection V2",
  "description": "A modern collection of unique digital assets using Cedra Digital Asset standard",
  "image": "https://metadata.cedra.dev/collection-logo.png",
  "external_link": "https://yourproject.com",
  "seller_fee_basis_points": 100,
  "fee_recipient": "0xYourCreatorAddress"
}
```

This matches the contract constants and provides marketplace integration data.