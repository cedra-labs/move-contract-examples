# Randomness Example - Random Selector

Minimal example of Cedra's on-chain randomness for selecting random winners from a pool of candidates.

## Use Case

Randomly selecting winners for airdrops, raffles, or whitelist spots from a pool of eligible addresses.

## Contract Functions

| Function | Description |
|----------|-------------|
| `add_candidate(admin, candidate)` | Add candidate to pool |
| `select_winners(admin, n)` | Select n random unique winners (emits event) |
| `select_one(admin)` | Select one random winner (emits event) |
| `get_count(admin_addr)` | View: get number of candidates |

## Security: The `#[randomness]` Attribute

Entry functions using randomness **MUST**:
1. Have `#[randomness]` attribute
2. Be **private** (not `public entry`)

```move
#[randomness]
entry fun select_winners(admin: &signer, n: u64) {
    let winner_idx = randomness::u64_range(0, n);
    // ...
}
```

### Why private entry?

Prevents **test-and-abort attacks** where attackers:
1. Call random function via their contract
2. Check result, abort if unfavorable
3. Retry until favorable result

The compiler enforces this - public functions using randomness won't compile unless marked with `#[lint::allow_unsafe_randomness]`.

### Undergasing Attacks

Be aware: attackers can set `max_gas` to abort expensive paths. Mitigations:
- Make gas cost independent of randomness outcome
- Only emit events (don't do variable-cost operations after randomness)
- Require trusted admin signer

This example emits events only, making it resistant to undergasing.

## Usage

```bash
# Deploy
cedra move publish --named-addresses RandomnessExample=default

# Add candidates
cedra move run --function-id 'default::random_selector::add_candidate' --args address:0x1
cedra move run --function-id 'default::random_selector::add_candidate' --args address:0x2
cedra move run --function-id 'default::random_selector::add_candidate' --args address:0x3

# Select 2 winners (result in WinnersSelected event)
cedra move run --function-id 'default::random_selector::select_winners' --args u64:2
```

## Getting Results

Entry functions can't return values. Results are emitted as `WinnersSelected` events:

```typescript
const tx = await client.waitForTransaction(hash);
const event = tx.events.find(e => e.type.includes("WinnersSelected"));
const winners = event.data.winners; // vector<address>
```

## Running Tests

```bash
cedra move test
```

## Randomness API Reference

From `cedra_framework::randomness`:

| Function | Description |
|----------|-------------|
| `u64_range(min, max)` | Random u64 in [min, max) |
| `u64_integer()` | Random u64 |
| `permutation(n)` | Random permutation of [0, n-1] |
| `bytes(n)` | Generate n random bytes |

## Error Codes

| Code | Description |
|------|-------------|
| 1 | Pool is empty |
| 2 | Requested more winners than available |
