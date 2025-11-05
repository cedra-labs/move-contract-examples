# Move Snippets Quick Reference

## Quick Lookup Table

| Prefix | Purpose | Common Use Case |
|--------|---------|-----------------|
| `module` | Full module template | Starting new contracts |
| `struct-key` | Resource with key | Account-owned data |
| `struct-store` | Nestable struct | Data inside resources |
| `struct-full` | All abilities | General data types |
| `fun-entry` | Entry function | Transaction endpoints |
| `fun-acquires` | Function with storage access | Read/write resources |
| `move-to` | Store resource | Initialize account data |
| `move-from` | Remove resource | Delete/transfer data |
| `borrow-global` | Read resource | Query data |
| `borrow-global-mut` | Modify resource | Update data |
| `assert` | Validation | Permission checks |
| `vector-ops` | Array operations | Dynamic lists |
| `table` | Key-value storage | Mappings |
| `smart-table` | Large-scale storage | Big datasets |
| `event-emit` | Event logging | Indexable events |
| `test` | Test function | Positive tests |
| `test-fail` | Failure test | Error validation |
| `coin-transfer` | Send coins | Payments |
| `timestamp` | Current time | Time-based logic |
| `option` | Nullable values | Optional data |
| `string` | Text creation | String handling |

## Common Workflows

### Creating a New Contract

1. **`module`** - Start with module template
2. **`struct-key`** - Define main resource
3. **`fun-entry`** - Add initialization function
4. **`fun-entry`** - Add transaction functions
5. **`test`** - Write tests

### Working with Resources

**Initialize:**
```
fun-entry → move-to
```

**Read:**
```
fun-acquires → borrow-global
```

**Update:**
```
fun-entry → borrow-global-mut
```

**Delete:**
```
fun-acquires → move-from
```

### Building Complex Contracts

**NFT Contract:**
```
module → struct-key (Collection) → struct-store (Token) → table (ownership) → event-emit (Transfer)
```

**Voting System:**
```
module → struct-key (Proposal) → vector-ops (votes) → timestamp (deadline) → assert (validation)
```

**Token Contract:**
```
module → struct-key (Balance) → coin-transfer → event-emit (Transfer) → test
```

## Cheat Sheet by Scenario

### Scenario: User Registration System

```move
// 1. module - Create module structure
module my_addr::user_registry {
    use std::signer;
    use std::string::String;

    // 2. struct-key - User profile resource
    struct UserProfile has key {
        username: String,
        created_at: u64,
    }

    // 3. fun-entry - Registration function
    public entry fun register(
        account: &signer,
        username: String,
    ) {
        let addr = signer::address_of(account);
        // 4. assert - Validation
        assert!(!exists<UserProfile>(addr), E_ALREADY_REGISTERED);
        // 5. timestamp - Get current time
        let created_at = timestamp::now_seconds();
        // 6. move-to - Store profile
        move_to(account, UserProfile { username, created_at });
    }
}
```

### Scenario: Marketplace Contract

```move
// 1. module
module my_addr::marketplace {
    use std::signer;
    use aptos_std::table::Table;

    // 2. struct-store - Item for sale
    struct Item has store {
        price: u64,
        seller: address,
    }

    // 3. struct-key - Marketplace state
    struct Marketplace has key {
        listings: Table<u64, Item>,
        next_id: u64,
    }

    // 4. fun-entry - List item
    public entry fun list_item(
        seller: &signer,
        price: u64,
    ) acquires Marketplace {
        let marketplace = borrow_global_mut<Marketplace>(@marketplace_addr);
        let item_id = marketplace.next_id;
        // 5. table - Add listing
        table::add(&mut marketplace.listings, item_id, Item {
            price,
            seller: signer::address_of(seller),
        });
        marketplace.next_id = item_id + 1;
    }

    // 6. fun-entry - Buy item
    public entry fun buy_item(
        buyer: &signer,
        item_id: u64,
    ) acquires Marketplace {
        let marketplace = borrow_global_mut<Marketplace>(@marketplace_addr);
        let item = table::remove(&mut marketplace.listings, item_id);
        // 7. coin-transfer - Payment
        coin::transfer<AptosCoin>(buyer, item.seller, item.price);
        // 8. event-emit - Log purchase
        event::emit(PurchaseEvent { item_id, buyer: signer::address_of(buyer) });
    }
}
```

### Scenario: Lottery System

```move
// 1. module
module my_addr::lottery {
    use std::signer;
    use std::vector;

    // 2. struct-key - Lottery state
    struct Lottery has key {
        participants: vector<address>,
        prize_pool: u64,
        deadline: u64,
    }

    // 3. fun-entry - Enter lottery
    public entry fun enter(
        participant: &signer,
        ticket_price: u64,
    ) acquires Lottery {
        let lottery = borrow_global_mut<Lottery>(@lottery_addr);
        // 4. timestamp - Check deadline
        assert!(timestamp::now_seconds() < lottery.deadline, E_LOTTERY_ENDED);
        // 5. coin-transfer - Pay ticket
        coin::transfer<AptosCoin>(participant, @lottery_addr, ticket_price);
        // 6. vector-ops - Add participant
        vector::push_back(&mut lottery.participants, signer::address_of(participant));
        lottery.prize_pool = lottery.prize_pool + ticket_price;
    }
}
```

## Abilities Quick Reference

| Ability | Meaning | Use Case |
|---------|---------|----------|
| `key` | Can be stored in global storage | Account resources |
| `store` | Can be stored inside other structs | Nested data |
| `copy` | Can be copied | Value types |
| `drop` | Can be dropped/discarded | Temporary data |

### Ability Combinations

```move
// Resource (cannot copy/drop)
struct Asset has key { }

// Storable resource
struct Token has store { }

// Regular data
struct Config has copy, drop { }

// Complete resource
struct CompleteResource has key, store { }

// Event data
struct Event has drop, store { }
```

## Error Patterns

```move
// Constants at module level
const E_NOT_AUTHORIZED: u64 = 1;
const E_ALREADY_EXISTS: u64 = 2;
const E_NOT_FOUND: u64 = 3;
const E_INSUFFICIENT_BALANCE: u64 = 4;
const E_DEADLINE_PASSED: u64 = 5;

// Usage with assert snippet
assert!(signer::address_of(account) == @admin, E_NOT_AUTHORIZED);
assert!(!exists<Resource>(addr), E_ALREADY_EXISTS);
assert!(exists<Resource>(addr), E_NOT_FOUND);
assert!(balance >= amount, E_INSUFFICIENT_BALANCE);
assert!(timestamp::now_seconds() < deadline, E_DEADLINE_PASSED);
```

## Testing Patterns

```move
// Basic test
#[test(account = @0x1)]
fun test_initialize(account: &signer) {
    initialize(account);
    assert!(exists<Resource>(signer::address_of(account)), 0);
}

// Test with failure
#[test(account = @0x1)]
#[expected_failure(abort_code = E_ALREADY_EXISTS)]
fun test_double_init(account: &signer) {
    initialize(account);
    initialize(account); // Should fail
}

// Test with multiple accounts
#[test(alice = @0x1, bob = @0x2)]
fun test_transfer(alice: &signer, bob: &signer) {
    initialize(alice);
    transfer(alice, signer::address_of(bob), 100);
}
```

## Performance Tips

### Use SmartTable for Large Data
```move
// Good for < 1000 entries
use aptos_std::table::Table;

// Good for > 1000 entries
use aptos_std::smart_table::SmartTable;
```

### Borrow vs Move
```move
// Read-only: Use borrow_global
let data = borrow_global<Resource>(addr).field;

// Modify: Use borrow_global_mut
let resource = borrow_global_mut<Resource>(addr);
resource.field = new_value;

// Delete: Use move_from
let Resource { field } = move_from<Resource>(addr);
```

## Common Mistakes

### ❌ Forgetting `acquires`
```move
// Wrong
public fun read(addr: address): u64 {
    borrow_global<Resource>(addr).value
}

// Correct
public fun read(addr: address): u64 acquires Resource {
    borrow_global<Resource>(addr).value
}
```

### ❌ Not checking existence
```move
// Wrong
move_to(account, Resource { });

// Correct
assert!(!exists<Resource>(addr), E_ALREADY_EXISTS);
move_to(account, Resource { });
```

### ❌ Mixing abilities incorrectly
```move
// Wrong - Can't store a struct without `store` ability
struct Container has key {
    item: ItemWithoutStore, // Error!
}

// Correct
struct Item has store { }
struct Container has key {
    item: Item, // OK
}
```

---

**Pro Tip:** Use `Ctrl+Space` in VSCode/Cursor to see available snippets while typing!
