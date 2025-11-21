/// # Testing Errors - Comprehensive Error Testing Patterns
///
/// This module demonstrates best practices for testing error conditions in Move.
/// Proper error testing ensures your contract behaves correctly under all conditions,
/// including invalid inputs and edge cases.
///
/// ## Testing Strategies:
/// - Use `#[expected_failure(abort_code = ERROR_CODE)]` for specific error testing
/// - Test both success and failure paths
/// - Test boundary conditions
/// - Test error propagation through call chains
/// - Use descriptive test names that explain what's being tested

module error_patterns::testing_errors {
    use std::signer;
    use std::vector;

    // ========================================================================
    // Error Codes
    // ========================================================================

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_NOT_AUTHORIZED: u64 = 5;
    const E_LIMIT_EXCEEDED: u64 = 6;
    const E_EMPTY_COLLECTION: u64 = 7;
    const E_INDEX_OUT_OF_BOUNDS: u64 = 8;

    // ========================================================================
    // Constants
    // ========================================================================

    const MIN_BALANCE: u64 = 10;
    const MAX_TRANSFER: u64 = 1000;
    const DAILY_LIMIT: u64 = 5000;

    // ========================================================================
    // Structs
    // ========================================================================

    struct BankAccount has key {
        owner: address,
        balance: u64,
        daily_spent: u64,
        authorized_users: vector<address>,
    }

    // ========================================================================
    // Public Functions
    // ========================================================================

    public entry fun initialize(
        account: &signer,
        initial_balance: u64
    ) {
        let addr = signer::address_of(account);
        assert!(!exists<BankAccount>(addr), E_ALREADY_INITIALIZED);
        assert!(initial_balance >= MIN_BALANCE, E_INVALID_AMOUNT);

        move_to(account, BankAccount {
            owner: addr,
            balance: initial_balance,
            daily_spent: 0,
            authorized_users: vector::empty<address>(),
        });
    }

    public entry fun deposit(
        account: &signer,
        amount: u64
    ) acquires BankAccount {
        let addr = signer::address_of(account);
        assert!(exists<BankAccount>(addr), E_NOT_INITIALIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let bank_account = borrow_global_mut<BankAccount>(addr);
        bank_account.balance = bank_account.balance + amount;
    }

    public entry fun withdraw(
        account: &signer,
        amount: u64
    ) acquires BankAccount {
        let addr = signer::address_of(account);
        assert!(exists<BankAccount>(addr), E_NOT_INITIALIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(amount <= MAX_TRANSFER, E_LIMIT_EXCEEDED);

        let bank_account = borrow_global_mut<BankAccount>(addr);
        assert!(bank_account.balance >= amount, E_INSUFFICIENT_BALANCE);
        assert!(
            bank_account.daily_spent + amount <= DAILY_LIMIT,
            E_LIMIT_EXCEEDED
        );

        bank_account.balance = bank_account.balance - amount;
        bank_account.daily_spent = bank_account.daily_spent + amount;
    }

    public entry fun authorize_user(
        owner: &signer,
        user: address
    ) acquires BankAccount {
        let owner_addr = signer::address_of(owner);
        assert!(exists<BankAccount>(owner_addr), E_NOT_INITIALIZED);

        let bank_account = borrow_global_mut<BankAccount>(owner_addr);
        assert!(bank_account.owner == owner_addr, E_NOT_AUTHORIZED);

        vector::push_back(&mut bank_account.authorized_users, user);
    }

    public entry fun transfer_as_authorized(
        user: &signer,
        owner_addr: address,
        amount: u64
    ) acquires BankAccount {
        let user_addr = signer::address_of(user);
        assert!(exists<BankAccount>(owner_addr), E_NOT_INITIALIZED);

        let bank_account = borrow_global_mut<BankAccount>(owner_addr);
        assert!(
            vector::contains(&bank_account.authorized_users, &user_addr),
            E_NOT_AUTHORIZED
        );
        assert!(bank_account.balance >= amount, E_INSUFFICIENT_BALANCE);

        bank_account.balance = bank_account.balance - amount;
    }

    #[view]
    public fun get_balance(addr: address): u64 acquires BankAccount {
        assert!(exists<BankAccount>(addr), E_NOT_INITIALIZED);
        borrow_global<BankAccount>(addr).balance
    }

    // ========================================================================
    // Tests - Pattern 1: Testing Expected Successes
    // ========================================================================

    #[test(account = @0x1)]
    fun test_initialize_success(account: &signer) acquires BankAccount {
        initialize(account, 100);
        assert!(exists<BankAccount>(@0x1), 0);
        assert!(get_balance(@0x1) == 100, 1);
    }

    #[test(account = @0x1)]
    fun test_initialize_with_minimum_balance(account: &signer) acquires BankAccount {
        initialize(account, MIN_BALANCE);
        assert!(get_balance(@0x1) == MIN_BALANCE, 0);
    }

    #[test(account = @0x1)]
    fun test_deposit_success(account: &signer) acquires BankAccount {
        initialize(account, 100);
        deposit(account, 50);
        assert!(get_balance(@0x1) == 150, 0);
    }

    #[test(account = @0x1)]
    fun test_withdraw_success(account: &signer) acquires BankAccount {
        initialize(account, 1000);
        withdraw(account, 100);
        assert!(get_balance(@0x1) == 900, 0);
    }

    #[test(account = @0x1)]
    fun test_withdraw_maximum_allowed(account: &signer) acquires BankAccount {
        initialize(account, 5000);
        withdraw(account, MAX_TRANSFER);
        assert!(get_balance(@0x1) == 4000, 0);
    }

    // ========================================================================
    // Tests - Pattern 2: Testing Specific Error Codes
    // ========================================================================

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_ALREADY_INITIALIZED)]
    fun test_initialize_twice_fails(account: &signer) {
        initialize(account, 100);
        initialize(account, 200); // Should abort with E_ALREADY_INITIALIZED
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_INVALID_AMOUNT)]
    fun test_initialize_below_minimum_fails(account: &signer) {
        initialize(account, MIN_BALANCE - 1); // Should abort
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_NOT_INITIALIZED)]
    fun test_deposit_without_initialize_fails(account: &signer) acquires BankAccount {
        deposit(account, 100); // Should abort with E_NOT_INITIALIZED
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_INVALID_AMOUNT)]
    fun test_deposit_zero_fails(account: &signer) acquires BankAccount {
        initialize(account, 100);
        deposit(account, 0); // Should abort
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_INSUFFICIENT_BALANCE)]
    fun test_withdraw_more_than_balance_fails(account: &signer) acquires BankAccount {
        initialize(account, 100);
        withdraw(account, 150); // Should abort
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_LIMIT_EXCEEDED)]
    fun test_withdraw_exceeds_max_transfer_fails(account: &signer) acquires BankAccount {
        initialize(account, 5000);
        withdraw(account, MAX_TRANSFER + 1); // Should abort
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_LIMIT_EXCEEDED)]
    fun test_withdraw_exceeds_daily_limit_fails(account: &signer) acquires BankAccount {
        initialize(account, 10000);
        withdraw(account, DAILY_LIMIT + 1); // Should abort
    }

    // ========================================================================
    // Tests - Pattern 3: Testing Boundary Conditions
    // ========================================================================

    #[test(account = @0x1)]
    fun test_withdraw_exact_balance_succeeds(account: &signer) acquires BankAccount {
        initialize(account, 500);
        withdraw(account, 500);
        assert!(get_balance(@0x1) == 0, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_INSUFFICIENT_BALANCE)]
    fun test_withdraw_one_more_than_balance_fails(account: &signer) acquires BankAccount {
        initialize(account, 500);
        withdraw(account, 501); // Boundary: balance + 1
    }

    #[test(account = @0x1)]
    fun test_deposit_one_unit_succeeds(account: &signer) acquires BankAccount {
        initialize(account, 100);
        deposit(account, 1); // Minimum valid deposit
        assert!(get_balance(@0x1) == 101, 0);
    }

    #[test(account = @0x1)]
    fun test_withdraw_up_to_daily_limit_succeeds(account: &signer) acquires BankAccount {
        initialize(account, 10000);
        // Withdraw MAX_TRANSFER multiple times up to DAILY_LIMIT
        withdraw(account, MAX_TRANSFER); // 1000
        withdraw(account, MAX_TRANSFER); // 2000
        withdraw(account, MAX_TRANSFER); // 3000
        withdraw(account, MAX_TRANSFER); // 4000
        withdraw(account, MAX_TRANSFER); // 5000 - exactly at DAILY_LIMIT
        assert!(get_balance(@0x1) == 5000, 0);
    }

    // ========================================================================
    // Tests - Pattern 4: Testing Authorization
    // ========================================================================

    #[test(owner = @0x1, user = @0x2)]
    fun test_authorize_and_transfer_succeeds(
        owner: &signer,
        user: &signer
    ) acquires BankAccount {
        initialize(owner, 1000);
        authorize_user(owner, @0x2);
        transfer_as_authorized(user, @0x1, 100);
        assert!(get_balance(@0x1) == 900, 0);
    }

    #[test(owner = @0x1, user = @0x2)]
    #[expected_failure(abort_code = E_NOT_AUTHORIZED)]
    fun test_transfer_without_authorization_fails(
        owner: &signer,
        user: &signer
    ) acquires BankAccount {
        initialize(owner, 1000);
        // Don't authorize user
        transfer_as_authorized(user, @0x1, 100); // Should abort
    }

    #[test(owner = @0x1, attacker = @0x3)]
    #[expected_failure(abort_code = E_NOT_INITIALIZED)]
    fun test_authorize_without_account_fails(
        owner: &signer,
        attacker: &signer
    ) acquires BankAccount {
        initialize(owner, 1000);
        // Attacker tries to authorize without having an account
        authorize_user(attacker, @0x2); // Should abort with E_NOT_INITIALIZED
    }

    // ========================================================================
    // Tests - Pattern 5: Testing Sequential Operations
    // ========================================================================

    #[test(account = @0x1)]
    fun test_multiple_deposits_succeed(account: &signer) acquires BankAccount {
        initialize(account, 100);
        deposit(account, 50);
        deposit(account, 30);
        deposit(account, 20);
        assert!(get_balance(@0x1) == 200, 0);
    }

    #[test(account = @0x1)]
    fun test_deposit_and_withdraw_sequence(account: &signer) acquires BankAccount {
        initialize(account, 100);
        deposit(account, 50);   // 150
        withdraw(account, 30);  // 120
        deposit(account, 80);   // 200
        withdraw(account, 100); // 100
        assert!(get_balance(@0x1) == 100, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_LIMIT_EXCEEDED)]
    fun test_daily_limit_across_multiple_withdrawals(account: &signer) acquires BankAccount {
        initialize(account, 10000);
        withdraw(account, 3000);
        withdraw(account, 2001); // Total: 5001, exceeds daily limit
    }

    // ========================================================================
    // Tests - Pattern 6: Testing Edge Cases
    // ========================================================================

    #[test(account = @0x1)]
    fun test_multiple_authorizations_same_user(account: &signer) acquires BankAccount {
        initialize(account, 1000);
        authorize_user(account, @0x2);
        authorize_user(account, @0x2); // Duplicate authorization allowed
        // Should not fail
    }

    #[test(owner = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_multiple_different_authorized_users(
        owner: &signer,
        user1: &signer,
        user2: &signer
    ) acquires BankAccount {
        initialize(owner, 1000);
        authorize_user(owner, @0x2);
        authorize_user(owner, @0x3);

        transfer_as_authorized(user1, @0x1, 100);
        transfer_as_authorized(user2, @0x1, 100);

        assert!(get_balance(@0x1) == 800, 0);
    }

    // ========================================================================
    // Tests - Pattern 7: Testing View Functions
    // ========================================================================

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_NOT_INITIALIZED)]
    fun test_get_balance_not_initialized_fails() acquires BankAccount {
        get_balance(@0x1); // Should abort
    }

    #[test(account = @0x1)]
    fun test_get_balance_after_operations(account: &signer) acquires BankAccount {
        initialize(account, 100);
        let balance1 = get_balance(@0x1);
        assert!(balance1 == 100, 0);

        deposit(account, 50);
        let balance2 = get_balance(@0x1);
        assert!(balance2 == 150, 1);

        withdraw(account, 30);
        let balance3 = get_balance(@0x1);
        assert!(balance3 == 120, 2);
    }
}
