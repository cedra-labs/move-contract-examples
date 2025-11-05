/// Example: Simple Counter Contract
/// Built using Move snippets: module, struct-key, fun-entry, fun-acquires, test
module examples::counter {
    use std::signer;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;

    /// Counter resource stored per account
    /// Created with: struct-key snippet
    struct Counter has key {
        value: u64,
    }

    /// Initialize counter for an account
    /// Created with: fun-entry snippet
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Counter>(addr), E_ALREADY_INITIALIZED);
        // Used: move-to snippet
        move_to(account, Counter { value: 0 });
    }

    /// Increment counter value
    /// Created with: fun-entry snippet
    public entry fun increment(account: &signer) acquires Counter {
        let addr = signer::address_of(account);
        assert!(exists<Counter>(addr), E_NOT_INITIALIZED);
        // Used: borrow-global-mut snippet
        let counter = borrow_global_mut<Counter>(addr);
        counter.value = counter.value + 1;
    }

    /// Get current counter value
    /// Created with: fun-acquires snippet
    public fun get_value(addr: address): u64 acquires Counter {
        assert!(exists<Counter>(addr), E_NOT_INITIALIZED);
        // Used: borrow-global snippet
        let counter = borrow_global<Counter>(addr);
        counter.value
    }

    /// Reset counter to zero
    /// Created with: fun-entry snippet
    public entry fun reset(account: &signer) acquires Counter {
        let addr = signer::address_of(account);
        let counter = borrow_global_mut<Counter>(addr);
        counter.value = 0;
    }

    #[test(account = @0x1)]
    fun test_initialize(account: &signer) {
        initialize(account);
        assert!(exists<Counter>(signer::address_of(account)), 0);
    }

    #[test(account = @0x1)]
    fun test_increment(account: &signer) acquires Counter {
        initialize(account);
        increment(account);
        increment(account);
        let value = get_value(signer::address_of(account));
        assert!(value == 2, 0);
    }

    #[test(account = @0x1)]
    #[expected_failure(abort_code = E_ALREADY_INITIALIZED)]
    fun test_double_initialize(account: &signer) {
        initialize(account);
        initialize(account);
    }

    #[test(account = @0x1)]
    fun test_reset(account: &signer) acquires Counter {
        initialize(account);
        increment(account);
        reset(account);
        assert!(get_value(signer::address_of(account)) == 0, 0);
    }
}
