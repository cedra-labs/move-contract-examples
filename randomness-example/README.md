# Randomness Example - Random Selector

This example demonstrates how to use Cedra's on-chain randomness for selecting random winners from a pool of candidates.

## Use Case

A common DeFi/NFT scenario: randomly selecting winners for airdrops, raffles, or whitelist spots from a pool of eligible addresses.

## How Cedra Randomness Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Block Prologue                          │
│  Validators generate PerBlockRandomness seed via DKG        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    next_32_bytes()                          │
│  Combines: DST + block_seed + tx_hash + counter             │
│  Output: SHA3-256 hash (32 bytes)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Type Conversion Functions                       │
│  u8_integer(), u64_integer(), u256_integer(), etc.          │
│  bytes(n), permutation(n), u64_range(min, max)              │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Flow

1. **Block-level seed generation**
   - Validators run Distributed Key Generation (DKG) protocol
   - Each block gets a unique `PerBlockRandomness` seed
   - Seed is unpredictable before block is finalized

2. **Transaction-level uniqueness**
   - `next_32_bytes()` creates unique randomness per call by combining:
     - Domain Separation Tag: `b"CEDRA_RANDOMNESS"`
     - Block seed (from validators)
     - Transaction hash (unique to this tx)
     - Counter (incremented each call within tx)

3. **Hash derivation**
   - All inputs concatenated and hashed with SHA3-256
   - Produces 32 cryptographically random bytes

4. **Type conversion**
   - Bytes interpreted as big-endian integers
   - Range functions use modulo (bias is negligible for ranges << 2^256)

## Security: The `#[randomness]` Attribute

Entry functions that use randomness **MUST** have the `#[randomness]` attribute:

```move
#[randomness]
public entry fun select_winners_entry(admin: &signer, n: u64) {
    // Uses randomness - attribute required!
    let perm = randomness::permutation(n);
    // ...
}
```

### Why is this required?

Without this protection, attackers could exploit **test-and-abort** attacks:

```
1. User calls random function
2. If result is unfavorable, abort transaction
3. Retry until favorable result
4. Only favorable results get committed
```

The `#[randomness]` attribute ensures the `is_unbiasable()` check passes, which verifies:
- The transaction entry function is private/friend (not public entry)
- OR it has the `#[randomness]` attribute

This prevents simulation-based attacks.

## Contract Functions

### Entry Functions

| Function | Description |
|----------|-------------|
| `add_candidate(admin, candidate)` | Add single candidate to pool |
| `add_candidates(admin, candidates)` | Add multiple candidates at once |
| `select_winners_entry(admin, n)` | Select n random unique winners |
| `select_single_winner_entry(admin)` | Select one random winner |
| `clear_candidates(admin)` | Remove all candidates |

### View Functions

| Function | Description |
|----------|-------------|
| `get_candidate_count(admin_addr)` | Get number of candidates |
| `get_candidates(admin_addr)` | Get all candidate addresses |

## Usage

### 1. Deploy the contract

```bash
cd randomness-example
cedra move compile --named-addresses RandomnessExample=default
cedra move publish --named-addresses RandomnessExample=default
```

### 2. Add candidates

```bash
# Add single candidate
cedra move run \
  --function-id 'default::random_selector::add_candidate' \
  --args address:0x1

# Add multiple candidates
cedra move run \
  --function-id 'default::random_selector::add_candidates' \
  --args 'address:[0x1,0x2,0x3,0x4,0x5]'
```

### 3. Select winners

```bash
# Select 3 random winners
cedra move run \
  --function-id 'default::random_selector::select_winners_entry' \
  --args u64:3
```

### 4. View results

Winners are emitted as events. Query the `WinnersSelectedEvent` or `SingleWinnerEvent`.

## Running Tests

```bash
cd randomness-example
cedra move test --named-addresses RandomnessExample=0xcafe
```

### Test Coverage

| Test | What it verifies |
|------|------------------|
| `test_bytes_returns_correct_length` | `bytes()` returns exact requested length |
| `test_permutation_contains_all_elements` | Permutation has all elements exactly once |
| `test_u64_range_within_bounds` | Range values are within [min, max) |
| `test_permutation_zero_returns_empty` | `permutation(0)` returns `[]` |
| `test_permutation_one_returns_single` | `permutation(1)` returns `[0]` |
| `test_permutation_larger` | Larger permutations maintain element integrity |
| `test_add_and_select_winners` | End-to-end winner selection |
| `test_select_single_winner` | Single winner selection |
| `test_select_from_empty_fails` | Proper error on empty pool |
| `test_select_more_than_available_fails` | Proper error when n > candidates |
| `test_select_all_as_winners` | Selecting n=total works correctly |
| `test_clear_candidates` | Clearing resets the pool |
| `test_add_candidates_batch` | Batch adding works |

## Randomness Functions Reference

From `cedra_framework::randomness`:

| Function | Description |
|----------|-------------|
| `bytes(n)` | Generate n random bytes |
| `u8_integer()` | Random u8 |
| `u16_integer()` | Random u16 |
| `u32_integer()` | Random u32 |
| `u64_integer()` | Random u64 |
| `u128_integer()` | Random u128 |
| `u256_integer()` | Random u256 |
| `u8_range(min, max)` | Random u8 in [min, max) |
| `u16_range(min, max)` | Random u16 in [min, max) |
| `u32_range(min, max)` | Random u32 in [min, max) |
| `u64_range(min, max)` | Random u64 in [min, max) |
| `u128_range(min, max)` | Random u128 in [min, max) |
| `u256_range(min, max)` | Random u256 in [min, max) |
| `permutation(n)` | Random permutation of [0, n-1] |

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | `E_NO_CANDIDATES` | Pool is empty |
| 2 | `E_NOT_ENOUGH_CANDIDATES` | Requested more winners than available |
| 3 | `E_NOT_ADMIN` | Caller is not the admin |
| 4 | `E_ALREADY_INITIALIZED` | Pool already exists |
| 5 | `E_NOT_INITIALIZED` | Pool not created yet |
