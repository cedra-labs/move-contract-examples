/// # Assert vs Abort - Error Handling Pattern
///
/// This module demonstrates the two primary error handling mechanisms in Move:
/// `assert!` and `abort`. Understanding when to use each is crucial for writing
/// clean, maintainable Move code.
///
/// ## Key Differences:
/// - `assert!(condition, error_code)`: Evaluates condition, aborts if false
/// - `abort error_code`: Unconditional termination
///
/// ## Best Practices:
/// - Use `assert!` for simple condition checks (preferred for readability)
/// - Use `abort` when you need complex logic before aborting
/// - Both provide the same error code to callers for handling

module error_patterns::assert_vs_abort {
    use std::signer;

    // === Error Codes ===
    const E_NOT_OWNER: u64 = 1;
    const E_INSUFFICIENT_FUNDS: u64 = 2;
    const E_ALREADY_INITIALIZED: u64 = 3;
    const E_NOT_INITIALIZED: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;

    // === Structs ===

    struct Wallet has key {
        owner: address,
        balance: u64,
    }

    // === Example 1: Using assert! (Recommended for simple checks) ===

    /// Initialize wallet - demonstrates assert! for condition checking
    public entry fun initialize_with_assert(account: &signer, initial_balance: u64) {
        let addr = signer::address_of(account);

        // assert! is concise and readable for simple checks
        assert!(!exists<Wallet>(addr), E_ALREADY_INITIALIZED);
        assert!(initial_balance > 0, E_INVALID_AMOUNT);

        move_to(account, Wallet {
            owner: addr,
            balance: initial_balance,
        });
    }

    /// Withdraw with assert! - multiple inline checks
    public entry fun withdraw_with_assert(account: &signer, amount: u64) acquires Wallet {
        let addr = signer::address_of(account);

        // Multiple assert! statements for different validations
        assert!(exists<Wallet>(addr), E_NOT_INITIALIZED);

        let wallet = borrow_global_mut<Wallet>(addr);
        assert!(wallet.owner == addr, E_NOT_OWNER);
        assert!(wallet.balance >= amount, E_INSUFFICIENT_FUNDS);

        wallet.balance = wallet.balance - amount;
    }

    // === Example 2: Using abort (For complex logic before error) ===

    /// Initialize wallet using abort - demonstrates when abort is clearer
    public entry fun initialize_with_abort(account: &signer, initial_balance: u64) {
        let addr = signer::address_of(account);

        // When you need logic before the error check, abort can be clearer
        if (exists<Wallet>(addr)) {
            // Could add logging, event emission, or other cleanup here
            abort E_ALREADY_INITIALIZED
        };

        if (initial_balance == 0) {
            // Complex validation logic can make abort more readable
            abort E_INVALID_AMOUNT
        };

        move_to(account, Wallet {
            owner: addr,
            balance: initial_balance,
        });
    }

    /// Withdraw with abort - shows explicit control flow
    public entry fun withdraw_with_abort(account: &signer, amount: u64) acquires Wallet {
        let addr = signer::address_of(account);

        // Explicit conditional flow can be clearer for complex logic
        if (!exists<Wallet>(addr)) {
            abort E_NOT_INITIALIZED
        };

        let wallet = borrow_global_mut<Wallet>(addr);

        if (wallet.owner != addr) {
            abort E_NOT_OWNER
        };

        if (wallet.balance < amount) {
            abort E_INSUFFICIENT_FUNDS
        };

        wallet.balance = wallet.balance - amount;
    }

    // === Example 3: Mixing both approaches ===

    /// Transfer between wallets - shows when to use each
    public entry fun transfer(
        from: &signer,
        to_addr: address,
        amount: u64
    ) acquires Wallet {
        let from_addr = signer::address_of(from);

        // Use assert! for simple, obvious checks
        assert!(exists<Wallet>(from_addr), E_NOT_INITIALIZED);
        assert!(exists<Wallet>(to_addr), E_NOT_INITIALIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let from_wallet = borrow_global_mut<Wallet>(from_addr);

        // Use assert! for ownership check
        assert!(from_wallet.owner == from_addr, E_NOT_OWNER);

        // Use abort when you might want to add logging/events later
        if (from_wallet.balance < amount) {
            // In production, you might emit an event here before aborting
            abort E_INSUFFICIENT_FUNDS
        };

        // Perform transfer
        from_wallet.balance = from_wallet.balance - amount;

        let to_wallet = borrow_global_mut<Wallet>(to_addr);
        to_wallet.balance = to_wallet.balance + amount;
    }

    // === View Functions ===

    #[view]
    public fun get_balance(addr: address): u64 acquires Wallet {
        assert!(exists<Wallet>(addr), E_NOT_INITIALIZED);
        borrow_global<Wallet>(addr).balance
    }

    // === Tests ===

    #[test(account = @0x1)]
    fun test_assert_success(account: &signer) acquires Wallet {
        initialize_with_assert(account, 100);
        assert!(get_balance(@0x1) == 100, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_ALREADY_INITIALIZED)]
    fun test_assert_double_init(account: &signer) {
        initialize_with_assert(account, 100);
        initialize_with_assert(account, 200); // Should fail
    }

    #[test(account = @0x1)]
    fun test_abort_success(account: &signer) acquires Wallet {
        initialize_with_abort(account, 100);
        assert!(get_balance(@0x1) == 100, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_INVALID_AMOUNT)]
    fun test_abort_zero_amount(account: &signer) {
        initialize_with_abort(account, 0); // Should fail
    }

    #[test(account = @0x1)]
    fun test_withdraw_assert_success(account: &signer) acquires Wallet {
        initialize_with_assert(account, 100);
        withdraw_with_assert(account, 30);
        assert!(get_balance(@0x1) == 70, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_INSUFFICIENT_FUNDS)]
    fun test_withdraw_assert_insufficient(account: &signer) acquires Wallet {
        initialize_with_assert(account, 100);
        withdraw_with_assert(account, 150); // Should fail
    }

    #[test(account = @0x1)]
    fun test_withdraw_abort_success(account: &signer) acquires Wallet {
        initialize_with_abort(account, 100);
        withdraw_with_abort(account, 30);
        assert!(get_balance(@0x1) == 70, 0);
    }

    #[test(from = @0x1, to = @0x2)]
    fun test_transfer_success(from: &signer, to: &signer) acquires Wallet {
        initialize_with_assert(from, 100);
        initialize_with_assert(to, 50);

        transfer(from, @0x2, 30);

        assert!(get_balance(@0x1) == 70, 0);
        assert!(get_balance(@0x2) == 80, 1);
    }

    #[test(from = @0x1, to = @0x2)]
    fun test_transfer_success_fixed(from: &signer, to: &signer) acquires Wallet {
        initialize_with_assert(from, 100);
        initialize_with_assert(to, 50);

        // from transfers to to - should succeed
        transfer(from, @0x2, 30);

        assert!(get_balance(@0x1) == 70, 0);
        assert!(get_balance(@0x2) == 80, 1);
    }
}
