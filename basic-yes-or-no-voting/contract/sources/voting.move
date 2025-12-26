/// #Basic Voting Contract - Simple yes/no voting on proposals
module module_addr::voting {
    use std::signer;
    use std::error;
    use std::vector;
    use cedra_std::table::{Self, Table};

    // ========== Error Codes ==========
    /// Proposal with the given ID does not exist
    const E_PROPOSAL_NOT_FOUND: u64 = 1;
    /// Voter has already cast a vote on this proposal
    const E_ALREADY_VOTED: u64 = 2;
    /// Proposal description is empty
    const E_EMPTY_DESCRIPTION: u64 = 3;

    struct Proposal has store {
        id: u64,
        creator: address,
        description: vector<u8>,
        yes_votes: u64,
        no_votes: u64,
        voters: vector<address>,
    }

    struct VotingState has key {
        next_proposal_id: u64,
        proposals: Table<u64, Proposal>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, VotingState { 
            next_proposal_id: 1, 
            proposals: table::new() 
        });
    }

    /// Create a new proposal
    public entry fun create_proposal(creator: &signer, description: vector<u8>) acquires VotingState {
        assert!(vector::length(&description) > 0, error::invalid_argument(E_EMPTY_DESCRIPTION));
        let state = borrow_global_mut<VotingState>(@module_addr);
        let proposal_id = state.next_proposal_id;
        table::add(&mut state.proposals, proposal_id, Proposal {
            id: proposal_id,
            creator: signer::address_of(creator),
            description,
            yes_votes: 0,
            no_votes: 0,
            voters: vector::empty<address>(),
        });
        state.next_proposal_id = proposal_id + 1;
    }

    /// Vote yes on a proposal
    public entry fun vote_yes(voter: &signer, proposal_id: u64) acquires VotingState {
        let voter_addr = signer::address_of(voter);
        let state = borrow_global_mut<VotingState>(@module_addr);
        assert!(table::contains(&state.proposals, proposal_id), error::not_found(E_PROPOSAL_NOT_FOUND));
        let proposal = table::borrow_mut(&mut state.proposals, proposal_id);
        assert!(!has_voted(proposal, voter_addr), error::invalid_state(E_ALREADY_VOTED));
        vector::push_back(&mut proposal.voters, voter_addr);
        proposal.yes_votes = proposal.yes_votes + 1;
    }

    /// Vote no on a proposal
    public entry fun vote_no(voter: &signer, proposal_id: u64) acquires VotingState {
        let voter_addr = signer::address_of(voter);
        let state = borrow_global_mut<VotingState>(@module_addr);
        assert!(table::contains(&state.proposals, proposal_id), error::not_found(E_PROPOSAL_NOT_FOUND));
        let proposal = table::borrow_mut(&mut state.proposals, proposal_id);
        assert!(!has_voted(proposal, voter_addr), error::invalid_state(E_ALREADY_VOTED));
        vector::push_back(&mut proposal.voters, voter_addr);
        proposal.no_votes = proposal.no_votes + 1;
    }

    /// Check if a voter has already voted on a proposal
    inline fun has_voted(proposal: &Proposal, voter_addr: address): bool {
        let len = vector::length(&proposal.voters);
        let i = 0;
        let found = false;
        while (i < len) {
            if (*vector::borrow(&proposal.voters, i) == voter_addr) { found = true; break };
            i = i + 1;
        };
        found
    }

    #[view]
    /// Get the results of a proposal
    public fun get_results(proposal_id: u64): (u64, u64, bool) acquires VotingState {
        if (!exists<VotingState>(@module_addr)) return (0, 0, false);
        let state = borrow_global<VotingState>(@module_addr);
        if (!table::contains(&state.proposals, proposal_id)) return (0, 0, false);
        let proposal = table::borrow(&state.proposals, proposal_id);
        (proposal.yes_votes, proposal.no_votes, true)
    }

    #[view]
    /// Check if a proposal exists
    public fun proposal_exists(proposal_id: u64): bool acquires VotingState {
        if (!exists<VotingState>(@module_addr)) return false;
        table::contains(&borrow_global<VotingState>(@module_addr).proposals, proposal_id)
    }

    #[test_only]
    /// Initialize the voting system for testing
    public fun init_for_test(admin: &signer) {
        if (!exists<VotingState>(@module_addr)) {
            move_to(admin, VotingState { 
                next_proposal_id: 1, 
                proposals: table::new() 
            });
        };
    }
}
