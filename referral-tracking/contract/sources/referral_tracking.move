/// # Basic Referral Tracking Contract
module module_addr::referral_tracking {
    use std::signer;
    use std::vector;
    use std::string;
    use cedra_framework::event;
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::primary_fungible_store;
    use cedra_std::table::{Self, Table};
    use std::error;

    // ========== Error Codes ==========
    
    /// System not initialized or inactive
    const E_NOT_INITIALIZED: u64 = 1;
    /// User already registered
    const E_ALREADY_REGISTERED: u64 = 2;
    /// Referral code already taken by another user
    const E_CODE_ALREADY_EXISTS: u64 = 3;
    /// Referral code not found in registry
    const E_CODE_NOT_FOUND: u64 = 4;
    /// User cannot refer themselves
    const E_SELF_REFERRAL: u64 = 5;
    /// Referrer address is invalid or not registered
    const E_INVALID_REFERRER: u64 = 6;
    /// User has no pending rewards to claim
    const E_NO_PENDING_REWARDS: u64 = 7;
    /// Code length below MIN_CODE_LENGTH
    const E_CODE_TOO_SHORT: u64 = 8;
    /// Code length above MAX_CODE_LENGTH
    const E_CODE_TOO_LONG: u64 = 9;
    /// User not found
    const E_USER_NOT_FOUND: u64 = 10;
    /// Amount cannot be zero
    const E_AMOUNT_ZERO: u64 = 11;
    /// Code contains non-alphanumeric characters
    const E_INVALID_CODE_CHAR: u64 = 12;
    /// Caller is not authorized
    const E_UNAUTHORIZED: u64 = 13;
    /// User trying to claim more than pending_rewards
    const E_INSUFFICIENT_REWARDS: u64 = 14;
    /// User already has a referral code set
    const E_CODE_ALREADY_SET: u64 = 15;
    /// Treasury object not found
    const E_TREASURY_NOT_INITIALIZED: u64 = 16;
    /// Treasury has insufficient balance for withdrawal
    const E_INSUFFICIENT_TREASURY: u64 = 17;
    
    // ========== Constants ==========
    
    /// Minimum allowed referral code length
    const MIN_CODE_LENGTH: u64 = 3;
    /// Maximum allowed referral code length
    const MAX_CODE_LENGTH: u64 = 20;
    /// Fixed reward amount credited to referrer when their code is used
    const REFERRAL_REWARD: u64 = 1000;
    
    // ========== Structs ==========
    
    /// Global system configuration stored at module address
    struct ReferralConfig has key {
        admin: address, // Administrator address
        reward_token: Object<Metadata>, // Fungible asset used for rewards
        is_active: bool, // Whether the system accepts new registrations
        total_rewards_paid: u64, // Cumulative total of all rewards claimed by users
    }
    
    /// Maps referral codes to user addresses using Table for O(1) lookups
    /// Stored at module address for centralized code registry
    /// Ensures code uniqueness across the entire system
    struct CodeRegistry has key {
        code_to_address: Table<vector<u8>, address>,
    }
    
    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Treasury object that holds reward tokens for distribution
    struct Treasury has key {
        reward_token: Object<Metadata>, // Fungible asset metadata for reward token
        treasury_store: Object<FungibleStore>, // FungibleStore object holding the actual tokens
        extend_ref: ExtendRef, // ExtendRef to generate signer for withdrawals
        total_deposited: u64, // Tracking: total amount admin has deposited
    }
    
    /// Per-user referral data stored at user's address
    struct UserReferral has key {
        referral_code: vector<u8>, // User's unique referral code (empty vector if no code set)
        referrer: address, // Address of the user who referred this user (@0x0 if none)
        referred_count: u64, // Count of users who registered using this user's code
        pending_rewards: u64, // Rewards earned but not yet claimed
        total_earned: u64, // Historical total of all rewards claimed
    }
    
    // ========== Events ==========
    
    // Emitted when a user successfully uses a referral code
    #[event]
    struct RewardEvent has drop, store {
        referrer: address, // Address of the user who owns the referral code
        referred_user: address, // Address of the new user who used the code
        amount: u64, // Amount of reward credited to referrer
    }
    
    // Emitted when a user registers a new referral code
    #[event]
    struct CodeRegisteredEvent has drop, store {
        user: address, // Address of the user registering the code
        code: vector<u8>, // The referral code being registered
    }
    
    // Emitted when a user withdraws rewards from the treasury
    #[event]
    struct RewardsClaimedEvent has drop, store {
        user: address, // Address of the user claiming rewards
        amount: u64, // Amount of tokens transferred to the user
    }
    
    // ========== Initialization ==========
    
    /// Initialize the referral tracking system
    public entry fun initialize(admin: &signer, reward_token: Object<Metadata>) {
        let admin_addr = signer::address_of(admin);
        
        // CRITICAL: Admin must be module address since resources are stored at @module_addr
        assert!(admin_addr == @module_addr, error::permission_denied(E_UNAUTHORIZED));
        
        // Prevent re-initialization
        assert!(!exists<ReferralConfig>(@module_addr), error::already_exists(E_ALREADY_REGISTERED));
        assert!(!exists<CodeRegistry>(@module_addr), error::already_exists(E_ALREADY_REGISTERED));
        
        // Check if treasury object already exists
        let treasury_obj = object::create_object_address(&@module_addr, b"Treasury");
        assert!(!exists<Treasury>(treasury_obj), error::already_exists(E_ALREADY_REGISTERED));
        
        // Create global configuration
        move_to(admin, ReferralConfig {
            admin: admin_addr,
            reward_token,
            is_active: true,
            total_rewards_paid: 0,
        });
        
        // Initialize code registry with empty table
        move_to(admin, CodeRegistry {
            code_to_address: table::new(),
        });
        
        // Create treasury object as a named object
        let constructor_ref = object::create_named_object(admin, b"Treasury");
        let treasury_signer = object::generate_signer(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        
        // Create fungible store for holding reward tokens
        fungible_asset::create_store(&constructor_ref, reward_token);
        let treasury_store = object::address_to_object<FungibleStore>(
            object::address_from_constructor_ref(&constructor_ref)
        );
        
        // Store treasury resource in the treasury object
        move_to(&treasury_signer, Treasury {
            reward_token,
            treasury_store,
            extend_ref,
            total_deposited: 0,
        });
    }


    // ========== Public Entry Functions ==========
    
    /// Register a unique referral code for the caller
    public entry fun register_code(user: &signer, code: vector<u8>) acquires ReferralConfig, CodeRegistry, UserReferral {
        let user_addr = signer::address_of(user);
        
        // Check if system is initialized and active
        assert!(exists<ReferralConfig>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let config = borrow_global<ReferralConfig>(@module_addr);
        assert!(config.is_active, error::invalid_state(E_NOT_INITIALIZED));
        
        // Validate code length
        let code_len = vector::length(&code);
        assert!(code_len >= MIN_CODE_LENGTH, error::invalid_argument(E_CODE_TOO_SHORT));
        assert!(code_len <= MAX_CODE_LENGTH, error::invalid_argument(E_CODE_TOO_LONG));
        
        // Validate code format (alphanumeric only)
        assert!(validate_code_format(&code), error::invalid_argument(E_INVALID_CODE_CHAR));
        
        // Check if code already exists in registry
        let registry = borrow_global<CodeRegistry>(@module_addr);
        assert!(!table::contains(&registry.code_to_address, code), error::already_exists(E_CODE_ALREADY_EXISTS));
        
        // Check if user already exists
        if (exists<UserReferral>(user_addr)) {
            // User exists - check if they already have a code
            let user_data = borrow_global_mut<UserReferral>(user_addr);
            let existing_code_len = vector::length(&user_data.referral_code);
            assert!(existing_code_len == 0, error::already_exists(E_CODE_ALREADY_SET));
            
            // Add code to existing user
            user_data.referral_code = code;
        } else {
            // New user - create UserReferral
            move_to(user, UserReferral {
                referral_code: code,
                referrer: @0x0,
                referred_count: 0,
                pending_rewards: 0,
                total_earned: 0,
            });
        };
        
        // Register the code in the registry
        let registry_mut = borrow_global_mut<CodeRegistry>(@module_addr);
        table::add(&mut registry_mut.code_to_address, code, user_addr);
        
        // Emit code registration event
        event::emit(CodeRegisteredEvent {
            user: user_addr,
            code,
        });
    }
    
    /// Register a new user using someone's referral code
    public entry fun register_with_code(
        user: &signer,
        referral_code: vector<u8>
    ) acquires ReferralConfig, CodeRegistry, UserReferral {
        let user_addr = signer::address_of(user);
        
        // Check if system is initialized
        assert!(exists<ReferralConfig>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let config = borrow_global<ReferralConfig>(@module_addr);
        assert!(config.is_active, error::invalid_state(E_NOT_INITIALIZED));
        
        // Check if user is already registered
        assert!(!exists<UserReferral>(user_addr), error::already_exists(E_ALREADY_REGISTERED));
        
        // Find referrer address by code using Table lookup
        let registry = borrow_global<CodeRegistry>(@module_addr);
        assert!(table::contains(&registry.code_to_address, referral_code), error::not_found(E_CODE_NOT_FOUND));
        let referrer_addr = *table::borrow(&registry.code_to_address, referral_code);
        assert!(exists<UserReferral>(referrer_addr), error::invalid_argument(E_INVALID_REFERRER));
        assert!(user_addr != referrer_addr, error::invalid_argument(E_SELF_REFERRAL));
        
        // Create user referral record (no code for referred users)
        move_to(user, UserReferral {
            referral_code: vector::empty<u8>(), // Referred users don't get codes
            referrer: referrer_addr,
            referred_count: 0,
            pending_rewards: 0,
            total_earned: 0,
        });
        
        // Update referrer's referred_count and assign fixed referral reward
        let referrer_data = borrow_global_mut<UserReferral>(referrer_addr);
        referrer_data.referred_count = referrer_data.referred_count + 1;
        referrer_data.pending_rewards = referrer_data.pending_rewards + REFERRAL_REWARD;
        
        // Emit reward event
        event::emit(RewardEvent {
            referrer: referrer_addr,
            referred_user: user_addr,
            amount: REFERRAL_REWARD,
        });
    }
    
    /// Deposit reward tokens into the treasury (admin only)
    public entry fun deposit_rewards(
        admin: &signer,
        amount: u64
    ) acquires ReferralConfig, Treasury {
        // Check if system is initialized
        assert!(exists<ReferralConfig>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let config = borrow_global<ReferralConfig>(@module_addr);
        assert!(config.is_active, error::invalid_state(E_NOT_INITIALIZED));
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(E_UNAUTHORIZED));
        
        // Get treasury object address
        let treasury_obj = get_treasury_object();
        assert!(exists<Treasury>(treasury_obj), error::not_found(E_TREASURY_NOT_INITIALIZED));
        let treasury = borrow_global_mut<Treasury>(treasury_obj);
        let reward_token = treasury.reward_token;
        let treasury_store = treasury.treasury_store;
        
        // Transfer tokens from admin to treasury store
        let fa = primary_fungible_store::withdraw(admin, reward_token, amount);
        fungible_asset::deposit(treasury_store, fa);
        
        // Update treasury stats
        treasury.total_deposited = treasury.total_deposited + amount;
    }
    
    /// Get treasury object address
    /// Helper function to compute the deterministic address of the Treasury object
    fun get_treasury_object(): address {
        object::create_object_address(&@module_addr, b"Treasury")
    }
    
    /// Claim accumulated rewards from treasury
    public entry fun claim_rewards(
        user: &signer,
        amount: u64
    ) acquires ReferralConfig, UserReferral, Treasury {
        let user_addr = signer::address_of(user);
        
        // Check if system is initialized and active
        assert!(exists<ReferralConfig>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let config = borrow_global<ReferralConfig>(@module_addr);
        assert!(config.is_active, error::invalid_state(E_NOT_INITIALIZED));
        let reward_token = config.reward_token;
        
        // Check if user exists and has pending rewards
        assert!(exists<UserReferral>(user_addr), error::not_found(E_USER_NOT_FOUND));
        
        // Validate amount
        assert!(amount > 0, error::invalid_argument(E_AMOUNT_ZERO));
        
        // Validate user has sufficient pending rewards
        let user_data = borrow_global<UserReferral>(user_addr);
        assert!(user_data.pending_rewards > 0, error::invalid_state(E_NO_PENDING_REWARDS));
        assert!(amount <= user_data.pending_rewards, error::invalid_argument(E_INSUFFICIENT_REWARDS));
        
        // Get treasury and validate it exists
        let treasury_obj = get_treasury_object();
        assert!(exists<Treasury>(treasury_obj), error::not_found(E_TREASURY_NOT_INITIALIZED));
        let treasury = borrow_global<Treasury>(treasury_obj);
        
        // Check treasury has sufficient balance
        let treasury_balance = fungible_asset::balance(treasury.treasury_store);
        assert!(treasury_balance >= amount, error::resource_exhausted(E_INSUFFICIENT_TREASURY));
        
        // transfer tokens from treasury to user
        let treasury_signer = object::generate_signer_for_extending(&treasury.extend_ref);
        let user_store = primary_fungible_store::ensure_primary_store_exists(user_addr, reward_token);
        let fa = fungible_asset::withdraw(&treasury_signer, treasury.treasury_store, amount);
        fungible_asset::deposit(user_store, fa);
        
        // Update state after successful transfer
        let user_data_mut = borrow_global_mut<UserReferral>(user_addr);
        user_data_mut.pending_rewards = user_data_mut.pending_rewards - amount;
        user_data_mut.total_earned = user_data_mut.total_earned + amount;
        
        // Update global stats
        let config_mut = borrow_global_mut<ReferralConfig>(@module_addr);
        config_mut.total_rewards_paid = config_mut.total_rewards_paid + amount;
        
        // Emit event
        event::emit(RewardsClaimedEvent {
            user: user_addr,
            amount,
        });
    }

    // ========== Helper Functions ==========
    
    /// Check if a single byte is a valid alphanumeric character
    fun is_valid_code_char(byte: u8): bool {
        (byte >= 48 && byte <= 57) ||  // 0-9
        (byte >= 65 && byte <= 90) ||  // A-Z
        (byte >= 97 && byte <= 122)    // a-z
    }
    
    /// Validate that all characters in a code are alphanumeric
    fun validate_code_format(code: &vector<u8>): bool {
        let len = vector::length(code);
        let i = 0;
        while (i < len) {
            if (!is_valid_code_char(*vector::borrow(code, i))) {
                return false
            };
            i = i + 1;
        };
        true
    }
    

    // ========== View Functions ==========
    
    #[view]
    /// Get comprehensive statistics for a user
    public fun get_user_stats(user: address): (string::String, address, u64, u64, u64) acquires UserReferral {
        if (!exists<UserReferral>(user)) {
            return (string::utf8(b""), @0x0, 0, 0, 0)
        };
        
        let data = borrow_global<UserReferral>(user);
        // Convert vector<u8> to String for better client-side handling
        let code_copy = data.referral_code;
        let code_string = string::utf8(code_copy);
        (
            code_string,
            data.referrer,
            data.referred_count,
            data.pending_rewards,
            data.total_earned
        )
    }
    
    #[view]
    /// Get pending rewards for a specific user
    public fun get_pending_rewards(user: address): u64 acquires UserReferral {
        if (!exists<UserReferral>(user)) {
            return 0
        };
        
        let data = borrow_global<UserReferral>(user);
        data.pending_rewards
    }
    
    #[view]
    /// Get global system statistics
    public fun get_global_stats(): (address, Object<Metadata>, bool, u64, u64) acquires ReferralConfig {
        assert!(exists<ReferralConfig>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let config = borrow_global<ReferralConfig>(@module_addr);
        (config.admin, config.reward_token, config.is_active, config.total_rewards_paid, REFERRAL_REWARD)
    }
    
    #[view]
    /// Get treasury balance and deposit statistics
    public fun get_treasury_stats(): (u64, u64) acquires Treasury {
        let treasury_obj = get_treasury_object();
        assert!(exists<Treasury>(treasury_obj), error::not_found(E_TREASURY_NOT_INITIALIZED));
        let treasury = borrow_global<Treasury>(treasury_obj);
        let balance = fungible_asset::balance(treasury.treasury_store);
        (balance, treasury.total_deposited)
    }
}
