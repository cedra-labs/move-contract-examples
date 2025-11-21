# Error Handling Patterns in Move

> **Issue #68** - Comprehensive guide to error handling in Move smart contracts

This repository provides production-ready examples demonstrating error handling patterns in Move for the Cedra blockchain. Learn how to write robust, maintainable contracts with proper error management.

## 📚 What's Included

This project contains **4 comprehensive Move modules** covering all aspects of error handling:

1. **`assert_vs_abort.move`** - When to use `assert!` vs `abort`
2. **`custom_error_codes.move`** - Organizing and documenting error codes
3. **`error_propagation.move`** - How errors flow through function calls
4. **`testing_errors.move`** - Testing error conditions comprehensively

Each module includes:

- ✅ Detailed inline documentation
- ✅ Real-world examples
- ✅ Comprehensive test coverage
- ✅ Best practices and conventions

## Quick Start

### Prerequisites

- [Cedra CLI](https://docs.cedra.network/getting-started/cli) installed
- Basic understanding of Move language
- Familiarity with smart contract development

### Installation

```bash
# Clone the repository
git clone https://github.com/cedra-labs/move-contract-examples.git
cd move-contract-examples/error-handling/contract

# Compile the contracts
cedra move compile

# Run all tests
cedra move test

# Run tests for a specific module
cedra move test --filter assert_vs_abort
```

## 📖 Module Guide

### 1. Assert vs Abort

**File:** `sources/assert_vs_abort.move`

Learn when to use `assert!` versus explicit `abort` statements.

#### Key Concepts:

**Use `assert!` for:**

- Simple condition checks (preferred)
- Inline validation
- Readability

```move
assert!(!exists<Wallet>(addr), E_ALREADY_INITIALIZED);
assert!(amount > 0, E_INVALID_AMOUNT);
```

**Use `abort` for:**

- Complex logic before error
- Multiple validations before aborting
- When you need explicit control flow

```move
if (amount == 0 || amount > MAX_ALLOWED) {
    // Could add logging, events, etc.
    abort E_INVALID_AMOUNT
};
```

#### Examples:

```bash
# Run assert vs abort tests
cedra move test --filter assert_vs_abort
```

**Tests included:**

- ✅ Simple assertion tests
- ✅ Explicit abort tests
- ✅ Mixed approach demonstrations
- ✅ All success and failure paths

---

### 2. Custom Error Codes

**File:** `sources/custom_error_codes.move`

Best practices for organizing and documenting error codes in production contracts.

#### Error Code Organization:

```move
// Access Control (1-19)
const E_NOT_ADMIN: u64 = 1;
const E_NOT_OWNER: u64 = 2;
const E_NOT_AUTHORIZED: u64 = 3;

// State Validation (20-39)
const E_NOT_INITIALIZED: u64 = 20;
const E_ALREADY_INITIALIZED: u64 = 21;
const E_PAUSED: u64 = 22;

// Value Validation (40-59)
const E_INVALID_AMOUNT: u64 = 40;
const E_AMOUNT_TOO_HIGH: u64 = 41;
const E_INSUFFICIENT_BALANCE: u64 = 43;

// Time-based (60-79)
const E_TOO_EARLY: u64 = 60;
const E_TOO_LATE: u64 = 61;
const E_TIMELOCK_ACTIVE: u64 = 62;

// Business Logic (80-99)
const E_DAILY_LIMIT_EXCEEDED: u64 = 80;
const E_MAX_SUPPLY_REACHED: u64 = 81;
```

#### Best Practices:

1. **Use descriptive names** with `E_` prefix
2. **Group related errors** with comment headers
3. **Start from 1** (0 reserved for tests)
4. **Use ranges** for logical categories
5. **Document each error** with inline comments

```bash
# Run custom error codes tests
cedra move test --filter custom_error_codes
```

---

### 3. Error Propagation

**File:** `sources/error_propagation.move`

Understanding how errors automatically propagate through function call chains.

#### Key Concepts:

Errors in Move **automatically propagate** up the call stack:

```move
// Low-level validation
fun validate_amount(amount: u64) {
    assert!(amount > 0, E_INVALID_AMOUNT);
    // Error propagates to caller
}

// Mid-level logic
fun check_and_deduct(addr: address, amount: u64) acquires Account {
    validate_amount(amount);  // May propagate E_INVALID_AMOUNT
    // ... more logic
}

// Top-level entry
public entry fun withdraw(user: &signer, amount: u64) acquires Account {
    let addr = signer::address_of(user);
    check_and_deduct(addr, amount);  // Errors propagate here
    // Only reaches here if all validations passed
}
```

#### No Try/Catch Needed:

Unlike many languages, Move doesn't require explicit error handling:

- ✅ Errors propagate automatically
- ✅ Transaction aborts on any error
- ✅ All state changes rollback
- ✅ Simpler, safer code

```bash
# Run error propagation tests
cedra move test --filter error_propagation
```

---

### 4. Testing Errors

**File:** `sources/testing_errors.move`

Comprehensive patterns for testing error conditions.

#### Testing Strategies:

**1. Test Expected Successes:**

```move
#[test(account = @0x1)]
fun test_deposit_success(account: &signer) acquires BankAccount {
    initialize(account, 100);
    deposit(account, 50);
    assert!(get_balance(@0x1) == 150, 0);
}
```

**2. Test Specific Error Codes:**

```move
#[test(account = @0x1)]
#[expected_failure(abort_code = E_INSUFFICIENT_BALANCE)]
fun test_withdraw_insufficient_fails(account: &signer) acquires BankAccount {
    initialize(account, 100);
    withdraw(account, 150); // Should abort
}
```

**3. Test Boundary Conditions:**

```move
#[test(account = @0x1)]
fun test_withdraw_exact_balance(account: &signer) acquires BankAccount {
    initialize(account, 500);
    withdraw(account, 500); // Exactly at boundary
    assert!(get_balance(@0x1) == 0, 0);
}
```

**4. Test Authorization:**

```move
#[test(owner = @0x1, attacker = @0x2)]
#[expected_failure(abort_code = E_NOT_AUTHORIZED)]
fun test_unauthorized_access_fails(owner: &signer, attacker: &signer) {
    initialize(owner, 1000);
    authorize_user(attacker, @0x2); // Attacker can't authorize themselves
}
```

**5. Test Sequential Operations:**

```move
#[test(account = @0x1)]
fun test_deposit_withdraw_sequence(account: &signer) acquires BankAccount {
    initialize(account, 100);
    deposit(account, 50);   // 150
    withdraw(account, 30);  // 120
    assert!(get_balance(@0x1) == 120, 0);
}
```

```bash
# Run all error testing examples
cedra move test --filter testing_errors

# Run with verbose output
cedra move test --filter testing_errors -- --show-output
```

## 🧪 Running Tests

### All Tests

```bash
cedra move test
```

### Specific Module

```bash
cedra move test --filter <module_name>
```

### With Gas Profiling

```bash
cedra move test --gas
```

### Verbose Output

```bash
cedra move test -- --show-output
```

## 📊 Test Coverage

| Module             | Tests | Passing | Coverage |
| ------------------ | ----- | ------- | -------- |
| assert_vs_abort    | 9     | 9       | 100%     |
| custom_error_codes | 10    | 10      | 100%     |
| error_propagation  | 10    | 10      | 100%     |
| testing_errors     | 26    | 26      | 100%     |
| **TOTAL**          | **55**| **55**  | **100%** |

## 🎯 Learning Path

### Beginners

1. Start with **assert_vs_abort.move** - Learn the basics
2. Move to **custom_error_codes.move** - Learn organization
3. Study **error_propagation.move** - Understand call chains
4. Practice with **testing_errors.move** - Master testing

### Intermediate

1. Review all modules for best practices
2. Focus on **error_propagation.move** for complex patterns
3. Study **testing_errors.move** for edge cases
4. Apply patterns to your own contracts

### Advanced

1. Deep dive into **custom_error_codes.move** for large projects
2. Master all testing patterns in **testing_errors.move**
3. Build production contracts using these patterns
4. Contribute improvements to the examples

## 💡 Best Practices Summary

### Error Codes

✅ **DO:**

- Use descriptive names with `E_` prefix
- Group errors by category
- Document each error code
- Use number ranges for categories
- Start from 1 (not 0)

❌ **DON'T:**

- Use generic names (`E_ERROR`, `E_FAIL`)
- Reuse error codes for different errors
- Use 0 for production errors
- Leave errors undocumented

### Error Handling

✅ **DO:**

- Prefer `assert!` for simple checks
- Use `abort` for complex validation
- Validate inputs early
- Test all error paths
- Document error conditions

❌ **DON'T:**

- Mix assertion styles inconsistently
- Forget to test error conditions
- Use error codes without documentation
- Skip boundary testing

### Testing

✅ **DO:**

- Test both success and failure paths
- Use `#[expected_failure(abort_code = ...)]`
- Test boundary conditions
- Use descriptive test names
- Test sequential operations

❌ **DON'T:**

- Only test success paths
- Skip edge case testing
- Use generic test names
- Forget to test authorization

## 🤝 Contributing

This is part of the [Cedra Builders Forge Season 1](https://github.com/cedra-labs/docs/issues?q=is%3Aissue+state%3Aopen+label%3A%22Builders+Forge%22) program.

### Improvements Welcome:

- Additional error patterns
- More real-world examples
- Better documentation
- Additional test cases

## 📝 License

MIT License - Free to use and modify for your Cedra projects.

## 🔗 Links

- **Issue**: [#68 - Common Error Patterns](https://github.com/cedra-labs/docs/issues/68)
- **Repository**: [move-contract-examples](https://github.com/cedra-labs/move-contract-examples)
- **Cedra Network**: [Cedra Network](https://docs.cedra.network)

---

**Built for Cedra Builders Forge Season 1** | **Move Language** | **Error Handling Patterns**
