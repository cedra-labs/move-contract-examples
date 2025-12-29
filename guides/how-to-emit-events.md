# How to Emit Events Properly

Quick guide for emitting events in Move contracts on Cedra, enabling off-chain indexing and frontend integration.

## Understanding Events

Events are on-chain logs that record important state changes. They enable off-chain indexing, frontend integration, analytics, and debugging.

## Event Structure

Events require:
1. **Event struct**: Data to emit (must have `drop` and `store` abilities)
2. **EventHandle**: Manages emission (stored in a resource)
3. **Emission**: Using `event::emit_event()`

## Basic Implementation

### Step 1: Import Modules

```move
module my_module::my_contract {
    use cedra_framework::event;
    use cedra_framework::account;
    use std::signer;
}
```

### Step 2: Define Event Struct

```move
struct TransferEvent has drop, store {
    from: address,
    to: address,
    amount: u64,
}
```

**Requirements:** Must have `drop` and `store` abilities. Use only serializable types (primitives, addresses).

### Step 3: Create EventHandle

```move
struct MyResource has key {
    transfer_events: event::EventHandle<TransferEvent>,
}
```

### Step 4: Initialize EventHandle

```move
public entry fun initialize(admin: &signer) {
    move_to(admin, MyResource {
        transfer_events: account::new_event_handle<TransferEvent>(admin),
    });
}
```

### Step 5: Emit Events

```move
public entry fun transfer(
    sender: &signer,
    recipient: address,
    amount: u64
) acquires MyResource {
    // ... transfer logic
    
    let resource = borrow_global_mut<MyResource>(@my_module);
    event::emit_event(&mut resource.transfer_events, TransferEvent {
        from: signer::address_of(sender),
        to: recipient,
        amount,
    });
}
```

## Complete Example

```move
module my_module::token {
    use cedra_framework::event;
    use cedra_framework::account;
    use std::signer;

    struct TokenConfig has key {
        total_supply: u64,
        transfer_events: event::EventHandle<TransferEvent>,
    }

    struct TransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
    }

    public entry fun initialize(admin: &signer) {
        move_to(admin, TokenConfig {
            total_supply: 0,
            transfer_events: account::new_event_handle<TransferEvent>(admin),
        });
    }

    public entry fun transfer(
        sender: &signer,
        to: address,
        amount: u64
    ) acquires TokenConfig {
        let config = borrow_global_mut<TokenConfig>(@my_module);
        event::emit_event(&mut config.transfer_events, TransferEvent {
            from: signer::address_of(sender),
            to,
            amount,
        });
    }
}
```

## Best Practices

1. **Emit after state changes**: Emit events only after successful operations
2. **Include relevant context**: Add all necessary data (addresses, amounts, IDs)
3. **Use descriptive names**: `TransferEvent` not `Event1`
4. **Keep events focused**: Separate events for different actions

## Common Pitfalls

### 1. Missing Abilities

```move
// ❌ BAD: Missing abilities
struct MyEvent { ... }

// ✅ GOOD: Has required abilities
struct MyEvent has drop, store { ... }
```

### 2. Emitting Before State Changes

```move
// ❌ BAD: Event emitted even if transaction fails
event::emit_event(&mut config.events, Event { ... });
if (some_condition) return;

// ✅ GOOD: Emit after successful operations
if (some_condition) return;
event::emit_event(&mut config.events, Event { ... });
```

### 3. Not Initializing EventHandle

```move
// ❌ BAD: EventHandle not initialized
struct Config has key {
    events: event::EventHandle<MyEvent>, // Will fail!
}

// ✅ GOOD: Initialize in entry function
public entry fun initialize(admin: &signer) {
    move_to(admin, Config {
        events: account::new_event_handle<MyEvent>(admin),
    });
}
```

### 4. Non-Serializable Types

```move
// ❌ BAD: Cannot serialize references
struct BadEvent has drop, store {
    signer_ref: &signer, // Error!
}

// ✅ GOOD: Use primitive types
struct GoodEvent has drop, store {
    address: address,
    amount: u64,
}
```

## Summary

1. Import `cedra_framework::event` and `cedra_framework::account`
2. Define event structs with `drop` and `store` abilities
3. Store `EventHandle` in a resource struct
4. Initialize handle with `account::new_event_handle()`
5. Emit events after successful state changes

---

## Additional Resources

- [Cedra Documentation](https://docs.cedra.network)
- [Move Language Events](https://move-language.github.io/move/events.html)
