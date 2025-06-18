# Fee Splitter

A smart contract for automatically distributing payments among multiple recipients based on predefined shares.

## Overview

The Fee Splitter contract allows you to:
- Create configurable payment distribution schemes
- Automatically split payments proportionally
- Distribute any fungible asset (CEDRA, USDC, etc.)
- Ensure secure, direct transfers with no custody risk

## Quick Start

### Deploy Contract

```bash
cd contract
aptos init
aptos account fund-with-faucet
aptos move compile --named-addresses FeeSplitter=default
aptos move publish --named-addresses FeeSplitter=default
```

### Run Client Example

```bash
cd client
npm install
npm start
```

## How It Works

1. **Create a Splitter**: Define recipients and their shares
2. **Distribute Payments**: Send funds that get automatically split
3. **Direct Transfers**: Funds go directly to recipients (no intermediate storage)

### Example

```typescript
// Create splitter: 50% Alice, 30% Bob, 20% Charlie
const recipients = [
  { address: alice.address, share: 50 },
  { address: bob.address, share: 30 },
  { address: charlie.address, share: 20 }
];

await client.createSplitter(creator, recipients);

// Distribute 1 CEDRA according to shares
await client.distributeFees(payer, creator.address, 100_000_000);
// Result: Alice gets 0.5 CEDRA, Bob gets 0.3 CEDRA, Charlie gets 0.2 CEDRA
```

## Contract API

### Functions

- `create_splitter(addresses: vector<address>, shares: vector<u64>)`
- `distribute_fees(splitter_owner: address, asset_metadata: Object<Metadata>, amount: u64)`
- `get_splitter_info(splitter_address: address): (vector<Recipient>, u64)` (view)
- `splitter_exists(splitter_address: address): bool` (view)
- `is_recipient(splitter_address: address, recipient_address: address): bool` (view)

### Distribution Formula

```
recipient_amount = (total_amount × recipient_share) ÷ total_shares
```

## Client Library

### Installation

```bash
npm install @aptos-labs/ts-sdk
```

### Usage

```typescript
import { FeeSplitterClient } from './src/index';

const client = new FeeSplitterClient();

// Create splitter
await client.createSplitter(creator, recipients);

// Distribute fees  
await client.distributeFees(sender, splitterOwner, amount);

// Get info
const info = await client.getSplitterInfo(address);
```

## Project Structure

```
fee-splitter/
├── contract/
│   ├── sources/fee_splitter.move
│   ├── tests/fee_splitter_test.move
│   └── Move.toml
├── client/
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Development

### Prerequisites
- Node.js 18+
- Cedra CLI

### Build and Test

```bash
# Run unit tests
cd contract
aptos move test --named-addresses FeeSplitter=default

# Deploy contract
aptos init
aptos account fund-with-faucet
aptos move compile --named-addresses FeeSplitter=default
aptos move publish --named-addresses FeeSplitter=default

# Test client
cd ../client
npm install
npm start
```

#### Running Tests

The contract includes comprehensive unit tests covering all functionality:

```bash
cd contract
aptos move test --named-addresses FeeSplitter=default
```

**Test Coverage:**
- ✅ Splitter creation (single/multiple recipients, maximum shares)
- ✅ Multiple fee distribution cycles
- ✅ View functions (`get_splitter_info`, `splitter_exists`, `is_recipient`)
- ✅ Error cases (invalid inputs, non-existent splitters)
- ✅ Edge cases (zero amounts, excessive shares)

## Security Features

- ✅ **No custody risk** - direct transfers only
- ✅ **Input validation** - prevents invalid configurations  
- ✅ **Balance verification** - ensures sufficient funds
- ✅ **Atomic execution** - all-or-nothing distribution

## Use Cases

- Revenue sharing for DAOs
- Royalty distribution for NFTs  
- Commission splitting for marketplaces
- Profit sharing for partnerships
- Fee distribution for protocols

## License

MIT License 