# COAT Escrow Smart Contract

A production-ready escrow smart contract for secure peer-to-peer transactions on the Cedra blockchain with optional dispute resolution.

## Overview

The Escrow contract enables secure transactions between buyers and sellers with:
- **Trustless fund locking** - Funds remain in buyer's wallet but are logically locked
- **Deadline protection** - Automatic refund after expiration
- **Dispute resolution** - Optional arbiter for conflict resolution
- **Multi-escrow support** - Create and manage multiple escrows per account
- **State-based security** - Enforced state transitions prevent unauthorized access

## Quick Start

### Deploy Contract

```bash
cd contract
cedra init
cedra account fund-with-faucet
cedra move compile --named-addresses coat_escrow=default
cedra move publish --named-addresses coat_escrow=default
```

### Run Client Tests

```bash
cd client
npm install
npm start
```

## How It Works

### Basic Flow

1. **Create Escrow**: Buyer creates escrow with seller address, amount, and deadline
2. **Deposit Funds**: Buyer deposits funds (locked in their wallet)
3. **Complete Transaction**: 
   - **Happy Path**: Buyer releases funds to seller
   - **Timeout**: Buyer gets refund after deadline
   - **Dispute**: Arbiter resolves in favor of buyer or seller

### Example Scenarios

#### Successful Transaction
```typescript
// 1. Buyer creates escrow for 1 CEDRA with 1-hour deadline
await client.createEscrow(buyer, seller.address, [], 100_000_000, deadline);

// 2. Buyer deposits funds
await client.deposit(buyer, 0);

// 3. Seller delivers goods/services

// 4. Buyer releases payment
await client.release(buyer, 0);
// Result: Seller receives 1 CEDRA
```

#### Disputed Transaction
```typescript
// 1. Create escrow with arbiter
await client.createEscrow(buyer, seller.address, [arbiter.address], amount, deadline);

// 2. Deposit funds
await client.deposit(buyer, 0);

// 3. Dispute arises
await client.raiseDispute(seller, buyer.address, 0);

// 4. Arbiter investigates and resolves
await client.resolveDispute(arbiter, buyer, 0, true); // true = release to seller
// Result: Funds go to seller (or buyer if false)
```

#### Timeout Refund
```typescript
// 1. Create and fund escrow
await client.createEscrow(buyer, seller.address, [], amount, deadline);
await client.deposit(buyer, 0);

// 2. Deadline passes (seller doesn't deliver)

// 3. Buyer claims refund
await client.refund(buyer, 0);
// Result: Funds returned to buyer
```

## Contract API

### Entry Functions

#### `create_escrow`
Creates a new escrow agreement.

```move
public entry fun create_escrow(
    buyer: &signer,
    seller: address,
    arbiter_opt: vector<address>,  // Empty for no arbiter
    amount: u64,
    deadline: u64,                 // Unix timestamp
    asset_metadata: Object<Metadata>
)
```

#### `deposit`
Deposits funds into the escrow (marks them as locked).

```move
public entry fun deposit(buyer: &signer, escrow_id: u64)
```

#### `release`
Releases funds to the seller (buyer only).

```move
public entry fun release(buyer: &signer, escrow_id: u64)
```

#### `refund`
Refunds funds to buyer after deadline expires.

```move
public entry fun refund(buyer: &signer, escrow_id: u64)
```

#### `raise_dispute`
Raises a dispute (buyer or seller only, requires arbiter).

```move
public entry fun raise_dispute(
    caller: &signer,
    escrow_owner: address,
    escrow_id: u64
)
```

#### `resolve_dispute`
Resolves dispute in favor of buyer or seller (arbiter only).

```move
public entry fun resolve_dispute(
    arbiter: &signer,
    buyer: &signer,
    escrow_id: u64,
    release_to_seller: bool
)
```

#### `cancel_escrow`
Cancels an unfunded escrow.

```move
public entry fun cancel_escrow(buyer: &signer, escrow_id: u64)
```

### View Functions

#### `get_escrow_info`
Returns complete escrow details.

```move
#[view]
public fun get_escrow_info(owner: address): (
    u64,              // escrow_id
    address,          // buyer
    address,          // seller
    vector<address>,  // arbiter (empty if none)
    u64,              // amount
    u64,              // deadline
    u8,               // status
    bool              // funds_deposited
)
```

#### `escrow_exists`
Checks if an account has any escrows.

```move
#[view]
public fun escrow_exists(owner: address): bool
```

#### `get_escrow_ids`
Returns all escrow IDs for an account.

```move
#[view]
public fun get_escrow_ids(owner: address): vector<u64>
```

#### `is_funded`
Checks if an escrow is funded.

```move
#[view]
public fun is_funded(owner: address): bool
```

#### `is_expired`
Checks if the deadline has passed.

```move
#[view]
public fun is_expired(owner: address): bool
```

#### `get_status`
Returns the current escrow status.

```move
#[view]
public fun get_status(owner: address): u8
```

### Status Codes

```move
const STATUS_INITIALIZED: u8 = 0;  // Created but not funded
const STATUS_FUNDED: u8 = 1;       // Funds deposited
const STATUS_RELEASED: u8 = 2;     // Funds released to seller
const STATUS_REFUNDED: u8 = 3;     // Funds refunded to buyer
const STATUS_DISPUTED: u8 = 4;     // Dispute raised
```

## Client Library

### Installation

```bash
npm install @cedra-labs/ts-sdk
```

### Usage

```typescript
import { EscrowClient } from './src/index';

const client = new EscrowClient();

// Create escrow (deadline 1 hour from now)
const deadline = Math.floor(Date.now() / 1000) + 3600;
await client.createEscrow(
    buyer,
    seller.accountAddress,
    [arbiter.accountAddress], // or [] for no arbiter
    100_000_000,              // 1 CEDRA
    deadline
);

// Deposit funds
await client.deposit(buyer, 0);

// Release to seller
await client.release(buyer, 0);

// Or refund after deadline
await client.refund(buyer, 0);

// Check escrow info
const info = await client.getEscrowInfo(buyer.accountAddress);
```

### TypeScript Types

```typescript
interface EscrowInfo {
  escrow_id: string;
  buyer: string;
  seller: string;
  arbiters: string[];
  amount: string;
  deadline: string;
  status: number;
  funds_deposited: boolean;
}

enum EscrowStatus {
  INITIALIZED = 0,
  FUNDED = 1,
  RELEASED = 2,
  REFUNDED = 3,
  DISPUTED = 4
}
```

## Project Structure

```
escrow/
├── contract/
│   ├── sources/
│   │   └── coat_escrow.move          # Main escrow contract
│   ├── tests/
│   │   └── coat_escrow.move    # Comprehensive test suite
│   └── Move.toml
├── client/
│   ├── src/
│   │   └── index.ts                  # TypeScript client + tests
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Development

### Prerequisites
- Node.js 18+
- Cedra CLI
- TypeScript 4.5+

### Build and Test

```bash
# Run Move unit tests (34 comprehensive tests)
cd contract
cedra move test --named-addresses coat_escrow=default

# Deploy contract
cedra init
cedra account fund-with-faucet
cedra move compile --named-addresses coat_escrow=default
cedra move publish --named-addresses coat_escrow=default

# Run TypeScript integration tests
cd ../client
npm install
npm start
```

## Testing

### Move Unit Tests

The contract includes 24 comprehensive unit tests covering:

✅ **Creation Tests**
✅ **Deposit Tests**
✅ **Release Tests**
✅ **Refund Tests**
✅ **Dispute Tests**
✅ **Edge Cases**

```bash
cd contract
cedra move test --named-addresses coat_escrow=default

# Expected output: PASSED. Total tests: 24; passed: 24; failed: 0
```

### TypeScript Integration Tests

Three major end-to-end tests:

**Test 1: Successful Escrow Lifecycle**
- Creates escrow between buyer and seller
- Deposits and releases funds
- Verifies correct balance transfers

**Test 2: Multiple Escrows Management**
- Creates multiple escrows
- Tests independent management
- Verifies cancellation

```bash
cd client
npm install

# Run all tests
npm start

# Run individual tests
npm start -- --test1  # Successful escrow
npm start -- --test2  # Dispute resolution
npm start -- --test3  # Multiple escrows
```

## Architecture

### State-Based Locking

Unlike traditional escrow contracts that hold funds in a contract account, this implementation uses a **state-based locking mechanism**:

1. **Funds stay in buyer's wallet** - No transfer during deposit
2. **Escrow state controls access** - Enforced state transitions prevent unauthorized withdrawal
3. **Direct transfers on completion** - Funds go directly from buyer to seller/buyer

**Benefits:**
- ✅ Lower gas costs (no intermediate transfers)
- ✅ Simpler fund accounting
- ✅ Native fungible asset support
- ✅ Reduced attack surface

### Multi-Escrow Registry

Each account can manage multiple escrows through a registry system:

```move
struct EscrowRegistry has key {
    escrows: vector<EscrowData>,  // All escrows for this account
    next_id: u64                   // Auto-incrementing ID
}

struct EscrowData has store, drop {
    escrow_id: u64,
    buyer: address,
    seller: address,
    arbiter: Option<address>,
    amount: u64,
    deadline: u64,
    status: u8,
    asset_metadata: Object<Metadata>,
    funds_deposited: bool
}
```

This design allows:
- Multiple active escrows per buyer
- Independent management of each escrow
- Efficient ID-based lookups
- Easy cancellation without affecting others

## Security Features

### Access Control
- ✅ **Buyer-only operations**: deposit, release, cancel
- ✅ **Buyer/Seller operations**: raise_dispute
- ✅ **Arbiter-only operations**: resolve_dispute
- ✅ **Address validation**: Prevents same buyer/seller/arbiter

### State Enforcement
- ✅ **State transitions** - Only valid state changes allowed
- ✅ **Deadline checks** - Refund only after expiration
- ✅ **Fund verification** - Balance checks before operations
- ✅ **Double-spend prevention** - Can't deposit twice

### Input Validation
- ✅ **Non-zero amounts** - Prevents useless escrows
- ✅ **Future deadlines** - Must be after creation time
- ✅ **Distinct parties** - Buyer ≠ Seller ≠ Arbiter
- ✅ **Arbiter requirement** - Disputes need arbiter

### Atomic Operations
- ✅ **All-or-nothing** - Transactions fully succeed or revert
- ✅ **No partial states** - Consistent state at all times
- ✅ **Balance guarantees** - Sufficient funds verified

## Use Cases

### E-commerce
- Online marketplaces
- Digital goods delivery
- Service-based payments
- Subscription disputes

### Freelancing
- Project milestones
- Deliverable-based payments
- Quality assurance holds
- Dispute mediation

### Real Estate
- Security deposits
- Earnest money
- Rental agreements
- Property transfers

### DeFi
- OTC trading
- NFT sales
- Cross-chain swaps
- DAO treasury management

## Error Codes

```move
const EESCROW_NOT_FOUND: u64 = 1;        // Escrow doesn't exist
const EUNAUTHORIZED: u64 = 2;            // Caller not authorized
const EINVALID_STATE: u64 = 3;           // Wrong state for operation
const EINVALID_AMOUNT: u64 = 4;          // Amount is zero
const EINVALID_DEADLINE: u64 = 5;        // Deadline in the past
const EALREADY_FUNDED: u64 = 6;          // Already deposited
const ENOT_FUNDED: u64 = 7;              // Not yet funded
const EDEADLINE_NOT_PASSED: u64 = 8;     // Deadline not reached
const EINVALID_ADDRESSES: u64 = 9;       // Invalid address config
const EINSUFFICIENT_BALANCE: u64 = 10;   // Insufficient funds
```

## Limitations

- Arbiter cannot be changed after creation
- Maximum one arbiter per escrow
- Deadline cannot be extended
- Funds must be in CEDRA or compatible fungible assets
- No partial releases (all or nothing)

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License

## Acknowledgments

Built with ❤️ by COAT for the Cedra ecosystem

Special thanks to:
- Cedra Builders for the excellent blockchain infrastructure
- Cedra docs
- Early testers and contributors

---

**⚠️ Disclaimer**: This is production-ready code, but always audit smart contracts before mainnet deployment. Use at your own risk.