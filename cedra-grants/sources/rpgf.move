/// CedraGrants RPGF Module (Retroactive Public Goods Funding)
/// Enables community voting to reward projects that have already delivered value
module cedra_grants::rpgf {
    use std::vector;
    use std::string::String;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;

    // ==================== Error Codes ====================
    const E_NOT_ADMIN: u64 = 1;
    const E_ROUND_NOT_ACTIVE: u64 = 2;
    const E_ALREADY_VOTED: u64 = 3;
    const E_ALREADY_NOMINATED: u64 = 4;
    const E_NOMINATION_NOT_FOUND: u64 = 5;
    const E_VOTING_NOT_ENDED: u64 = 6;
    const E_ALREADY_DISTRIBUTED: u64 = 7;
    const E_INSUFFICIENT_VOTES: u64 = 8;
    const E_INVALID_ALLOCATION: u64 = 9;

    // ==================== Constants ====================
    const MIN_VOTES_THRESHOLD: u64 = 3; // Minimum votes to qualify

    // ==================== Structs ====================

    /// Main RPGF state
    struct RPGFState has key {
        admin: address,
        round_count: u64,
        nomination_events: event::EventHandle<NominationEvent>,
        vote_events: event::EventHandle<VoteEvent>,
        distribution_events: event::EventHandle<DistributionEvent>,
    }

    /// RPGF funding round
    struct RPGFRound has key, store {
        id: u64,
        name: String,
        description: String,
        total_pool: u64,
        nominations: vector<Nomination>,
        voting_start: u64,
        voting_end: u64,
        distributed: bool,
    }

    /// Project nomination for RPGF
    struct Nomination has store, drop, copy {
        id: u64,
        project_address: address,
        nominator: address,
        impact_description: String,
        total_votes: u64,
        voter_count: u64,
        nominated_at: u64,
    }

    /// Voter record to track allocations
    struct VoterRecord has key {
        round_id: u64,
        allocations: vector<VoteAllocation>,
        total_allocated: u64,
    }

    struct VoteAllocation has store, drop, copy {
        nomination_id: u64,
        weight: u64, // Percentage * 100 (e.g., 2500 = 25%)
    }

    // ==================== Events ====================

    struct NominationEvent has drop, store {
        round_id: u64,
        nomination_id: u64,
        project_address: address,
        nominator: address,
        timestamp: u64,
    }

    struct VoteEvent has drop, store {
        round_id: u64,
        voter: address,
        allocations: vector<VoteAllocation>,
        timestamp: u64,
    }

    struct DistributionEvent has drop, store {
        round_id: u64,
        recipients: vector<address>,
        amounts: vector<u64>,
        timestamp: u64,
    }

    // ==================== Initialization ====================

    fun init_module(admin: &signer) {
        move_to(admin, RPGFState {
            admin: signer::address_of(admin),
            round_count: 0,
            nomination_events: event::new_event_handle<NominationEvent>(admin),
            vote_events: event::new_event_handle<VoteEvent>(admin),
            distribution_events: event::new_event_handle<DistributionEvent>(admin),
        });
    }

    // ==================== Admin Functions ====================

    /// Create a new RPGF round
    public entry fun create_rpgf_round(
        admin: &signer,
        name: String,
        description: String,
        total_pool: u64,
        voting_start: u64,
        voting_end: u64,
    ) acquires RPGFState {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global_mut<RPGFState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        let round_id = state.round_count + 1;
        state.round_count = round_id;

        move_to(admin, RPGFRound {
            id: round_id,
            name,
            description,
            total_pool,
            nominations: vector::empty(),
            voting_start,
            voting_end,
            distributed: false,
        });
    }

    // ==================== Public Functions ====================

    /// Nominate a project for RPGF
    public entry fun nominate_project(
        nominator: &signer,
        round_id: u64,
        project_address: address,
        impact_description: String,
    ) acquires RPGFState, RPGFRound {
        let nominator_addr = signer::address_of(nominator);
        let round = borrow_global_mut<RPGFRound>(@cedra_grants);
        
        let now = timestamp::now_seconds();
        assert!(now < round.voting_end, E_ROUND_NOT_ACTIVE);

        // Check not already nominated
        let i = 0;
        while (i < vector::length(&round.nominations)) {
            let nom = vector::borrow(&round.nominations, i);
            assert!(nom.project_address != project_address, E_ALREADY_NOMINATED);
            i = i + 1;
        };

        let nomination_id = vector::length(&round.nominations) + 1;
        
        vector::push_back(&mut round.nominations, Nomination {
            id: (nomination_id as u64),
            project_address,
            nominator: nominator_addr,
            impact_description,
            total_votes: 0,
            voter_count: 0,
            nominated_at: now,
        });

        // Emit event
        let state = borrow_global_mut<RPGFState>(@cedra_grants);
        event::emit_event(&mut state.nomination_events, NominationEvent {
            round_id,
            nomination_id: (nomination_id as u64),
            project_address,
            nominator: nominator_addr,
            timestamp: now,
        });
    }

    /// Cast votes for RPGF nominations
    /// allocations: vector of (nomination_id, weight) pairs
    /// Weights must sum to 10000 (100.00%)
    public entry fun cast_votes(
        voter: &signer,
        round_id: u64,
        nomination_ids: vector<u64>,
        weights: vector<u64>,
    ) acquires RPGFState, RPGFRound, VoterRecord {
        let voter_addr = signer::address_of(voter);
        let round = borrow_global_mut<RPGFRound>(@cedra_grants);
        
        let now = timestamp::now_seconds();
        assert!(now >= round.voting_start && now <= round.voting_end, E_ROUND_NOT_ACTIVE);

        // Validate weights sum to 10000
        let total_weight: u64 = 0;
        let i = 0;
        while (i < vector::length(&weights)) {
            total_weight = total_weight + *vector::borrow(&weights, i);
            i = i + 1;
        };
        assert!(total_weight == 10000, E_INVALID_ALLOCATION);

        // Check not already voted
        assert!(!exists<VoterRecord>(voter_addr), E_ALREADY_VOTED);

        // Build allocations and update nominations
        let allocations = vector::empty<VoteAllocation>();
        let j = 0;
        while (j < vector::length(&nomination_ids)) {
            let nom_id = *vector::borrow(&nomination_ids, j);
            let weight = *vector::borrow(&weights, j);
            
            // Update nomination vote count
            let nom = vector::borrow_mut(&mut round.nominations, nom_id - 1);
            nom.total_votes = nom.total_votes + weight;
            nom.voter_count = nom.voter_count + 1;

            vector::push_back(&mut allocations, VoteAllocation {
                nomination_id: nom_id,
                weight,
            });
            j = j + 1;
        };

        // Store voter record
        move_to(voter, VoterRecord {
            round_id,
            allocations: copy allocations,
            total_allocated: total_weight,
        });

        // Emit event
        let state = borrow_global_mut<RPGFState>(@cedra_grants);
        event::emit_event(&mut state.vote_events, VoteEvent {
            round_id,
            voter: voter_addr,
            allocations,
            timestamp: now,
        });
    }

    /// Distribute RPGF funds based on voting results
    public entry fun distribute_rpgf(
        admin: &signer,
    ) acquires RPGFState, RPGFRound {
        let admin_addr = signer::address_of(admin);
        let state = borrow_global_mut<RPGFState>(@cedra_grants);
        assert!(state.admin == admin_addr, E_NOT_ADMIN);

        let round = borrow_global_mut<RPGFRound>(@cedra_grants);
        let now = timestamp::now_seconds();
        assert!(now > round.voting_end, E_VOTING_NOT_ENDED);
        assert!(!round.distributed, E_ALREADY_DISTRIBUTED);

        // Calculate total votes across qualifying nominations
        let total_votes: u64 = 0;
        let qualifying = vector::empty<u64>(); // indices of qualifying nominations
        
        let i = 0;
        while (i < vector::length(&round.nominations)) {
            let nom = vector::borrow(&round.nominations, i);
            if (nom.voter_count >= MIN_VOTES_THRESHOLD) {
                total_votes = total_votes + nom.total_votes;
                vector::push_back(&mut qualifying, i);
            };
            i = i + 1;
        };

        // Distribute proportionally
        let recipients = vector::empty<address>();
        let amounts = vector::empty<u64>();

        if (total_votes > 0) {
            let j = 0;
            while (j < vector::length(&qualifying)) {
                let idx = *vector::borrow(&qualifying, j);
                let nom = vector::borrow(&round.nominations, idx);
                let share = (nom.total_votes * round.total_pool) / total_votes;
                
                vector::push_back(&mut recipients, nom.project_address);
                vector::push_back(&mut amounts, share);
                j = j + 1;
            };
        };

        round.distributed = true;

        // Emit event
        event::emit_event(&mut state.distribution_events, DistributionEvent {
            round_id: round.id,
            recipients: copy recipients,
            amounts: copy amounts,
            timestamp: now,
        });
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_round_count(): u64 acquires RPGFState {
        borrow_global<RPGFState>(@cedra_grants).round_count
    }

    #[view]
    public fun get_nominations(round_id: u64): vector<Nomination> acquires RPGFRound {
        borrow_global<RPGFRound>(@cedra_grants).nominations
    }

    #[view]
    public fun get_nomination_votes(
        round_id: u64,
        nomination_id: u64,
    ): (u64, u64) acquires RPGFRound {
        let round = borrow_global<RPGFRound>(@cedra_grants);
        let nom = vector::borrow(&round.nominations, nomination_id - 1);
        (nom.total_votes, nom.voter_count)
    }

    #[view]
    public fun has_voted(voter: address): bool {
        exists<VoterRecord>(voter)
    }
}
