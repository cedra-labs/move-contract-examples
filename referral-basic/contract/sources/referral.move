module ReferralBasic::Referral {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use cedra_framework::object::{Self, Object};

    const E_REFERRAL_CODE_NOT_FOUND: u64 = 1;
    const E_REFERRAL_CODE_ALREADY_EXISTS: u64 = 2;
    const E_INVALID_REFERRAL_CODE: u64 = 3;
    const E_SELF_REFERRAL_NOT_ALLOWED: u64 = 4;
    const E_NO_REWARDS_TO_CLAIM: u64 = 5;
    const E_ALREADY_CLAIMED: u64 = 6;
    const E_ALREADY_REGISTERED: u64 = 7;
    const E_INVALID_REFERRER: u64 = 8;
    const E_CODE_TOO_SHORT: u64 = 9;
    const E_CODE_TOO_LONG: u64 = 10;

    const MIN_CODE_LENGTH: u64 = 3;
    const MAX_CODE_LENGTH: u64 = 20;
    const REWARD_AMOUNT: u64 = 100; // Base reward amount (can be adjusted)

    struct ReferralCode has store {
        code: String,
        owner: address,
        total_referrals: u64,
        total_rewards: u64,
        created_at: u64,
    }

    struct ReferralRecord has store {
        referrer: address,
        referee: address,
        code: String,
        reward_amount: u64,
        claimed: bool,
        timestamp: u64,
    }

    struct CodeIndexMapping has store {
        code: String,
        index: u64,
    }

    struct AddressCodeMapping has store {
        addr: address,
        index: u64,
    }

    struct ReferralState has key {
        codes: vector<ReferralCode>,
        records: vector<ReferralRecord>,
        code_to_index: vector<CodeIndexMapping>, // Map code string to index
        address_to_code_index: vector<AddressCodeMapping>, // Map address to their code index
        next_record_id: u64,
    }

    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, b"ReferralState");
        move_to(
            &object::generate_signer(constructor_ref),
            ReferralState {
                codes: vector::empty(),
                records: vector::empty(),
                code_to_index: vector::empty(),
                address_to_code_index: vector::empty(),
                next_record_id: 0,
            }
        );
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        init_module(admin);
    }

    #[view]
    public fun get_referral_state(): Object<ReferralState> {
        let state_address = object::create_object_address(&@ReferralBasic, b"ReferralState");
        object::address_to_object<ReferralState>(state_address)
    }

    /// Register a new referral code
    /// Anti-gaming: Prevents duplicate codes and ensures code format is valid
    public entry fun register_referral_code(
        user: &signer,
        code: String,
    ) acquires ReferralState {
        let user_addr = signer::address_of(user);
        let state = borrow_global_mut<ReferralState>(object::object_address(&get_referral_state()));
        
        // Anti-gaming: Check if user already has a code
        let i = 0;
        let len = vector::length(&state.address_to_code_index);
        while (i < len) {
            let mapping = vector::borrow(&state.address_to_code_index, i);
            if (mapping.addr == user_addr) {
                abort error::already_exists(E_ALREADY_REGISTERED)
            };
            i = i + 1;
        };

        // Anti-gaming: Validate code length
        let code_len = string::length(&code);
        assert!(code_len >= MIN_CODE_LENGTH, error::invalid_argument(E_CODE_TOO_SHORT));
        assert!(code_len <= MAX_CODE_LENGTH, error::invalid_argument(E_CODE_TOO_LONG));

        // Anti-gaming: Check if code already exists
        let code_exists = false;
        let j = 0;
        let code_map_len = vector::length(&state.code_to_index);
        while (j < code_map_len) {
            let mapping = vector::borrow(&state.code_to_index, j);
            if (string::bytes(&mapping.code) == string::bytes(&code)) {
                code_exists = true;
                break
            };
            j = j + 1;
        };
        assert!(!code_exists, error::already_exists(E_REFERRAL_CODE_ALREADY_EXISTS));

        // Create new referral code
        let code_index = vector::length(&state.codes);
        let referral_code = ReferralCode {
            code: code,
            owner: user_addr,
            total_referrals: 0,
            total_rewards: 0,
            created_at: 0, // In production, use timestamp from transaction context
        };
        vector::push_back(&mut state.codes, referral_code);
        
        // Update mappings - use the code parameter directly
        vector::push_back(&mut state.code_to_index, CodeIndexMapping {
            code,
            index: code_index,
        });
        vector::push_back(&mut state.address_to_code_index, AddressCodeMapping {
            addr: user_addr,
            index: code_index,
        });
    }

    /// Track a referral when someone uses a referral code
    /// Anti-gaming: Prevents self-referrals and duplicate referrals
    public entry fun track_referral(
        referee: &signer,
        referral_code: String,
    ) acquires ReferralState {
        let referee_addr = signer::address_of(referee);
        let state = borrow_global_mut<ReferralState>(object::object_address(&get_referral_state()));
        
        // Find the referral code
        let code_index_opt = find_code_index(&state.code_to_index, &referral_code);
        assert!(option::is_some(&code_index_opt), error::not_found(E_REFERRAL_CODE_NOT_FOUND));
        let code_index = *option::borrow(&code_index_opt);
        
        let referrer_code = vector::borrow_mut(&mut state.codes, code_index);
        
        // Anti-gaming: Prevent self-referral
        assert!(referrer_code.owner != referee_addr, error::invalid_argument(E_SELF_REFERRAL_NOT_ALLOWED));
        
        // Anti-gaming: Check if this referee has already been referred (prevent duplicate referrals)
        let i = 0;
        let records_len = vector::length(&state.records);
        while (i < records_len) {
            let record = vector::borrow(&state.records, i);
            if (record.referee == referee_addr) {
                // Referee already has a referral record
                abort error::already_exists(E_ALREADY_CLAIMED)
            };
            i = i + 1;
        };

        // Create referral record - use the code from the parameter
        let record = ReferralRecord {
            referrer: referrer_code.owner,
            referee: referee_addr,
            code: referral_code,
            reward_amount: REWARD_AMOUNT,
            claimed: false,
            timestamp: 0, // In production, use timestamp from transaction context
        };
        
        vector::push_back(&mut state.records, record);
        referrer_code.total_referrals = referrer_code.total_referrals + 1;
        referrer_code.total_rewards = referrer_code.total_rewards + REWARD_AMOUNT;
    }

    /// Claim rewards for a referral code owner
    public entry fun claim_rewards(
        owner: &signer,
    ) acquires ReferralState {
        let owner_addr = signer::address_of(owner);
        let state = borrow_global_mut<ReferralState>(object::object_address(&get_referral_state()));
        
        // Find owner's code index
        let code_index_opt = find_address_code_index(&state.address_to_code_index, owner_addr);
        assert!(option::is_some(&code_index_opt), error::not_found(E_REFERRAL_CODE_NOT_FOUND));
        let code_index = *option::borrow(&code_index_opt);
        
        let referral_code = vector::borrow(&state.codes, code_index);
        
        // Check if there are rewards to claim
        assert!(referral_code.total_rewards > 0, error::invalid_state(E_NO_REWARDS_TO_CLAIM));
        
        // Calculate unclaimed rewards
        let unclaimed_rewards = calculate_unclaimed_rewards(state, owner_addr);
        assert!(unclaimed_rewards > 0, error::invalid_state(E_NO_REWARDS_TO_CLAIM));
        
        // Mark all unclaimed records as claimed
        let i = 0;
        let records_len = vector::length(&state.records);
        while (i < records_len) {
            let record = vector::borrow_mut(&mut state.records, i);
            if (record.referrer == owner_addr && !record.claimed) {
                record.claimed = true;
            };
            i = i + 1;
        };
        
        // Note: In a real implementation, you would transfer coins/assets here
        // For this basic version, we just mark rewards as claimed
    }

    /// Helper function to find code index
    fun find_code_index(
        code_map: &vector<CodeIndexMapping>,
        code: &String,
    ): Option<u64> {
        let i = 0;
        let len = vector::length(code_map);
        while (i < len) {
            let mapping = vector::borrow(code_map, i);
            if (string::bytes(&mapping.code) == string::bytes(code)) {
                return option::some(mapping.index)
            };
            i = i + 1;
        };
        option::none()
    }

    /// Helper function to find address code index
    fun find_address_code_index(
        address_map: &vector<AddressCodeMapping>,
        addr: address,
    ): Option<u64> {
        let i = 0;
        let len = vector::length(address_map);
        while (i < len) {
            let mapping = vector::borrow(address_map, i);
            if (mapping.addr == addr) {
                return option::some(mapping.index)
            };
            i = i + 1;
        };
        option::none()
    }

    /// Calculate unclaimed rewards for an address
    fun calculate_unclaimed_rewards(
        state: &ReferralState,
        referrer: address,
    ): u64 {
        let total = 0;
        let i = 0;
        let len = vector::length(&state.records);
        while (i < len) {
            let record = vector::borrow(&state.records, i);
            if (record.referrer == referrer && !record.claimed) {
                total = total + record.reward_amount;
            };
            i = i + 1;
        };
        total
    }

    /// View function: Get referral code information
    #[view]
    public fun get_referral_code_info(code: String): (String, address, u64, u64) acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        let code_index_opt = find_code_index(&state.code_to_index, &code);
        assert!(option::is_some(&code_index_opt), error::not_found(E_REFERRAL_CODE_NOT_FOUND));
        let code_index = *option::borrow(&code_index_opt);
        
        let referral_code = vector::borrow(&state.codes, code_index);
        (
            referral_code.code,
            referral_code.owner,
            referral_code.total_referrals,
            referral_code.total_rewards,
        )
    }

    /// View function: Get referral code by owner address
    #[view]
    public fun get_code_by_owner(owner: address): (String, u64, u64) acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        let code_index_opt = find_address_code_index(&state.address_to_code_index, owner);
        assert!(option::is_some(&code_index_opt), error::not_found(E_REFERRAL_CODE_NOT_FOUND));
        let code_index = *option::borrow(&code_index_opt);
        
        let referral_code = vector::borrow(&state.codes, code_index);
        (
            referral_code.code,
            referral_code.total_referrals,
            referral_code.total_rewards,
        )
    }

    /// View function: Get unclaimed rewards for an address
    #[view]
    public fun get_unclaimed_rewards(owner: address): u64 acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        calculate_unclaimed_rewards(state, owner)
    }

    /// View function: Check if a code exists
    #[view]
    public fun code_exists(code: String): bool acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        option::is_some(&find_code_index(&state.code_to_index, &code))
    }

    /// View function: Check if an address has a referral code
    #[view]
    public fun has_referral_code(owner: address): bool acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        option::is_some(&find_address_code_index(&state.address_to_code_index, owner))
    }

    /// View function: Get total number of referral codes
    #[view]
    public fun get_total_codes(): u64 acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        vector::length(&state.codes)
    }

    /// View function: Get total number of referral records
    #[view]
    public fun get_total_records(): u64 acquires ReferralState {
        let state = borrow_global<ReferralState>(object::object_address(&get_referral_state()));
        vector::length(&state.records)
    }
}

