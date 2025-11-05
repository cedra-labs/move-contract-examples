# Move Language Patterns - VSCode/Cursor Snippets

This repository contains 21 carefully crafted Move language snippets for VSCode and Cursor IDE, designed to accelerate smart contract development on Cedra Network.

## Installation

### VSCode
1. Open VSCode
2. Go to: `File > Preferences > Configure User Snippets`
3. Select "New Global Snippets file" or choose an existing one
4. Copy the contents of `move-snippets.code-snippets`
5. Save and restart VSCode

### Cursor
1. Open Cursor
2. Go to: `File > Preferences > Configure User Snippets`
3. Select "New Global Snippets file" or choose an existing one
4. Copy the contents of `move-snippets.code-snippets`
5. Save and restart Cursor

## Snippets Overview

All snippets are categorized by use case for easy discovery.

### Module Structure

#### `module` - Complete Module Template
Creates a full module structure with organized sections for imports, errors, structs, and functions.

```move
module my_address::my_module {
    // === Imports ===
    use std::signer;

    // === Errors ===
    const E_ERROR: u64 = 1;

    // === Structs ===

    // === Public Functions ===

    // === Private Functions ===

    // === Tests ===
    #[test_only]
    use std::debug;
}
```

---

### Struct Definitions

#### `struct-key` - Resource with Key Ability
For structs that will be stored in global storage.

```move
/// User profile stored globally
struct UserProfile has key {
    username: String,
    created_at: u64,
}
```

**Use when:** Creating resources that represent account-owned data.

---

#### `struct-store` - Struct with Store Ability
For structs that can be nested inside other resources.

```move
/// Coin that can be stored in containers
struct Coin has store {
    value: u64,
}
```

**Use when:** Creating types that will be stored inside other resources.

---

#### `struct-full` - Struct with All Abilities
For general-purpose data structures.

```move
/// Event data that can be copied and dropped
struct TransferEvent has copy, drop, store, key {
    from: address,
    to: address,
    amount: u64,
}
```

**Use when:** Creating flexible data types without resource constraints.

---

### Function Patterns

#### `fun-entry` - Public Entry Function
Entry point for transaction calls.

```move
/// Initialize user profile
public entry fun initialize_profile(
    account: &signer,
    username: String,
) {
    let account_addr = signer::address_of(account);
    // Function logic here
}
```

**Use when:** Creating functions callable from transactions.

---

#### `fun-acquires` - Function with Resource Access
For functions that read or modify global resources.

```move
/// Get user balance
public fun get_balance(
    addr: address,
) acquires UserBalance {
    let balance = borrow_global<UserBalance>(addr);
    balance.value
}
```

**Use when:** Accessing global storage within functions.

---

### Global Storage Operations

#### `move-to` - Store Resource
Store a resource in an account's global storage.

```move
move_to(account, UserProfile {
    username,
    created_at: timestamp::now_seconds(),
});
```

**Use when:** Initializing account resources.

---

#### `move-from` - Remove Resource
Extract and destructure a resource from global storage.

```move
let UserProfile { username, created_at } = move_from<UserProfile>(addr);
```

**Use when:** Cleaning up or transferring resources.

---

#### `borrow-global` - Read Resource
Borrow an immutable reference to a global resource.

```move
let profile_ref = borrow_global<UserProfile>(addr);
```

**Use when:** Reading resource data without modification.

---

#### `borrow-global-mut` - Modify Resource
Borrow a mutable reference to a global resource.

```move
let profile_ref = borrow_global_mut<UserProfile>(addr);
profile_ref.username = new_username;
```

**Use when:** Updating resource fields.

---

### Error Handling

#### `assert` - Assert with Error Code
Validate conditions and abort with error codes.

```move
assert!(signer::address_of(account) == @admin, E_NOT_AUTHORIZED);
```

**Use when:** Validating preconditions and permissions.

---

### Collections

#### `vector-ops` - Vector Operations
Common vector operations in one snippet.

```move
use std::vector;

let items = vector::empty<u64>();
vector::push_back(&mut items, 42);
let item = vector::pop_back(&mut items);
let length = vector::length(&items);
```

**Use when:** Working with dynamic arrays.

---

#### `table` - Table for Key-Value Storage
Efficient key-value storage for resources.

```move
use aptos_std::table::{Self, Table};

struct UserRegistry has key {
    users: Table<address, UserInfo>,
}

let users = table::new<address, UserInfo>();
table::add(&mut users, addr, user_info);
let user = table::borrow(&users, addr);
```

**Use when:** Storing mappings in resources.

---

#### `smart-table` - Smart Table Pattern
More efficient than Table for large datasets.

```move
use aptos_std::smart_table::{Self, SmartTable};

struct Registry has key {
    data: SmartTable<address, u64>,
}

let data = smart_table::new<address, u64>();
smart_table::upsert(&mut data, key, value);
```

**Use when:** Managing large-scale mappings with frequent updates.

---

### Events

#### `event-emit` - Event Definition and Emission
Define and emit events for indexing.

```move
use aptos_framework::event;

/// Transfer event for tracking
#[event]
struct TransferEvent has drop, store {
    from: address,
    to: address,
    amount: u64,
}

// Emit the event
event::emit(TransferEvent { from, to, amount });
```

**Use when:** Creating indexable on-chain events.

---

### Testing

#### `test` - Test Function
Standard test with signer parameter.

```move
#[test(account = @0x1)]
fun test_initialize(account: &signer) {
    initialize_profile(account, string::utf8(b"Alice"));
}
```

**Use when:** Writing positive test cases.

---

#### `test-fail` - Test Expected Failure
Test that expects specific error codes.

```move
#[test(account = @0x1)]
#[expected_failure(abort_code = E_ALREADY_INITIALIZED)]
fun test_double_initialize(account: &signer) {
    initialize_profile(account, string::utf8(b"Alice"));
    initialize_profile(account, string::utf8(b"Bob")); // Should fail
}
```

**Use when:** Testing error conditions and validation.

---

### Blockchain Utilities

#### `coin-transfer` - Transfer Coins
Transfer Aptos coins between accounts.

```move
use aptos_framework::coin::{Self, Coin};
use aptos_framework::aptos_coin::AptosCoin;

coin::transfer<AptosCoin>(from, to_address, amount);
```

**Use when:** Implementing payments and transfers.

---

#### `timestamp` - Get Current Time
Access blockchain timestamp.

```move
use aptos_framework::timestamp;

let current_time = timestamp::now_seconds();
```

**Use when:** Time-based logic (deadlines, cooldowns).

---

#### `option` - Optional Values
Handle nullable values safely.

```move
use std::option::{Self, Option};

let opt = option::some(value);
if (option::is_some(&opt)) {
    let val = option::extract(&mut opt);
    // Use val
}
```

**Use when:** Representing optional or nullable data.

---

#### `string` - String Creation
Create UTF-8 strings from byte literals.

```move
use std::string::{Self, String};

let message = string::utf8(b"Hello, Cedra!");
```

**Use when:** Working with text data.

---

## Usage Tips

### Snippet Workflow
1. Start typing the prefix (e.g., `module`, `struct-key`)
2. Press `Tab` or `Enter` to expand
3. Use `Tab` to navigate between placeholders
4. Fill in your custom values

### Best Practices
- **Use descriptive names**: Replace placeholder names with meaningful identifiers
- **Add documentation**: Fill in doc comments (`///`) for all public items
- **Follow conventions**: Stick to Move naming conventions (snake_case for functions/variables)
- **Test thoroughly**: Use test snippets to ensure correctness

### Common Patterns

**Initializing a Resource:**
```move
public entry fun initialize(account: &signer) {
    let addr = signer::address_of(account);
    assert!(!exists<MyResource>(addr), E_ALREADY_EXISTS);
    move_to(account, MyResource { field: value });
}
```

**Updating a Resource:**
```move
public entry fun update(account: &signer, new_value: u64) acquires MyResource {
    let addr = signer::address_of(account);
    let resource = borrow_global_mut<MyResource>(addr);
    resource.field = new_value;
}
```

**Reading a Resource:**
```move
public fun read(addr: address): u64 acquires MyResource {
    let resource = borrow_global<MyResource>(addr);
    resource.field
}
```

## Categories

| Category | Snippets |
|----------|----------|
| Module Structure | `module` |
| Struct Definitions | `struct-key`, `struct-store`, `struct-full` |
| Functions | `fun-entry`, `fun-acquires` |
| Global Storage | `move-to`, `move-from`, `borrow-global`, `borrow-global-mut` |
| Error Handling | `assert` |
| Collections | `vector-ops`, `table`, `smart-table` |
| Events | `event-emit` |
| Testing | `test`, `test-fail` |
| Utilities | `coin-transfer`, `timestamp`, `option`, `string` |

## Examples

### Complete Contract Example

Using these snippets, you can quickly build a complete contract:

```move
module my_addr::counter {
    use std::signer;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;

    struct Counter has key {
        value: u64,
    }

    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Counter>(addr), E_ALREADY_INITIALIZED);
        move_to(account, Counter { value: 0 });
    }

    public entry fun increment(account: &signer) acquires Counter {
        let addr = signer::address_of(account);
        let counter = borrow_global_mut<Counter>(addr);
        counter.value = counter.value + 1;
    }

    public fun get_value(addr: address): u64 acquires Counter {
        borrow_global<Counter>(addr).value
    }

    #[test(account = @0x1)]
    fun test_counter(account: &signer) acquires Counter {
        initialize(account);
        increment(account);
        let value = get_value(signer::address_of(account));
        assert!(value == 1, 0);
    }
}
```

## Resources

- **Cedra Documentation**: https://docs.cedra.dev
- **Move Book**: https://aptos.dev/move/book/
- **Move Patterns**: https://www.move-patterns.com/
- **Aptos Examples**: https://github.com/aptos-labs/aptos-core/tree/main/aptos-move/move-examples

## Contributing

These snippets are designed for Cedra Builders Forge Season 1. Feedback and improvements are welcome!

## License

MIT License - Free to use and modify for your Cedra projects.

---

**Built for Cedra Network** | **Move Language** | **VSCode & Cursor Compatible**
