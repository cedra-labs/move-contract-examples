// Treasury system - manages DAO funds with secure deposit/withdrawal and reentrancy protection
module movedao_addrx::treasury {
    use std::signer;
    use std::event;
    use std::vector;
    use std::string;
    use std::option::{Self, Option};
    use std::type_info;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::timestamp;
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::primary_fungible_store;
    use movedao_addrx::admin;
    use movedao_addrx::membership;
    use movedao_addrx::errors;
    use movedao_addrx::activity_tracker;

    friend movedao_addrx::dao_core_file;

    // Activity tracking events
    #[event]
    struct TreasuryDepositEvent has drop, store {
        movedao_addrxess: address,
        depositor: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
        transaction_hash: vector<u8>,
    }

    #[event]
    struct TreasuryWithdrawalEvent has drop, store {
        movedao_addrxess: address,
        withdrawer: address,
        amount: u64,
        remaining_balance: u64,
        timestamp: u64,
        transaction_hash: vector<u8>,
    }

    #[event]
    struct TreasuryRewardWithdrawalEvent has drop, store {
        movedao_addrxess: address,
        recipient: address,
        amount: u64,
        remaining_balance: u64,
        timestamp: u64,
        transaction_hash: vector<u8>,
    }

    // Reentrancy protection
    struct ReentrancyGuard has key {
        locked: bool,
    }

    struct Treasury has key {
        balance: coin::Coin<CedraCoin>,
        daily_withdrawal_limit: u64,
        last_withdrawal_day: u64,
        daily_withdrawn: u64,
        movedao_addrxess: address, // Track which DAO this treasury belongs to
        allow_public_deposits: bool, // Allow non-members to deposit (disabled by default)
        last_major_withdrawal_time: u64, // Track last significant withdrawal for rolling window
    }

    // Vault registry to track all FA vaults created by this DAO
    struct DAOVaultRegistry has key {
        vaults: vector<address>,
    }

    // Individual FA token vault for a specific fungible asset
    struct TokenVault has key {
        dao_address: address,
        fa_metadata: Object<Metadata>,
        store: Object<FungibleStore>,
    }

    public fun init_treasury(account: &signer): Object<Treasury> {
        let addr = signer::address_of(account);
        assert!(!exists<Treasury>(addr), errors::already_exists());

        let treasury = Treasury {
            balance: coin::zero<CedraCoin>(),
            daily_withdrawal_limit: 18446744073709551615, // No limit (u64::MAX)
            last_withdrawal_day: 0,
            daily_withdrawn: 0,
            movedao_addrxess: addr, // Store the DAO address
            allow_public_deposits: false, // Default to member-only deposits (secure)
            last_major_withdrawal_time: 0, // Initialize withdrawal tracking
        };

        // Initialize reentrancy guard
        let guard = ReentrancyGuard {
            locked: false,
        };

        // Initialize vault registry
        let vault_registry = DAOVaultRegistry {
            vaults: vector::empty<address>(),
        };

        let constructor_ref = object::create_object_from_account(account);
        let object_signer = object::generate_signer(&constructor_ref);
        move_to(&object_signer, treasury);
        move_to(&object_signer, guard);
        move_to(&object_signer, vault_registry);

        object::object_from_constructor_ref(&constructor_ref)
    }

    // =========================
    // Treasury Deposit Functions
    // =========================

    // Typed deposit function - wallets can display the coin type
    // Deposit function with type parameter to show amount in wallet modal
    public entry fun deposit_to_object_typed<CoinType>(account: &signer, treasury_obj: Object<Treasury>, amount: u64) acquires Treasury {
        // Ensure only AptosCoin is accepted for security
        assert!(
            type_info::type_of<CoinType>() == type_info::type_of<CedraCoin>(),
            errors::invalid_amount()
        );

        let depositor = signer::address_of(account);
        let treasury = borrow_global_mut<Treasury>(object::object_address(&treasury_obj));
        let movedao_addrx = treasury.movedao_addrxess;

        // CHECK DEPOSIT PERMISSIONS: Respect public deposits setting
        if (!treasury.allow_public_deposits) {
            // If public deposits are disabled, only members or admins can deposit
            if (!admin::is_admin(movedao_addrx, depositor)) {
                assert!(membership::is_member(movedao_addrx, depositor), errors::not_member());
            };
        };
        // If public deposits are enabled, anyone can deposit (no additional checks needed)

        // Validate amount
        assert!(amount > 0, errors::invalid_amount());

        let coins = coin::withdraw<CedraCoin>(account, amount);
        coin::merge(&mut treasury.balance, coins);

        // Emit deposit event
        event::emit(TreasuryDepositEvent {
            movedao_addrxess: movedao_addrx,
            depositor,
            amount,
            new_balance: coin::value(&treasury.balance),
            timestamp: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });

        // Log treasury deposit activity
        activity_tracker::emit_activity(
            movedao_addrx,                    // dao_address
            9,                               // activity_type: TREASURY_DEPOSIT
            depositor,                       // user_address
            string::utf8(b"Treasury Deposit"),
            string::utf8(b"Deposited tokens to DAO treasury"),
            amount,
            vector::empty<u8>(),
            vector::empty<u8>(),
            0
        );
    }

    public entry fun withdraw_from_object(account: &signer, movedao_addrx: address, treasury_obj: Object<Treasury>, amount: u64) acquires Treasury, ReentrancyGuard {
        assert!(admin::is_admin(movedao_addrx, signer::address_of(account)), errors::not_admin());

        let treasury_addr = object::object_address(&treasury_obj);

        // Reentrancy protection
        let guard = borrow_global_mut<ReentrancyGuard>(treasury_addr);
        assert!(!guard.locked, errors::invalid_state(1));
        guard.locked = true;

        let treasury = borrow_global_mut<Treasury>(treasury_addr);

        // Validate sufficient balance
        let current_balance = coin::value(&treasury.balance);
        assert!(current_balance >= amount, errors::insufficient_treasury());
        
        // Extract coins before external call
        let coins = coin::extract(&mut treasury.balance, amount);
        let recipient = signer::address_of(account);
        
        // CRITICAL FIX: Keep lock until after external call
        coin::deposit(recipient, coins);

        // Emit withdrawal event
        event::emit(TreasuryWithdrawalEvent {
            movedao_addrxess: movedao_addrx,
            withdrawer: recipient,
            amount,
            remaining_balance: coin::value(&treasury.balance),
            timestamp: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });

        // Log treasury withdrawal activity
        activity_tracker::emit_activity(
            movedao_addrx,                    // dao_address
            10,                              // activity_type: TREASURY_WITHDRAWAL
            recipient,                       // user_address
            string::utf8(b"Treasury Withdrawal"),
            string::utf8(b"Withdrew tokens from DAO treasury"),
            amount,
            vector::empty<u8>(),
            vector::empty<u8>(),
            0
        );

        // Unlock AFTER external interaction
        guard.locked = false;
    }

    #[view]
    public fun get_balance_from_object(treasury_obj: Object<Treasury>): u64 acquires Treasury {
        let treasury = borrow_global<Treasury>(object::object_address(&treasury_obj));
        coin::value(&treasury.balance)
    }

    // Enhanced treasury view functions
    #[view]
    public fun get_treasury_info(treasury_obj: Object<Treasury>): (u64, u64, u64, u64, address, bool) acquires Treasury {
        let treasury = borrow_global<Treasury>(object::object_address(&treasury_obj));
        (
            coin::value(&treasury.balance),
            treasury.daily_withdrawal_limit,
            treasury.last_withdrawal_day,
            treasury.daily_withdrawn,
            treasury.movedao_addrxess,
            treasury.allow_public_deposits
        )
    }

    #[view]
    public fun get_daily_withdrawal_status(treasury_obj: Object<Treasury>): (u64, u64, u64) acquires Treasury {
        let treasury = borrow_global<Treasury>(object::object_address(&treasury_obj));
        let current_day = timestamp::now_seconds() / 86400;
        let remaining_limit = if (treasury.last_withdrawal_day == current_day) {
            if (treasury.daily_withdrawn >= treasury.daily_withdrawal_limit) {
                0
            } else {
                treasury.daily_withdrawal_limit - treasury.daily_withdrawn
            }
        } else {
            treasury.daily_withdrawal_limit
        };
        (treasury.daily_withdrawal_limit, treasury.daily_withdrawn, remaining_limit)
    }

    #[view]
    public fun can_withdraw_amount(treasury_obj: Object<Treasury>, amount: u64): bool acquires Treasury {
        let treasury = borrow_global<Treasury>(object::object_address(&treasury_obj));
        let current_day = timestamp::now_seconds() / 86400;
        let available_daily = if (treasury.last_withdrawal_day == current_day) {
            if (treasury.daily_withdrawn >= treasury.daily_withdrawal_limit) {
                0
            } else {
                treasury.daily_withdrawal_limit - treasury.daily_withdrawn
            }
        } else {
            treasury.daily_withdrawal_limit
        };
        amount <= available_daily && amount <= coin::value(&treasury.balance)
    }

    // Admin functions for treasury management
    public entry fun set_public_deposits(admin: &signer, movedao_addrx: address, treasury_obj: Object<Treasury>, allow: bool) acquires Treasury {
        assert!(admin::is_admin(movedao_addrx, signer::address_of(admin)), errors::not_admin());
        
        let treasury = borrow_global_mut<Treasury>(object::object_address(&treasury_obj));
        treasury.allow_public_deposits = allow;
    }

    #[view]
    public fun allows_public_deposits(treasury_obj: Object<Treasury>): bool acquires Treasury {
        let treasury = borrow_global<Treasury>(object::object_address(&treasury_obj));
        treasury.allow_public_deposits
    }

    // Legacy functions - these operate directly on DAO addresses without circular dependency
    // These functions assume treasury exists at the DAO address for backward compatibility
    public entry fun deposit(account: &signer, movedao_addrx: address, amount: u64) acquires Treasury {
        let depositor = signer::address_of(account);
        let treasury_addr = get_legacy_treasury_addr(movedao_addrx);
        assert!(exists<Treasury>(treasury_addr), errors::not_found());
        
        let treasury = borrow_global_mut<Treasury>(treasury_addr);
        
        // CHECK DEPOSIT PERMISSIONS: Respect public deposits setting
        if (!treasury.allow_public_deposits) {
            // If public deposits are disabled, only members or admins can deposit
            if (!admin::is_admin(movedao_addrx, depositor)) {
                assert!(membership::is_member(movedao_addrx, depositor), errors::not_member());
            };
        };
        // If public deposits are enabled, anyone can deposit (no additional checks needed)
        
        // Validate amount
        assert!(amount > 0, errors::invalid_amount());
        
        let coins = coin::withdraw<CedraCoin>(account, amount);
        coin::merge(&mut treasury.balance, coins);
        
        // Emit deposit event
        event::emit(TreasuryDepositEvent {
            movedao_addrxess: movedao_addrx,
            depositor,
            amount,
            new_balance: coin::value(&treasury.balance),
            timestamp: timestamp::now_seconds(),
            transaction_hash: vector::empty(), // TODO: Add actual transaction hash
        });

        // Log treasury deposit activity (for legacy function consistency)
        activity_tracker::emit_activity(
            movedao_addrx,                    // dao_address
            9,                               // activity_type: TREASURY_DEPOSIT
            depositor,                       // user_address
            string::utf8(b"Treasury Deposit"),                    // title
            string::utf8(b"Deposited tokens to DAO treasury"),   // description
            amount,                          // amount
            vector::empty<u8>(),             // metadata (empty for now)
            vector::empty<u8>(),             // transaction_hash (will be filled by the tracker)
            0                                // block_number (will be filled by the tracker)
        );
    }

    public entry fun withdraw(account: &signer, movedao_addrx: address, amount: u64) acquires Treasury, ReentrancyGuard {
        assert!(admin::is_admin(movedao_addrx, signer::address_of(account)), errors::not_admin());

        let treasury_addr = get_legacy_treasury_addr(movedao_addrx);

        // Reentrancy protection
        let guard = borrow_global_mut<ReentrancyGuard>(treasury_addr);
        assert!(!guard.locked, errors::invalid_state(1));
        guard.locked = true;

        let treasury = borrow_global_mut<Treasury>(treasury_addr);

        // Validate sufficient balance
        let current_balance = coin::value(&treasury.balance);
        assert!(current_balance >= amount, errors::insufficient_treasury());
        
        // Extract coins before external call
        let coins = coin::extract(&mut treasury.balance, amount);
        let recipient = signer::address_of(account);
        
        // CRITICAL FIX: Keep lock until after external call
        coin::deposit(recipient, coins);

        // Emit withdrawal event
        event::emit(TreasuryWithdrawalEvent {
            movedao_addrxess: movedao_addrx,
            withdrawer: recipient,
            amount,
            remaining_balance: coin::value(&treasury.balance),
            timestamp: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });

        // Log treasury withdrawal activity
        activity_tracker::emit_activity(
            movedao_addrx,                    // dao_address
            10,                              // activity_type: TREASURY_WITHDRAWAL
            recipient,                       // user_address
            string::utf8(b"Treasury Withdrawal"),
            string::utf8(b"Withdrew tokens from DAO treasury"),
            amount,
            vector::empty<u8>(),
            vector::empty<u8>(),
            0
        );

        // Unlock AFTER external interaction
        guard.locked = false;
    }

    #[view]
    public fun get_balance(movedao_addrx: address): u64 acquires Treasury {
        let treasury_addr = get_legacy_treasury_addr(movedao_addrx);
        if (!exists<Treasury>(treasury_addr)) return 0;
        
        let treasury = borrow_global<Treasury>(treasury_addr);
        coin::value(&treasury.balance)
    }

    // Helper function to determine treasury address for legacy functions
    #[view]
    fun get_legacy_treasury_addr(movedao_addrx: address): address {
        // For object-based treasuries created through dao_core, we need to compute the object address
        // This is a simplified approach - in production, you might want to store this mapping
        movedao_addrx // Simplified: assume treasury is at DAO address for legacy compatibility
    }

    // =========================
    // Fungible Asset Vault Functions
    // =========================

    /// Create a new FA token vault for the DAO
    /// Only admins can create vaults
    public entry fun create_dao_vault(
        admin: &signer,
        movedao_addrx: address,
        treasury_obj: Object<Treasury>,
        fa_metadata: Object<Metadata>
    ) acquires DAOVaultRegistry {
        // Verify admin permission
        assert!(admin::is_admin(movedao_addrx, signer::address_of(admin)), errors::not_admin());

        let treasury_addr = object::object_address(&treasury_obj);

        // Create vault object
        let vault_constructor_ref = object::create_object_from_account(admin);
        let vault_signer = object::generate_signer(&vault_constructor_ref);
        let vault_addr = signer::address_of(&vault_signer);

        // Create fungible store for this FA
        let store_constructor_ref = &object::create_object(vault_addr);
        let store = fungible_asset::create_store(store_constructor_ref, fa_metadata);

        // Initialize vault
        let vault = TokenVault {
            dao_address: movedao_addrx,
            fa_metadata,
            store,
        };
        move_to(&vault_signer, vault);

        // Register vault in registry
        let registry = borrow_global_mut<DAOVaultRegistry>(treasury_addr);
        vector::push_back(&mut registry.vaults, vault_addr);
    }

    // View all vaults for a DAO treasury
    #[view]
    public fun get_dao_vaults(treasury_obj: Object<Treasury>): vector<address> acquires DAOVaultRegistry {
        let treasury_addr = object::object_address(&treasury_obj);
        let registry = borrow_global<DAOVaultRegistry>(treasury_addr);
        registry.vaults
    }

    /// Admin deposits FA tokens to a specific vault
    public entry fun deposit_to_dao_vault(
        admin: &signer,
        movedao_addrx: address,
        vault_addr: address,
        amount: u64
    ) acquires TokenVault {
        // Verify admin permission
        assert!(admin::is_admin(movedao_addrx, signer::address_of(admin)), errors::not_admin());
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());

        let vault = borrow_global<TokenVault>(vault_addr);
        assert!(vault.dao_address == movedao_addrx, errors::not_authorized());

        // Transfer from admin's primary store to vault store
        let fa = primary_fungible_store::withdraw(admin, vault.fa_metadata, amount);
        fungible_asset::deposit(vault.store, fa);
    }

    /// Admin withdraws FA tokens from a vault
    public entry fun withdraw_from_dao_vault(
        admin: &signer,
        movedao_addrx: address,
        vault_addr: address,
        amount: u64,
        recipient: address
    ) acquires TokenVault {
        // Verify admin permission
        assert!(admin::is_admin(movedao_addrx, signer::address_of(admin)), errors::not_admin());
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());

        let vault = borrow_global<TokenVault>(vault_addr);
        assert!(vault.dao_address == movedao_addrx, errors::not_authorized());

        // Withdraw from vault and deposit to recipient
        let fa = fungible_asset::withdraw(admin, vault.store, amount);
        primary_fungible_store::deposit(recipient, fa);
    }

    /// User deposits FA tokens to vault (with permission check)
    public entry fun user_deposit_to_vault(
        user: &signer,
        movedao_addrx: address,
        vault_addr: address,
        amount: u64
    ) acquires TokenVault {
        let user_addr = signer::address_of(user);

        // Check if public deposits are allowed, otherwise require membership
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        assert!(vault.dao_address == movedao_addrx, errors::not_authorized());

        // Permission check: admin or member
        if (!admin::is_admin(movedao_addrx, user_addr)) {
            assert!(membership::is_member(movedao_addrx, user_addr), errors::not_member());
        };

        // Transfer from user's primary store to vault store
        let fa = primary_fungible_store::withdraw(user, vault.fa_metadata, amount);
        fungible_asset::deposit(vault.store, fa);
    }

    // View vault balance
    #[view]
    public fun get_vault_balance(vault_addr: address): u64 acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::balance(vault.store)
    }

    // View vault metadata
    #[view]
    public fun get_vault_metadata(vault_addr: address): Object<Metadata> acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        vault.fa_metadata
    }

    // View vault info including name, symbol, decimals, and balance
    #[view]
    public fun get_vault_info(vault_addr: address): (string::String, string::String, u8, u64, address) acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);

        let name = fungible_asset::name(vault.fa_metadata);
        let symbol = fungible_asset::symbol(vault.fa_metadata);
        let decimals = fungible_asset::decimals(vault.fa_metadata);
        let balance = fungible_asset::balance(vault.store);
        let dao_addr = vault.dao_address;

        (name, symbol, decimals, balance, dao_addr)
    }

    // View just the name of the fungible asset
    #[view]
    public fun get_vault_asset_name(vault_addr: address): string::String acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::name(vault.fa_metadata)
    }

    // View just the symbol of the fungible asset
    #[view]
    public fun get_vault_asset_symbol(vault_addr: address): string::String acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::symbol(vault.fa_metadata)
    }

    // View the decimals of the fungible asset
    #[view]
    public fun get_vault_asset_decimals(vault_addr: address): u8 acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::decimals(vault.fa_metadata)
    }

    // View the icon URI of the fungible asset
    #[view]
    public fun get_vault_asset_icon_uri(vault_addr: address): string::String acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::icon_uri(vault.fa_metadata)
    }

    // View the project URI of the fungible asset
    #[view]
    public fun get_vault_asset_project_uri(vault_addr: address): string::String acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::project_uri(vault.fa_metadata)
    }

    // View total supply of the fungible asset (returns Option)
    #[view]
    public fun get_vault_asset_supply(vault_addr: address): Option<u128> acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::supply(vault.fa_metadata)
    }

    // View maximum supply of the fungible asset (returns Option)
    #[view]
    public fun get_vault_asset_maximum(vault_addr: address): Option<u128> acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        fungible_asset::maximum(vault.fa_metadata)
    }

    // View total supply as u128 (returns 0 if None)
    #[view]
    public fun get_vault_supply_or_zero(vault_addr: address): u128 acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        let supply_opt = fungible_asset::supply(vault.fa_metadata);
        if (option::is_some(&supply_opt)) {
            *option::borrow(&supply_opt)
        } else {
            0
        }
    }

    // View maximum supply as u128 (returns 0 if None)
    #[view]
    public fun get_vault_maximum_or_zero(vault_addr: address): u128 acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        let max_opt = fungible_asset::maximum(vault.fa_metadata);
        if (option::is_some(&max_opt)) {
            *option::borrow(&max_opt)
        } else {
            0
        }
    }

    // View all vault addresses and their basic info for a treasury
    #[view]
    public fun get_all_vaults_info(treasury_obj: Object<Treasury>): vector<address> acquires DAOVaultRegistry {
        let treasury_addr = object::object_address(&treasury_obj);
        let registry = borrow_global<DAOVaultRegistry>(treasury_addr);
        registry.vaults
    }

    // Check if a vault exists
    #[view]
    public fun vault_exists(vault_addr: address): bool {
        exists<TokenVault>(vault_addr)
    }

    // Get vault's DAO address
    #[view]
    public fun get_vault_dao_address(vault_addr: address): address acquires TokenVault {
        assert!(exists<TokenVault>(vault_addr), errors::invalid_vault_address());
        let vault = borrow_global<TokenVault>(vault_addr);
        vault.dao_address
    }

    // Get total number of vaults for a treasury
    #[view]
    public fun get_vaults_count(treasury_obj: Object<Treasury>): u64 acquires DAOVaultRegistry {
        let treasury_addr = object::object_address(&treasury_obj);
        let registry = borrow_global<DAOVaultRegistry>(treasury_addr);
        vector::length(&registry.vaults)
    }
}