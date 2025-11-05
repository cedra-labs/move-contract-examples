/// Example: User Registry with Table
/// Built using: module, struct-key, table, event-emit snippets
module examples::user_registry {
    use std::signer;
    use std::string::String;
    use cedra_framework::table::{Self, Table};
    use cedra_framework::event;
    use cedra_framework::timestamp;

    /// Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_USER_EXISTS: u64 = 2;
    const E_USER_NOT_FOUND: u64 = 3;

    /// Admin address
    const ADMIN: address = @examples;

    /// User information
    /// Created with: struct-store snippet
    struct UserInfo has store, drop {
        username: String,
        created_at: u64,
        active: bool,
    }

    /// Global registry
    /// Created with: struct-key snippet + table snippet
    struct Registry has key {
        users: Table<address, UserInfo>,
        user_count: u64,
    }

    /// Registration event
    /// Created with: event-emit snippet
    #[event]
    struct UserRegistered has drop, store {
        user_address: address,
        username: String,
        timestamp: u64,
    }

    /// Initialize the registry (admin only)
    /// Created with: fun-entry snippet
    public entry fun initialize(admin: &signer) {
        // Used: assert snippet
        assert!(signer::address_of(admin) == ADMIN, E_NOT_ADMIN);
        // Used: table snippet
        let users = table::new<address, UserInfo>();
        move_to(admin, Registry {
            users,
            user_count: 0,
        });
    }

    /// Register a new user
    /// Created with: fun-entry snippet
    public entry fun register_user(
        account: &signer,
        username: String,
    ) acquires Registry {
        let addr = signer::address_of(account);
        let registry = borrow_global_mut<Registry>(ADMIN);

        // Check user doesn't exist
        assert!(!table::contains(&registry.users, addr), E_USER_EXISTS);

        // Used: timestamp snippet
        let created_at = timestamp::now_seconds();

        // Add user
        table::add(&mut registry.users, addr, UserInfo {
            username,
            created_at,
            active: true,
        });

        registry.user_count = registry.user_count + 1;

        // Used: event-emit snippet
        event::emit(UserRegistered {
            user_address: addr,
            username,
            timestamp: created_at,
        });
    }

    /// Deactivate a user (admin only)
    /// Created with: fun-entry snippet
    public entry fun deactivate_user(
        admin: &signer,
        user_addr: address,
    ) acquires Registry {
        assert!(signer::address_of(admin) == ADMIN, E_NOT_ADMIN);

        let registry = borrow_global_mut<Registry>(ADMIN);
        assert!(table::contains(&registry.users, user_addr), E_USER_NOT_FOUND);

        let user_info = table::borrow_mut(&mut registry.users, user_addr);
        user_info.active = false;
    }

    /// Get user info
    /// Created with: fun-acquires snippet
    public fun get_user_info(user_addr: address): (String, u64, bool) acquires Registry {
        let registry = borrow_global<Registry>(ADMIN);
        assert!(table::contains(&registry.users, user_addr), E_USER_NOT_FOUND);

        let user = table::borrow(&registry.users, user_addr);
        (user.username, user.created_at, user.active)
    }

    /// Get total user count
    public fun get_user_count(): u64 acquires Registry {
        borrow_global<Registry>(ADMIN).user_count
    }

    /// Check if user is registered
    public fun is_registered(addr: address): bool acquires Registry {
        let registry = borrow_global<Registry>(ADMIN);
        table::contains(&registry.users, addr)
    }

    #[test_only]
    use std::string;
    #[test_only]
    use cedra_framework::account;

    #[test(admin = @examples, alice = @0x1)]
    fun test_register(admin: &signer, alice: &signer) acquires Registry {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(alice));
        initialize(admin);

        // Register user
        register_user(alice, string::utf8(b"Alice"));

        // Verify
        assert!(is_registered(signer::address_of(alice)), 0);
        assert!(get_user_count() == 1, 1);
    }

    #[test(admin = @examples, alice = @0x1)]
    #[expected_failure(abort_code = E_USER_EXISTS)]
    fun test_duplicate_registration(admin: &signer, alice: &signer) acquires Registry {
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(alice));
        initialize(admin);
        register_user(alice, string::utf8(b"Alice"));
        register_user(alice, string::utf8(b"Alice2")); // Should fail
    }
}
