/// CedraGrants Sybil Resistance Module
/// Uses Cedra's native VRF randomness for anti-sybil lottery verification
module cedra_grants::sybil_resistance {
    use std::vector;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::randomness;

    // ==================== Error Codes ====================
    const E_NOT_ADMIN: u64 = 1;
    const E_ALREADY_VERIFIED: u64 = 2;
    const E_NOT_SELECTED: u64 = 3;
    const E_VERIFICATION_EXPIRED: u64 = 4;
    const E_ROUND_NOT_FOUND: u64 = 5;
    const E_LOTTERY_ALREADY_RUN: u64 = 6;

    // ==================== Constants ====================
    const VERIFICATION_WINDOW: u64 = 604800; // 7 days in seconds

    // ==================== Structs ====================

    /// Main state for sybil resistance
    struct SybilState has key {
        admin: address,
        verification_count: u64,
        lottery_events: event::EventHandle<LotteryEvent>,
        verification_events: event::EventHandle<VerificationEvent>,
    }

    /// Lottery round for selecting contributors to verify
    struct VerificationLottery has key, store {
        round_id: u64,
        selected_contributors: vector<address>,
        verified_contributors: vector<address>,
        failed_contributors: vector<address>,
        selection_timestamp: u64,
        lottery_run: bool,
        random_seed: vector<u8>,
    }

    /// Individual verification status
    struct VerificationStatus has key {
        address: address,
        verified: bool,
        verification_method: u8, // 0: pending, 1: social, 2: kyc, 3: on-chain history
        verified_at: u64,
        reputation_score: u64,
    }

    // ==================== Events ====================

    struct LotteryEvent has drop, store {
        round_id: u64,
        num_selected: u64,
        random_seed: vector<u8>,
        timestamp: u64,
    }

    struct VerificationEvent has drop, store {
        contributor: address,
        verified: bool,
        method: u8,
        timestamp: u64,
    }

    // ==================== Initialization ====================

    fun init_module(admin: &signer) {
        move_to(admin, SybilState {
            admin: signer::address_of(admin),
            verification_count: 0,
            lottery_events: event::new_event_handle<LotteryEvent>(admin),
            verification_events: event::new_event_handle<VerificationEvent>(admin),
        });
    }

    // ==================== Admin Functions ====================

    /// Run a random lottery to select contributors for verification
    /// Uses Cedra's native VRF for provably fair selection
    #[randomness]
    public entry fun run_verification_lottery(
        admin: &signer,
        round_id: u64,
        contributors: vector<address>,
        num_to_select: u64,
    ) acquires SybilState {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global_mut<SybilState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        // Get random bytes from Cedra's native VRF
        let random_seed = randomness::bytes(32);
        
        // Select random contributors using VRF
        let selected = select_random_contributors(
            &contributors,
            num_to_select,
            &random_seed,
        );

        let now = timestamp::now_seconds();

        // Store lottery results
        move_to(admin, VerificationLottery {
            round_id,
            selected_contributors: selected,
            verified_contributors: vector::empty(),
            failed_contributors: vector::empty(),
            selection_timestamp: now,
            lottery_run: true,
            random_seed: copy random_seed,
        });

        // Emit event
        event::emit_event(&mut state.lottery_events, LotteryEvent {
            round_id,
            num_selected: num_to_select,
            random_seed,
            timestamp: now,
        });
    }

    /// Manually verify a selected contributor (admin)
    public entry fun verify_contributor(
        admin: &signer,
        round_id: u64,
        contributor: address,
        verification_method: u8,
        reputation_score: u64,
    ) acquires SybilState, VerificationLottery, VerificationStatus {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global_mut<SybilState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        let lottery = borrow_global_mut<VerificationLottery>(@cedra_grants);
        
        // Check contributor was selected
        let found = false;
        let i = 0;
        while (i < vector::length(&lottery.selected_contributors)) {
            if (*vector::borrow(&lottery.selected_contributors, i) == contributor) {
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_NOT_SELECTED);

        let now = timestamp::now_seconds();

        // Update or create verification status
        if (exists<VerificationStatus>(contributor)) {
            let status = borrow_global_mut<VerificationStatus>(contributor);
            assert!(!status.verified, E_ALREADY_VERIFIED);
            status.verified = true;
            status.verification_method = verification_method;
            status.verified_at = now;
            status.reputation_score = reputation_score;
        } else {
            // We can't move_to for an arbitrary address, so we track in lottery
            vector::push_back(&mut lottery.verified_contributors, contributor);
        };

        state.verification_count = state.verification_count + 1;

        // Emit event
        event::emit_event(&mut state.verification_events, VerificationEvent {
            contributor,
            verified: true,
            method: verification_method,
            timestamp: now,
        });
    }

    /// Mark a contributor as failed verification
    public entry fun fail_verification(
        admin: &signer,
        round_id: u64,
        contributor: address,
    ) acquires SybilState, VerificationLottery {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global_mut<SybilState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        let lottery = borrow_global_mut<VerificationLottery>(@cedra_grants);
        vector::push_back(&mut lottery.failed_contributors, contributor);

        event::emit_event(&mut state.verification_events, VerificationEvent {
            contributor,
            verified: false,
            method: 0,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ==================== Internal Functions ====================

    /// Select random contributors using VRF seed
    fun select_random_contributors(
        contributors: &vector<address>,
        num_to_select: u64,
        random_seed: &vector<u8>,
    ): vector<address> {
        let len = vector::length(contributors);
        let to_select = if (num_to_select > len) { len } else { num_to_select };
        
        let selected = vector::empty<address>();
        let used_indices = vector::empty<u64>();

        if (to_select == 0 || len == 0) {
            return selected
        };

        let seed_index = 0;
        let selections_made = 0;

        while (selections_made < to_select) {
            // Get next random byte from seed
            let rand_byte = *vector::borrow(random_seed, seed_index % vector::length(random_seed));
            let index = ((rand_byte as u64) % len);
            
            // Check if already used
            let already_used = false;
            let i = 0;
            while (i < vector::length(&used_indices)) {
                if (*vector::borrow(&used_indices, i) == index) {
                    already_used = true;
                    break
                };
                i = i + 1;
            };

            if (!already_used) {
                vector::push_back(&mut used_indices, index);
                vector::push_back(&mut selected, *vector::borrow(contributors, index));
                selections_made = selections_made + 1;
            };

            seed_index = seed_index + 1;
            // Prevent infinite loop
            if (seed_index > vector::length(random_seed) * 10) {
                break
            };
        };

        selected
    }

    // ==================== View Functions ====================

    #[view]
    public fun is_verified(contributor: address): bool acquires VerificationStatus {
        if (!exists<VerificationStatus>(contributor)) {
            return false
        };
        borrow_global<VerificationStatus>(contributor).verified
    }

    #[view]
    public fun get_reputation_score(contributor: address): u64 acquires VerificationStatus {
        if (!exists<VerificationStatus>(contributor)) {
            return 0
        };
        borrow_global<VerificationStatus>(contributor).reputation_score
    }

    #[view]
    public fun get_lottery_results(round_id: u64): (
        vector<address>,
        vector<address>,
        vector<address>,
    ) acquires VerificationLottery {
        let lottery = borrow_global<VerificationLottery>(@cedra_grants);
        (
            lottery.selected_contributors,
            lottery.verified_contributors,
            lottery.failed_contributors,
        )
    }

    #[view]
    public fun get_verification_stats(): u64 acquires SybilState {
        borrow_global<SybilState>(@cedra_grants).verification_count
    }
}
