# FA-Lock: Enhanced Fungible Asset Escrow Contract

Secure time-locked escrow contract for Cedra fungible assets with advanced features including batch operations, partial withdrawals, and emergency controls.

## Features

### Core Functionality
- **Simple Escrow** - Lock funds without time restrictions
- **Time-Locked Escrow** - Lock funds until specific timestamp
- **Partial Withdrawals** - Withdraw portions of escrowed funds
- **Batch Operations** - Gas-efficient multi-user transactions
- **Pause Mechanism** - Emergency halt capability
- **Lockup Cleanup** - Delete empty lockup contracts to reclaim storage
- **Comprehensive Events** - Full activity tracking
- **Advanced View Functions** - Query contract state

### Recent Enhancements (v2.0)
This contract has been significantly enhanced with production-ready features including event tracking, batch operations, partial withdrawals, and emergency pause controls.

## Installation

```bash
# Clone repository
git clone https://github.com/cedra-labs/move-contract-examples
cd move-contract-examples/fa-lock

# Compile
cedra move compile --named-addresses lock_deployer=default

# Test
cedra move test --dev

# Publish
cedra move publish --named-addresses lock_deployer=default
```

## Quick Start

### 1. Initialize Lockup Contract

```move
use lock_deployer::lock;

// Create lockup contract (once per account)
lock::initialize_lockup(creator);
```

### 2. Escrow Funds

```move
// Simple escrow (no time lock)
lock::escrow_funds_with_no_lockup(
    user,
    lockup_obj,
    token_metadata,
    amount
);

// Time-locked escrow (locked for 30 days)
lock::escrow_funds_with_time(
    user,
    lockup_obj,
    token_metadata,
    amount,
    30 * 24 * 60 * 60  // 30 days in seconds
);
```

### 3. Withdraw Funds

```move
// Full withdrawal (after unlock time for time-locked)
lock::return_my_funds(user, lockup_obj, token_metadata);

// Partial withdrawal
lock::partial_withdraw(user, lockup_obj, token_metadata, 50);
```

### 4. Batch Operations

```move
// Batch escrow for multiple users (e.g., team vesting)
let users = vector[@alice, @bob, @charlie];
let amounts = vector[1000, 2000, 1500];
let lock_time = 365 * 24 * 60 * 60; // 1 year

lock::batch_escrow_with_time(
    creator,
    lockup_obj,
    token_metadata,
    users,
    amounts,
    lock_time
);

// Batch return funds
lock::batch_return_user_funds(
    creator,
    lockup_obj,
    token_metadata,
    users
);
```

### 5. Emergency Controls

```move
// Pause contract (creator only)
lock::pause_lockup(creator, lockup_obj);

// Check if paused
let is_paused = lock::is_paused(lockup_obj);

// Unpause
lock::unpause_lockup(creator, lockup_obj);
```

### 6. Cleanup Lockup Contract

```move
// Check if lockup exists
let exists = lock::has_lockup(creator_address);

// Delete empty lockup (all escrows must be cleared first)
lock::delete_lockup(creator);
```

## API Reference

### Initialization

#### `initialize_lockup(caller: &signer)`
Creates a new lockup contract. Can only be called once per account.

### Escrow Functions

#### `escrow_funds_with_no_lockup(caller, lockup_obj, fa_metadata, amount)`
Escrow funds without time restrictions. Can be withdrawn anytime.

#### `escrow_funds_with_time(caller, lockup_obj, fa_metadata, amount, lockup_time_secs)`
Escrow funds with time lock. Locked until `now + lockup_time_secs`.

#### `batch_escrow_with_time(caller, lockup_obj, fa_metadata, users, amounts, lockup_time_secs)`
Batch escrow for multiple users. Only creator can call.

### Withdrawal Functions

#### `return_my_funds(caller, lockup_obj, fa_metadata)`
User withdraws their own escrowed funds (respects time locks).

#### `partial_withdraw(caller, lockup_obj, fa_metadata, amount)`
Withdraw a portion of escrowed funds. Escrow remains active until balance is zero.

#### `return_user_funds(caller, lockup_obj, fa_metadata, user)`
Creator returns funds to a specific user (bypasses time lock).

#### `batch_return_user_funds(caller, lockup_obj, fa_metadata, users)`
Creator returns funds to multiple users in one transaction.

### Claim Functions

#### `claim_escrow(caller, lockup_obj, fa_metadata, user)`
Creator claims escrowed funds to their own account.

### Pause Controls

#### `pause_lockup(caller, lockup_obj)`
Pause the contract (prevents new escrows). Creator only.

#### `unpause_lockup(caller, lockup_obj)`
Unpause the contract. Creator only.

### Cleanup Functions

#### `delete_lockup(caller: &signer)`
Deletes an empty lockup contract and returns storage deposit. Only creator can call. All escrows must be cleared first.

### View Functions

#### `lockup_address(creator_address): address`
Get lockup object address for a creator.

#### `escrowed_funds(lockup_obj, fa_metadata, user): Option<u64>`
Get amount escrowed for a user. Returns `none()` if no escrow exists.

#### `remaining_escrow_time(lockup_obj, fa_metadata, user): Option<u64>`
Get remaining lock time in seconds. Returns 0 for unlocked/simple escrows.

#### `is_paused(lockup_obj): bool`
Check if contract is paused.

#### `get_creator(lockup_obj): address`
Get contract creator/owner address.

#### `escrow_exists(lockup_obj, fa_metadata, user): bool`
Check if an escrow exists for a user-asset pair.

#### `has_lockup(creator: address): bool`
Check if a creator has an active lockup contract.

## Use Cases

### 1. Token Vesting
```move
// Vest team tokens over 1 year with 6-month cliff
let team = vector[@alice, @bob, @charlie];
let amounts = vector[10000, 8000, 6000];
let cliff = 180 * 24 * 60 * 60; // 6 months

batch_escrow_with_time(founder, lockup, token, team, amounts, cliff);

// After cliff, team members can partially withdraw
// Alice withdraws 25% every 3 months
partial_withdraw(alice, lockup, token, 2500);
```

### 2. Escrow Service
```move
// Buyer escrows payment for service
escrow_funds_with_no_lockup(buyer, lockup, usdc, 1000);

// After service delivered, creator releases to seller
return_user_funds(escrow_service, lockup, usdc, buyer);
// or buyer confirms and releases
return_my_funds(buyer, lockup, usdc);
```

### 3. Salary System
```move
// Company deposits monthly salaries in batch
let employees = vector[@emp1, @emp2, @emp3];
let salaries = vector[5000, 6000, 4500];

batch_escrow_with_time(company, lockup, usdc, employees, salaries, 0);

// Employees withdraw as needed
partial_withdraw(emp1, lockup, usdc, 2000); // Pay rent
// Later...
partial_withdraw(emp1, lockup, usdc, 3000); // Rest of salary
```

### 4. Time-Locked Savings
```move
// Lock tokens for 1 year (self-imposed discipline)
escrow_funds_with_time(user, lockup, token, 10000, 365 * 24 * 60 * 60);

// After 1 year, gradually withdraw
partial_withdraw(user, lockup, token, 1000); // Take 10%
// Rest stays locked until needed
```

## Events

All operations emit events for monitoring:

- `EscrowCreatedEvent` - New escrow created
- `FundsAddedEvent` - Funds added to existing escrow
- `FundsReturnedEvent` - Funds returned to user
- `FundsClaimedEvent` - Funds claimed by creator
- `PartialWithdrawalEvent` - Partial withdrawal occurred
- `LockupPausedEvent` - Contract paused
- `LockupUnpausedEvent` - Contract unpaused

Example event listener:
```typescript
// TypeScript SDK example
lockup.onEvent('EscrowCreatedEvent', (event) => {
  console.log(`New escrow: ${event.amount} tokens for ${event.user}`);
  console.log(`Unlock time: ${event.unlock_secs}`);
});
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
cedra move test --dev

# Run specific test
cedra move test --dev -f test_partial_withdraw_simple_escrow

# Run with coverage
cedra move test --dev --coverage
```

Test coverage includes:
- Pause/unpause mechanisms
- Batch operations
- Partial withdrawals
- Input validation
- Edge cases
- View functions
- Time lock enforcement
- Access control
- Lockup cleanup/deletion

## Gas Optimization

| Operation | Single Tx | Batch (10 users) | Savings |
|-----------|-----------|------------------|---------|
| Escrow | 1x | ~1.1x | ~90% for 10 users |
| Return | 1x | ~1.2x | ~88% for 10 users |

**Tips:**
- Use batch operations for multiple users
- Partial withdrawals save gas vs. full withdraw + re-escrow
- View functions cost zero gas

## Security

### Access Control
- **Creator only:** pause/unpause, claim, batch return
- **User only:** return own funds, partial withdraw
- **Time locks:** Enforced, cannot be shortened

### Validations
- Amount > 0 required
- Balance checks on withdrawals
- Time lock enforcement
- Batch vector length matching
- Non-empty batch operations

### Emergency Features
- Pause mechanism for security incidents
- Funds remain safe during pause
- Users can still withdraw (no lock-in risk)

## Error Codes

```move
E_LOCKUP_ALREADY_EXISTS: 1       // Lockup already initialized
E_LOCKUP_NOT_FOUND: 2            // Lockup doesn't exist
E_NO_USER_LOCKUP: 3              // No escrow for this user-asset
E_UNLOCK_TIME_NOT_YET: 4         // Time lock hasn't expired
E_NOT_ORIGINAL_OR_LOCKUP_OWNER: 5 // Not authorized
E_NOT_TIME_LOCKUP: 6             // Expected time-locked escrow
E_NOT_SIMPLE_LOCKUP: 7           // Expected simple escrow
E_CANNOT_SHORTEN_LOCKUP_TIME: 8  // Can't reduce lock time
E_INVALID_AMOUNT: 9              // Amount must be > 0
E_CONTRACT_PAUSED: 10            // Contract is paused
E_INSUFFICIENT_BALANCE: 11       // Not enough funds
E_LENGTH_MISMATCH: 12            // Batch vectors don't match
E_EMPTY_BATCH: 13                // Batch operation is empty
E_LOCKUP_HAS_ESCROWS: 14         // Cannot delete lockup with active escrows
```

## Migration from v1.0

All existing functions work unchanged. New features are additive:

```move
// Old code still works
escrow_funds_with_no_lockup(user, lockup, token, 100);
return_my_funds(user, lockup, token);

// Additional features available
partial_withdraw(user, lockup, token, 50);
pause_lockup(creator, lockup);
batch_escrow_with_time(creator, ...);
```

## Additional Resources

- **Full Docs:** [https://docs.cedra.network/guides/escrow](https://docs.cedra.network/guides/escrow)
- **Telegram:** [Cedra Builders Chat](https://t.me/+Ba3QXd0VG9U0Mzky)
- **GitHub Issues:** [Report bugs or request features](https://github.com/cedra-labs/move-contract-examples/issues)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Update documentation
5. Submit a PR

## License

Apache 2.0

---

**Built for the Cedra ecosystem**

For questions or support, join the [Cedra Builders Telegram](https://t.me/+Ba3QXd0VG9U0Mzky).
