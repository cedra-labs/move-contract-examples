/// # Error Propagation - Handling Errors Across Function Calls
///
/// This module demonstrates how errors propagate through function call chains in Move.
/// Understanding error propagation is crucial for building composable, maintainable contracts.
///
/// ## Key Concepts:
/// - Errors propagate automatically up the call stack
/// - No need for explicit error forwarding (like try/catch)
/// - Function signatures document which resources they access (`acquires`)
/// - Callers don't need to handle errors - they propagate to transaction level
/// - This makes error handling simpler but requires careful validation

module error_patterns::error_propagation {
    use std::signer;
    use std::vector;

    // ========================================================================
    // Error Codes
    // ========================================================================

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_NOT_OWNER: u64 = 5;
    const E_ACCOUNT_NOT_FOUND: u64 = 6;
    const E_INVALID_RECIPIENT: u64 = 7;

    // ========================================================================
    // Structs
    // ========================================================================

    struct Account has key {
        owner: address,
        balance: u64,
    }

    struct Registry has key {
        accounts: vector<address>,
    }

    // ========================================================================
    // Example 1: Simple Error Propagation
    // ========================================================================

    /// Internal validation function - errors propagate from here
    fun validate_amount(amount: u64) {
        assert!(amount > 0, E_INVALID_AMOUNT);
        // If this fails, error propagates to caller
    }

    /// Internal check function
    fun check_account_exists(addr: address) {
        assert!(exists<Account>(addr), E_NOT_INITIALIZED);
        // Error automatically propagates up
    }

    /// Public function that calls validation functions
    /// Errors from validate_amount() and check_account_exists() propagate here
    public entry fun deposit(user: &signer, amount: u64) acquires Account {
        let addr = signer::address_of(user);

        // Errors from these calls propagate automatically
        validate_amount(amount);        // May abort with E_INVALID_AMOUNT
        check_account_exists(addr);     // May abort with E_NOT_INITIALIZED

        let account = borrow_global_mut<Account>(addr);
        account.balance = account.balance + amount;
    }

    // ========================================================================
    // Example 2: Multi-Level Propagation
    // ========================================================================

    /// Level 3: Lowest level - validates balance
    fun internal_validate_balance(account: &Account, amount: u64) {
        assert!(account.balance >= amount, E_INSUFFICIENT_BALANCE);
    }

    /// Level 2: Middle level - gets account and validates
    fun internal_check_and_deduct(addr: address, amount: u64): u64 acquires Account {
        check_account_exists(addr);  // May propagate E_NOT_INITIALIZED

        let account = borrow_global<Account>(addr);

        // May propagate E_INSUFFICIENT_BALANCE
        internal_validate_balance(account, amount);

        account.balance - amount
    }

    /// Level 1: Top level - orchestrates transfer
    /// All errors from lower levels propagate here automatically
    public entry fun withdraw(user: &signer, amount: u64) acquires Account {
        let addr = signer::address_of(user);

        validate_amount(amount);  // May propagate E_INVALID_AMOUNT

        // This call may propagate E_NOT_INITIALIZED or E_INSUFFICIENT_BALANCE
        let new_balance = internal_check_and_deduct(addr, amount);

        // Only reaches here if all validations passed
        let account = borrow_global_mut<Account>(addr);
        account.balance = new_balance;
    }

    // ========================================================================
    // Example 3: Error Propagation in Complex Operations
    // ========================================================================

    /// Helper: Validate transfer parameters
    fun validate_transfer(from: address, to: address, amount: u64) {
        assert!(from != to, E_INVALID_RECIPIENT);
        validate_amount(amount);
        // Both errors propagate automatically
    }

    /// Helper: Check both accounts exist
    fun validate_accounts_exist(from: address, to: address) {
        check_account_exists(from);  // Propagates E_NOT_INITIALIZED
        check_account_exists(to);    // Propagates E_NOT_INITIALIZED
    }

    /// Helper: Verify ownership
    fun verify_ownership(signer_addr: address, account_addr: address) acquires Account {
        let account = borrow_global<Account>(account_addr);
        assert!(account.owner == signer_addr, E_NOT_OWNER);
    }

    /// Complex transfer - demonstrates multiple propagation paths
    public entry fun transfer(
        from: &signer,
        to_addr: address,
        amount: u64
    ) acquires Account {
        let from_addr = signer::address_of(from);

        // Step 1: Validate parameters (may propagate E_INVALID_RECIPIENT or E_INVALID_AMOUNT)
        validate_transfer(from_addr, to_addr, amount);

        // Step 2: Check accounts exist (may propagate E_NOT_INITIALIZED)
        validate_accounts_exist(from_addr, to_addr);

        // Step 3: Verify ownership (may propagate E_NOT_OWNER)
        verify_ownership(from_addr, from_addr);

        // Step 4: Check balance (may propagate E_INSUFFICIENT_BALANCE)
        {
            let from_account = borrow_global<Account>(from_addr);
            internal_validate_balance(from_account, amount);
        };

        // Step 5: Perform transfer (only if all checks passed)
        let from_account = borrow_global_mut<Account>(from_addr);
        from_account.balance = from_account.balance - amount;

        let to_account = borrow_global_mut<Account>(to_addr);
        to_account.balance = to_account.balance + amount;
    }

    // ========================================================================
    // Example 4: Registry Pattern with Propagation
    // ========================================================================

    /// Find account in registry - errors propagate
    fun find_account_in_registry(registry_addr: address, target: address): bool acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);

        let registry = borrow_global<Registry>(registry_addr);
        vector::contains(&registry.accounts, &target)
    }

    /// Add to registry with validation
    fun add_to_registry(registry_addr: address, account_addr: address) acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        check_account_exists(account_addr);  // Propagates E_NOT_INITIALIZED

        let registry = borrow_global_mut<Registry>(registry_addr);
        vector::push_back(&mut registry.accounts, account_addr);
    }

    /// Register account - multiple propagation points
    public entry fun register_account(
        user: &signer,
        registry_addr: address,
        initial_balance: u64
    ) acquires Registry {
        let user_addr = signer::address_of(user);

        validate_amount(initial_balance);  // Propagates E_INVALID_AMOUNT

        assert!(!exists<Account>(user_addr), E_ALREADY_INITIALIZED);

        move_to(user, Account {
            owner: user_addr,
            balance: initial_balance,
        });

        // Propagates E_NOT_INITIALIZED if registry doesn't exist
        add_to_registry(registry_addr, user_addr);
    }

    // ========================================================================
    // Public Initialization Functions
    // ========================================================================

    public entry fun initialize_account(user: &signer, initial_balance: u64) {
        let addr = signer::address_of(user);
        assert!(!exists<Account>(addr), E_ALREADY_INITIALIZED);
        validate_amount(initial_balance);

        move_to(user, Account {
            owner: addr,
            balance: initial_balance,
        });
    }

    public entry fun initialize_registry(admin: &signer) {
        let addr = signer::address_of(admin);
        assert!(!exists<Registry>(addr), E_ALREADY_INITIALIZED);

        move_to(admin, Registry {
            accounts: vector::empty<address>(),
        });
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    #[view]
    public fun get_balance(addr: address): u64 acquires Account {
        check_account_exists(addr);  // Error propagates
        borrow_global<Account>(addr).balance
    }

    // ========================================================================
    // Tests - Demonstrating Error Propagation
    // ========================================================================

    #[test(user = @0x1)]
    fun test_simple_propagation_success(user: &signer) acquires Account {
        initialize_account(user, 100);
        deposit(user, 50);
        assert!(get_balance(@0x1) == 150, 0);
    }

    #[test(user = @0x1)]
    #[expected_failure(abort_code = E_INVALID_AMOUNT)]
    fun test_validate_amount_propagation(user: &signer) acquires Account {
        initialize_account(user, 100);
        deposit(user, 0); // Error propagates from validate_amount()
    }

    #[test(user = @0x1)]
    #[expected_failure(abort_code = E_NOT_INITIALIZED)]
    fun test_check_exists_propagation(user: &signer) acquires Account {
        deposit(user, 50); // Error propagates from check_account_exists()
    }

    #[test(user = @0x1)]
    fun test_multi_level_propagation_success(user: &signer) acquires Account {
        initialize_account(user, 100);
        withdraw(user, 30);
        assert!(get_balance(@0x1) == 70, 0);
    }

    #[test(user = @0x1)]
    #[expected_failure(abort_code = E_INSUFFICIENT_BALANCE)]
    fun test_deep_propagation(user: &signer) acquires Account {
        initialize_account(user, 100);
        // Error propagates from internal_validate_balance() -> internal_check_and_deduct() -> withdraw()
        withdraw(user, 150);
    }

    #[test(from = @0x1, to = @0x2)]
    fun test_transfer_success(from: &signer, to: &signer) acquires Account {
        initialize_account(from, 100);
        initialize_account(to, 50);

        transfer(from, @0x2, 30);

        assert!(get_balance(@0x1) == 70, 0);
        assert!(get_balance(@0x2) == 80, 1);
    }

    #[test(from = @0x1, to = @0x2)]
    #[expected_failure(abort_code = E_INVALID_RECIPIENT)]
    fun test_transfer_same_account(from: &signer) acquires Account {
        initialize_account(from, 100);
        // Error propagates from validate_transfer()
        transfer(from, @0x1, 30);
    }

    #[test(from = @0x1, to = @0x2)]
    #[expected_failure(abort_code = E_NOT_INITIALIZED)]
    fun test_transfer_account_not_exists(from: &signer) acquires Account {
        initialize_account(from, 100);
        // Error propagates from validate_accounts_exist()
        transfer(from, @0x2, 30);
    }

    #[test(admin = @0x1, user = @0x2)]
    fun test_registry_success(admin: &signer, user: &signer) acquires Registry {
        initialize_registry(admin);
        register_account(user, @0x1, 100);

        assert!(find_account_in_registry(@0x1, @0x2), 0);
    }

    #[test(admin = @0x1, user = @0x2)]
    #[expected_failure(abort_code = E_NOT_INITIALIZED)]
    fun test_registry_not_exists(user: &signer) acquires Registry {
        // Error propagates from add_to_registry() -> register_account()
        register_account(user, @0x1, 100);
    }
}
