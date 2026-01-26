# Fee Splitter

A comprehensive smart contract for automatically distributing payments among multiple recipients based on predefined shares with advanced admin controls and gas-efficient operations.

## Overview

The Fee Splitter contract allows you to:
- Create configurable payment distribution schemes with up to 50 recipients
- Automatically split payments proportionally with overflow protection
- Distribute any fungible asset (CEDRA, USDC, etc.)
- Ensure secure, direct transfers with no custody risk
- Admin controls: update recipients, pause/unpause, transfer ownership
- Gas-efficient distribution with pre-calculation optimization
- Comprehensive event logging for transparency
- Emergency deletion for unused splitters

## Quick Start

### Deploy Contract

```bash
cd contract
cedra init
cedra account fund-with-faucet
cedra move compile --named-addresses fee_splitter=default
cedra move publish --named-addresses fee_splitter=default
```

### Run Client Example

```bash
cd client
npm install
npm start
```

## How It Works

1. **Create a Splitter**: Define recipients and their shares with validation
2. **Admin Controls**: Update recipients, pause distributions, transfer ownership
3. **Distribute Payments**: Send funds that get automatically split
4. **Direct Transfers**: Funds go directly to recipients (no intermediate storage)
5. **Event Tracking**: All operations emit events for transparency

### Example

```typescript
// Create splitter: 50% Alice, 30% Bob, 20% Charlie
const recipients = [
  { address: alice.address, share: 50 },
  { address: bob.address, share: 30 },
  { address: charlie.address, share: 20 }
];

await client.createSplitter(creator, recipients);

// Update recipients
const newRecipients = [
  { address: alice.address, share: 40 },
  { address: bob.address, share: 35 },
  { address: charlie.address, share: 25 }
];
await client.updateSplitter(creator, newRecipients);

// Pause/unpause distributions
await client.setPaused(creator, true);
await client.setPaused(creator, false);

// Distribute 1 CEDRA according to shares
await client.distributeFees(payer, creator.address, 100_000_000);
// Result: Alice gets 0.4 CEDRA, Bob gets 0.35 CEDRA, Charlie gets 0.25 CEDRA

// Transfer ownership
await client.transferOwnership(creator, newOwner.address);
```

## Contract API

### Functions

#### Core Functions
- `create_splitter(addresses: vector<address>, shares: vector<u64>)` - Create new splitter
- `distribute_fees(splitter_owner: address, asset_metadata: Object<Metadata>, amount: u64)` - Distribute payments

#### Admin Functions
- `update_splitter(addresses: vector<address>, shares: vector<u64>)` - Update recipients/shares (owner only)
- `set_paused(paused: bool)` - Pause/unpause distributions (owner only)
- `transfer_ownership(new_owner: address)` - Transfer splitter ownership (owner only)
- `delete_splitter()` - Delete unused splitter (owner only, no distributions)

#### View Functions
- `get_splitter_info(splitter_address: address): (vector<Recipient>, u64)` - Basic info
- `get_splitter_details(splitter_address: address): (vector<Recipient>, u64, address, bool, u64, u64)` - Full details
- `splitter_exists(splitter_address: address): bool` - Check existence
- `is_recipient(splitter_address: address, recipient_address: address): bool` - Check recipient status

### Events

- `SplitterCreated` - Emitted when splitter is created
- `FeesDistributed` - Emitted on each distribution with amounts
- `SplitterUpdated` - Emitted when recipients are updated
- `OwnershipTransferred` - Emitted on ownership changes
- `SplitterPaused` - Emitted when pause status changes

### Distribution Formula

```
recipient_amount = (total_amount × recipient_share) ÷ total_shares
```

Amounts are calculated with overflow protection and only transferred if > 0.

## Client Library

### Installation

```bash
npm install @cedra-labs/ts-sdk
```

### Usage

```typescript
import { FeeSplitterClient } from './src/index';

const client = new FeeSplitterClient();

// Create splitter
await client.createSplitter(creator, recipients);

// Admin operations
await client.updateSplitter(owner, newRecipients);
await client.setPaused(owner, true);
await client.transferOwnership(owner, newOwner);

// Distribute fees
await client.distributeFees(sender, splitterOwner, amount);

// Get information
const info = await client.getSplitterInfo(address);
const details = await client.getSplitterDetails(address);
```

## Advanced Features

### Gas Optimization

- **Pre-calculation**: Recipient amounts calculated before transfers
- **Batch Operations**: Efficient vector operations
- **Conditional Transfers**: Only transfer non-zero amounts

### Security Features

- ✅ **No custody risk** - direct transfers only
- ✅ **Input validation** - prevents invalid configurations
- ✅ **Duplicate prevention** - no duplicate recipients
- ✅ **Zero address protection** - prevents zero address recipients
- ✅ **Overflow protection** - safe math operations
- ✅ **Owner authorization** - admin functions require owner
- ✅ **Pause mechanism** - emergency stop functionality

### Admin Controls

- **Update Recipients**: Change shares and addresses (owner only)
- **Pause/Unpause**: Emergency stop for distributions
- **Transfer Ownership**: Move splitter to new owner
- **Delete Splitter**: Remove unused splitters (no distributions required)

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
cedra move test --named-addresses fee_splitter=default

# Deploy contract
cedra init
cedra account fund-with-faucet
cedra move compile --named-addresses fee_splitter=default
cedra move publish --named-addresses fee_splitter=default

# Test client
cd ../client
npm install
npm start
```

#### Running Tests

The contract includes comprehensive unit tests covering all functionality:

```bash
cd contract
cedra move test --named-addresses fee_splitter=default
```

**Test Coverage:**
- ✅ Splitter creation (single/multiple recipients, maximum shares)
- ✅ Multiple fee distribution cycles with gas optimization
- ✅ View functions (`get_splitter_info`, `get_splitter_details`, `splitter_exists`, `is_recipient`)
- ✅ Admin functions (update, pause, ownership transfer, delete)
- ✅ Error cases (invalid inputs, unauthorized access, duplicates)
- ✅ Edge cases (zero amounts, excessive shares, zero addresses)
- ✅ Event emission verification
- ✅ Security validations

## Security Considerations

### Access Control
- All admin functions require owner authorization
- Ownership transfer requires current owner approval
- Pause functionality provides emergency controls

### Input Validation
- Maximum 50 recipients per splitter
- Maximum 10,000 total shares
- No zero addresses or shares
- No duplicate recipients
- Overflow protection in calculations

### Economic Security
- Direct transfers prevent custody risks
- No intermediate fund storage
- Gas-efficient operations reduce costs
- Event logging for transparency

## Use Cases

- **Revenue Sharing**: DAOs distributing protocol fees
- **Royalty Distribution**: NFTs splitting creator royalties
- **Commission Splitting**: Marketplaces distributing commissions
- **Profit Sharing**: Partnerships splitting earnings
- **Fee Distribution**: Protocols distributing governance fees
- **Token Vesting**: Teams distributing vested tokens
- **Staking Rewards**: Validators distributing staking rewards

## Error Codes

| Code | Description |
|------|-------------|
| 1 | Invalid share (zero or negative) |
| 2 | Invalid recipients (empty vectors) |
| 3 | Invalid amount (zero) |
| 4 | Insufficient balance |
| 5 | Splitter not found |
| 6 | Invalid total shares (exceeds maximum) |
| 7 | Not owner |
| 8 | Splitter is paused |
| 9 | Duplicate recipient |
| 10 | Zero address not allowed |
| 11 | Maximum recipients exceeded |
| 12 | Recipient/share count mismatch |

## License

MIT License 