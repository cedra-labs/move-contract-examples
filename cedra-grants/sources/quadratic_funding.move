/// CedraGrants Quadratic Funding Module
/// Implements quadratic funding mechanism for public goods with matching pools
module cedra_grants::quadratic_funding {
    use std::vector;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_grants::registry;

    // ==================== Error Codes ====================
    const E_ROUND_NOT_ACTIVE: u64 = 1;
    const E_ROUND_NOT_FOUND: u64 = 2;
    const E_ALREADY_CONTRIBUTED: u64 = 3;
    const E_ZERO_AMOUNT: u64 = 4;
    const E_NOT_ADMIN: u64 = 5;
    const E_ROUND_NOT_ENDED: u64 = 6;
    const E_ALREADY_DISTRIBUTED: u64 = 7;
    const E_PROJECT_NOT_IN_ROUND: u64 = 8;
    const E_INSUFFICIENT_BALANCE: u64 = 9;

    // ==================== Constants ====================
    const PRECISION: u128 = 1000000; // For sqrt calculations

    // ==================== Structs ====================

    /// Global state for quadratic funding
    struct QFState has key {
        admin: address,
        round_count: u64,
        contribution_events: event::EventHandle<ContributionEvent>,
        round_events: event::EventHandle<RoundEvent>,
    }

    /// A funding round
    struct FundingRound has key, store {
        id: u64,
        name: vector<u8>,
        description: vector<u8>,
        matching_pool: u64,
        start_time: u64,
        end_time: u64,
        projects: vector<address>,
        distributed: bool,
    }

    /// Contributions tracker for a round
    struct RoundContributions has key {
        round_id: u64,
        // Map: project_address -> vector of (contributor, amount)
        project_contributions: vector<ProjectContribution>,
        total_contributions: u64,
    }

    /// Contributions to a specific project in a round
    struct ProjectContribution has store, drop, copy {
        project_address: address,
        contributors: vector<address>,
        amounts: vector<u64>,
        total: u64,
    }

    /// Individual contribution record
    struct ContributorRecord has key {
        contributions: vector<ContributionInfo>,
    }

    struct ContributionInfo has store, drop, copy {
        round_id: u64,
        project_address: address,
        amount: u64,
        timestamp: u64,
    }

    // ==================== Events ====================

    struct ContributionEvent has drop, store {
        round_id: u64,
        contributor: address,
        project_address: address,
        amount: u64,
        timestamp: u64,
    }

    struct RoundEvent has drop, store {
        round_id: u64,
        event_type: u8, // 0: created, 1: started, 2: ended, 3: distributed
        timestamp: u64,
    }

    // ==================== Initialization ====================

    fun init_module(admin: &signer) {
        move_to(admin, QFState {
            admin: signer::address_of(admin),
            round_count: 0,
            contribution_events: event::new_event_handle<ContributionEvent>(admin),
            round_events: event::new_event_handle<RoundEvent>(admin),
        });
    }

    // ==================== Admin Functions ====================

    /// Create a new funding round
    public entry fun create_round(
        admin: &signer,
        name: vector<u8>,
        description: vector<u8>,
        matching_pool: u64,
        start_time: u64,
        end_time: u64,
        project_addresses: vector<address>,
    ) acquires QFState {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global_mut<QFState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        let round_id = state.round_count + 1;
        state.round_count = round_id;

        // Initialize project contributions
        let project_contributions = vector::empty<ProjectContribution>();
        let i = 0;
        let len = vector::length(&project_addresses);
        while (i < len) {
            vector::push_back(&mut project_contributions, ProjectContribution {
                project_address: *vector::borrow(&project_addresses, i),
                contributors: vector::empty(),
                amounts: vector::empty(),
                total: 0,
            });
            i = i + 1;
        };

        // Create round
        move_to(admin, FundingRound {
            id: round_id,
            name,
            description,
            matching_pool,
            start_time,
            end_time,
            projects: project_addresses,
            distributed: false,
        });

        move_to(admin, RoundContributions {
            round_id,
            project_contributions,
            total_contributions: 0,
        });

        // Emit event
        event::emit_event(&mut state.round_events, RoundEvent {
            round_id,
            event_type: 0,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ==================== Public Functions ====================

    /// Contribute to a project in a funding round
    public entry fun contribute(
        contributor: &signer,
        round_id: u64,
        project_address: address,
        amount: u64,
    ) acquires QFState, FundingRound, RoundContributions, ContributorRecord {
        let contributor_addr = signer::address_of(contributor);
        assert!(amount > 0, E_ZERO_AMOUNT);

        // Verify round is active
        let round = borrow_global<FundingRound>(@cedra_grants);
        let now = timestamp::now_seconds();
        assert!(now >= round.start_time && now <= round.end_time, E_ROUND_NOT_ACTIVE);

        // Find project in round
        let found = false;
        let i = 0;
        let len = vector::length(&round.projects);
        while (i < len) {
            if (*vector::borrow(&round.projects, i) == project_address) {
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_PROJECT_NOT_IN_ROUND);

        // Transfer coins
        let coins = coin::withdraw<CedraCoin>(contributor, amount);
        coin::deposit(@cedra_grants, coins);

        // Record contribution
        let contributions = borrow_global_mut<RoundContributions>(@cedra_grants);
        let j = 0;
        while (j < vector::length(&contributions.project_contributions)) {
            let pc = vector::borrow_mut(&mut contributions.project_contributions, j);
            if (pc.project_address == project_address) {
                vector::push_back(&mut pc.contributors, contributor_addr);
                vector::push_back(&mut pc.amounts, amount);
                pc.total = pc.total + amount;
                break
            };
            j = j + 1;
        };
        contributions.total_contributions = contributions.total_contributions + amount;

        // Record for contributor
        if (!exists<ContributorRecord>(contributor_addr)) {
            move_to(contributor, ContributorRecord {
                contributions: vector::empty(),
            });
        };
        let record = borrow_global_mut<ContributorRecord>(contributor_addr);
        vector::push_back(&mut record.contributions, ContributionInfo {
            round_id,
            project_address,
            amount,
            timestamp: now,
        });

        // Update registry
        registry::add_funding(project_address, amount);

        // Emit event
        let state = borrow_global_mut<QFState>(@cedra_grants);
        event::emit_event(&mut state.contribution_events, ContributionEvent {
            round_id,
            contributor: contributor_addr,
            project_address,
            amount,
            timestamp: now,
        });
    }

    /// Calculate and distribute matching funds after round ends
    public entry fun distribute_matching(
        admin: &signer,
    ) acquires QFState, FundingRound, RoundContributions {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global<QFState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        let round = borrow_global_mut<FundingRound>(@cedra_grants);
        let now = timestamp::now_seconds();
        assert!(now > round.end_time, E_ROUND_NOT_ENDED);
        assert!(!round.distributed, E_ALREADY_DISTRIBUTED);

        let contributions = borrow_global<RoundContributions>(@cedra_grants);
        
        // Calculate quadratic matching for each project
        let matching_amounts = calculate_quadratic_matching(
            &contributions.project_contributions,
            round.matching_pool,
        );

        // Distribute to projects
        let i = 0;
        let len = vector::length(&matching_amounts);
        while (i < len) {
            let amount = *vector::borrow(&matching_amounts, i);
            let project_addr = *vector::borrow(&round.projects, i);
            
            if (amount > 0) {
                registry::add_funding(project_addr, amount);
            };
            i = i + 1;
        };

        // Mark as distributed
        let round_mut = borrow_global_mut<FundingRound>(@cedra_grants);
        round_mut.distributed = true;
    }

    // ==================== Quadratic Funding Math ====================

    /// Calculate quadratic matching amounts for all projects
    /// Formula: matching_i = (sum of sqrt(contribution_j))^2 * (pool / total_qf_scores)
    fun calculate_quadratic_matching(
        project_contributions: &vector<ProjectContribution>,
        matching_pool: u64,
    ): vector<u64> {
        let qf_scores = vector::empty<u128>();
        let total_qf_score: u128 = 0;

        // Calculate QF score for each project
        let i = 0;
        let len = vector::length(project_contributions);
        while (i < len) {
            let pc = vector::borrow(project_contributions, i);
            let sum_sqrt: u128 = 0;

            // Sum of square roots of each contribution
            let j = 0;
            let contrib_len = vector::length(&pc.amounts);
            while (j < contrib_len) {
                let amount = *vector::borrow(&pc.amounts, j);
                let sqrt_amount = sqrt((amount as u128) * PRECISION);
                sum_sqrt = sum_sqrt + sqrt_amount;
                j = j + 1;
            };

            // Square the sum of square roots
            let qf_score = (sum_sqrt * sum_sqrt) / PRECISION;
            vector::push_back(&mut qf_scores, qf_score);
            total_qf_score = total_qf_score + qf_score;
            i = i + 1;
        };

        // Calculate matching amounts proportionally
        let matching_amounts = vector::empty<u64>();
        if (total_qf_score == 0) {
            let k = 0;
            while (k < len) {
                vector::push_back(&mut matching_amounts, 0);
                k = k + 1;
            };
        } else {
            let k = 0;
            while (k < len) {
                let score = *vector::borrow(&qf_scores, k);
                let matching = ((score * (matching_pool as u128)) / total_qf_score as u64);
                vector::push_back(&mut matching_amounts, matching);
                k = k + 1;
            };
        };

        matching_amounts
    }

    /// Integer square root using Newton's method
    fun sqrt(n: u128): u128 {
        if (n == 0) return 0;
        
        let x = n;
        let y = (x + 1) / 2;
        
        while (y < x) {
            x = y;
            y = (x + n / x) / 2;
        };
        
        x
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_round_count(): u64 acquires QFState {
        borrow_global<QFState>(@cedra_grants).round_count
    }

    #[view]
    public fun get_project_qf_score(
        project_contributions: vector<u64>
    ): u64 {
        let sum_sqrt: u128 = 0;
        let i = 0;
        let len = vector::length(&project_contributions);
        
        while (i < len) {
            let amount = *vector::borrow(&project_contributions, i);
            let sqrt_amount = sqrt((amount as u128) * PRECISION);
            sum_sqrt = sum_sqrt + sqrt_amount;
            i = i + 1;
        };

        ((sum_sqrt * sum_sqrt) / PRECISION as u64)
    }
}
