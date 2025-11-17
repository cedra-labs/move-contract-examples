/// # Custom Error Codes - Organization and Best Practices
///
/// This module demonstrates best practices for defining and organizing custom error
/// codes in Move smart contracts. Well-organized error codes make debugging easier
/// and improve code maintainability.
///
/// ## Error Code Best Practices:
/// 1. Use descriptive names prefixed with `E_`
/// 2. Group related errors with comments
/// 3. Start from 1 (0 reserved for test assertions)
/// 4. Document each error's meaning
/// 5. Use consistent numbering ranges for error categories

module error_patterns::custom_error_codes {
    use std::signer;
    use cedra_framework::timestamp;

    // ========================================================================
    // Error Codes - Access Control (1-19)
    // ========================================================================

    /// Caller is not the contract admin
    const E_NOT_ADMIN: u64 = 1;

    /// Caller does not own this resource
    const E_NOT_OWNER: u64 = 2;

    /// Caller is not authorized for this action
    const E_NOT_AUTHORIZED: u64 = 3;

    /// Account has been blacklisted
    const E_BLACKLISTED: u64 = 4;

    /// Account is not whitelisted
    const E_NOT_WHITELISTED: u64 = 5;

    // ========================================================================
    // Error Codes - State Validation (20-39)
    // ========================================================================

    /// Resource does not exist at address
    const E_NOT_INITIALIZED: u64 = 20;

    /// Resource already exists at address
    const E_ALREADY_INITIALIZED: u64 = 21;

    /// Contract is paused
    const E_PAUSED: u64 = 22;

    /// Contract is not paused
    const E_NOT_PAUSED: u64 = 23;

    /// Operation is currently locked
    const E_LOCKED: u64 = 24;

    // ========================================================================
    // Error Codes - Value Validation (40-59)
    // ========================================================================

    /// Amount is zero or negative
    const E_INVALID_AMOUNT: u64 = 40;

    /// Amount exceeds maximum allowed
    const E_AMOUNT_TOO_HIGH: u64 = 41;

    /// Amount below minimum required
    const E_AMOUNT_TOO_LOW: u64 = 42;

    /// Insufficient balance
    const E_INSUFFICIENT_BALANCE: u64 = 43;

    /// Invalid address provided
    const E_INVALID_ADDRESS: u64 = 44;

    /// Invalid percentage (must be 0-100)
    const E_INVALID_PERCENTAGE: u64 = 45;

    // ========================================================================
    // Error Codes - Time-based (60-79)
    // ========================================================================

    /// Operation attempted before start time
    const E_TOO_EARLY: u64 = 60;

    /// Operation attempted after deadline
    const E_TOO_LATE: u64 = 61;

    /// Timelock has not expired
    const E_TIMELOCK_ACTIVE: u64 = 62;

    /// Cooldown period not elapsed
    const E_COOLDOWN_ACTIVE: u64 = 63;

    // ========================================================================
    // Error Codes - Business Logic (80-99)
    // ========================================================================

    /// Daily limit has been exceeded
    const E_DAILY_LIMIT_EXCEEDED: u64 = 80;

    /// Maximum supply reached
    const E_MAX_SUPPLY_REACHED: u64 = 81;

    /// Item not found in collection
    const E_NOT_FOUND: u64 = 82;

    /// Duplicate entry exists
    const E_DUPLICATE: u64 = 83;

    /// Operation not allowed in current state
    const E_INVALID_STATE: u64 = 84;

    // ========================================================================
    // Constants
    // ========================================================================

    const MAX_SUPPLY: u64 = 10000;
    const MIN_DEPOSIT: u64 = 100;
    const MAX_DEPOSIT: u64 = 1000000;
    const COOLDOWN_SECONDS: u64 = 86400; // 24 hours

    // ========================================================================
    // Structs
    // ========================================================================

    struct Vault has key {
        admin: address,
        balance: u64,
        total_supply: u64,
        paused: bool,
        last_deposit_time: u64,
    }

    struct UserAccount has key {
        balance: u64,
        last_withdraw_time: u64,
        is_whitelisted: bool,
    }

    // ========================================================================
    // Public Functions - Demonstrating Error Categories
    // ========================================================================

    /// Initialize vault - demonstrates initialization errors
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        // State validation error (20-39 range)
        assert!(!exists<Vault>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, Vault {
            admin: admin_addr,
            balance: 0,
            total_supply: 0,
            paused: false,
            last_deposit_time: 0,
        });
    }

    /// Deposit - demonstrates value validation errors
    public entry fun deposit(
        user: &signer,
        vault_addr: address,
        amount: u64
    ) acquires Vault, UserAccount {
        let user_addr = signer::address_of(user);

        // State validation (20-39)
        assert!(exists<Vault>(vault_addr), E_NOT_INITIALIZED);

        let vault = borrow_global_mut<Vault>(vault_addr);

        // State validation - paused check
        assert!(!vault.paused, E_PAUSED);

        // Value validation errors (40-59)
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(amount >= MIN_DEPOSIT, E_AMOUNT_TOO_LOW);
        assert!(amount <= MAX_DEPOSIT, E_AMOUNT_TOO_HIGH);

        // Business logic error (80-99)
        assert!(
            vault.total_supply + amount <= MAX_SUPPLY,
            E_MAX_SUPPLY_REACHED
        );

        // Update vault
        vault.balance = vault.balance + amount;
        vault.total_supply = vault.total_supply + amount;
        vault.last_deposit_time = timestamp::now_seconds();

        // Update or create user account
        if (!exists<UserAccount>(user_addr)) {
            move_to(user, UserAccount {
                balance: amount,
                last_withdraw_time: 0,
                is_whitelisted: false,
            });
        } else {
            let account = borrow_global_mut<UserAccount>(user_addr);
            account.balance = account.balance + amount;
        };
    }

    /// Withdraw - demonstrates time-based and access control errors
    public entry fun withdraw(
        user: &signer,
        vault_addr: address,
        amount: u64
    ) acquires Vault, UserAccount {
        let user_addr = signer::address_of(user);

        // State validation
        assert!(exists<Vault>(vault_addr), E_NOT_INITIALIZED);
        assert!(exists<UserAccount>(user_addr), E_NOT_INITIALIZED);

        let vault = borrow_global_mut<Vault>(vault_addr);
        let account = borrow_global_mut<UserAccount>(user_addr);

        // Access control error (1-19)
        assert!(account.is_whitelisted, E_NOT_WHITELISTED);

        // Value validation (40-59)
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(account.balance >= amount, E_INSUFFICIENT_BALANCE);

        // Time-based error (60-79)
        let now = timestamp::now_seconds();
        let time_since_last_withdraw = now - account.last_withdraw_time;
        assert!(
            account.last_withdraw_time == 0 || time_since_last_withdraw >= COOLDOWN_SECONDS,
            E_COOLDOWN_ACTIVE
        );

        // Perform withdrawal
        account.balance = account.balance - amount;
        account.last_withdraw_time = now;
        vault.balance = vault.balance - amount;
    }

    /// Admin pause - demonstrates admin-only errors
    public entry fun pause(admin: &signer, vault_addr: address) acquires Vault {
        let admin_addr = signer::address_of(admin);

        assert!(exists<Vault>(vault_addr), E_NOT_INITIALIZED);

        let vault = borrow_global_mut<Vault>(vault_addr);

        // Access control error (1-19)
        assert!(admin_addr == vault.admin, E_NOT_ADMIN);

        // State validation (20-39)
        assert!(!vault.paused, E_PAUSED);

        vault.paused = true;
    }

    /// Whitelist user - demonstrates admin authorization
    public entry fun whitelist_user(
        admin: &signer,
        vault_addr: address,
        user_addr: address
    ) acquires Vault, UserAccount {
        let admin_addr = signer::address_of(admin);

        assert!(exists<Vault>(vault_addr), E_NOT_INITIALIZED);
        assert!(exists<UserAccount>(user_addr), E_NOT_INITIALIZED);

        let vault = borrow_global<Vault>(vault_addr);
        assert!(admin_addr == vault.admin, E_NOT_ADMIN);

        let account = borrow_global_mut<UserAccount>(user_addr);
        account.is_whitelisted = true;
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    #[view]
    public fun get_vault_balance(vault_addr: address): u64 acquires Vault {
        assert!(exists<Vault>(vault_addr), E_NOT_INITIALIZED);
        borrow_global<Vault>(vault_addr).balance
    }

    #[view]
    public fun get_user_balance(user_addr: address): u64 acquires UserAccount {
        assert!(exists<UserAccount>(user_addr), E_NOT_INITIALIZED);
        borrow_global<UserAccount>(user_addr).balance
    }

    #[view]
    public fun is_whitelisted(user_addr: address): bool acquires UserAccount {
        if (!exists<UserAccount>(user_addr)) {
            return false
        };
        borrow_global<UserAccount>(user_addr).is_whitelisted
    }

    // ========================================================================
    // Tests - Demonstrating Each Error Category
    // ========================================================================

    #[test(admin = @0x1)]
    fun test_initialize_success(admin: &signer) {
        initialize(admin);
        assert!(exists<Vault>(@0x1), 0);
    }

    #[test(admin = @0x1)]
    #[expected_failure(abort_code = E_ALREADY_INITIALIZED)]
    fun test_initialize_duplicate(admin: &signer) {
        initialize(admin);
        initialize(admin); // Should fail with E_ALREADY_INITIALIZED
    }

    #[test(admin = @0x1, user = @0x2)]
    fun test_deposit_success(admin: &signer, user: &signer) acquires Vault, UserAccount {
        timestamp::set_time_has_started_for_testing(admin);
        initialize(admin);
        deposit(user, @0x1, 500);

        assert!(get_user_balance(@0x2) == 500, 0);
    }

    #[test(admin = @0x1, user = @0x2)]
    #[expected_failure(abort_code = E_AMOUNT_TOO_LOW)]
    fun test_deposit_too_low(admin: &signer, user: &signer) acquires Vault, UserAccount {
        timestamp::set_time_has_started_for_testing(admin);
        initialize(admin);
        deposit(user, @0x1, 50); // Below MIN_DEPOSIT
    }

    #[test(admin = @0x1, user = @0x2)]
    #[expected_failure(abort_code = E_AMOUNT_TOO_HIGH)]
    fun test_deposit_too_high(admin: &signer, user: &signer) acquires Vault, UserAccount {
        timestamp::set_time_has_started_for_testing(admin);
        initialize(admin);
        deposit(user, @0x1, 2000000); // Above MAX_DEPOSIT
    }

    #[test(admin = @0x1, user = @0x2)]
    #[expected_failure(abort_code = E_NOT_WHITELISTED)]
    fun test_withdraw_not_whitelisted(admin: &signer, user: &signer) acquires Vault, UserAccount {
        timestamp::set_time_has_started_for_testing(admin);
        initialize(admin);
        deposit(user, @0x1, 500);
        withdraw(user, @0x1, 100); // Should fail - not whitelisted
    }

    #[test(admin = @0x1, user = @0x2)]
    fun test_withdraw_success(admin: &signer, user: &signer) acquires Vault, UserAccount {
        timestamp::set_time_has_started_for_testing(admin);
        initialize(admin);
        deposit(user, @0x1, 500);
        whitelist_user(admin, @0x1, @0x2);
        withdraw(user, @0x1, 100);

        assert!(get_user_balance(@0x2) == 400, 0);
    }

    #[test(admin = @0x1, user = @0x2)]
    #[expected_failure(abort_code = E_COOLDOWN_ACTIVE)]
    fun test_withdraw_cooldown(admin: &signer, user: &signer) acquires Vault, UserAccount {
        timestamp::set_time_has_started_for_testing(admin);
        initialize(admin);
        deposit(user, @0x1, 500);
        whitelist_user(admin, @0x1, @0x2);

        timestamp::update_global_time_for_test_secs(1000);
        withdraw(user, @0x1, 100);

        // Try to withdraw again immediately - should fail
        timestamp::update_global_time_for_test_secs(2000); // Only 1000 seconds passed
        withdraw(user, @0x1, 100);
    }

    #[test(admin = @0x1)]
    fun test_pause_success(admin: &signer) acquires Vault {
        initialize(admin);
        pause(admin, @0x1);
    }

    #[test(admin = @0x1, attacker = @0x2)]
    #[expected_failure(abort_code = E_NOT_ADMIN)]
    fun test_pause_not_admin(admin: &signer, attacker: &signer) acquires Vault {
        initialize(admin);
        pause(attacker, @0x1); // Should fail - not admin
    }
}
