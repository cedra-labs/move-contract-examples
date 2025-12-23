module VotingBasic::Voting {
    use std::error;
    use std::signer;
    use std::string;
    use std::vector;
    use cedra_framework::object::{Self, Object};

    const E_PROPOSAL_NOT_FOUND: u64 = 1;
    const E_ALREADY_VOTED: u64 = 2;

    struct Proposal has store {
        id: u64,
        description: string::String,
        yes_votes: u64,
        no_votes: u64,
        voters: vector<address>,
    }

    struct VotingState has key {
        proposals: vector<Proposal>,
        next_id: u64,
    }

    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, b"VotingState");
        move_to(
            &object::generate_signer(constructor_ref),
            VotingState {
                proposals: vector::empty(),
                next_id: 0,
            }
        );
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        init_module(admin);
    }

    #[view]
    public fun get_voting_state(): Object<VotingState> {
        let state_address = object::create_object_address(&@VotingBasic, b"VotingState");
        object::address_to_object<VotingState>(state_address)
    }

    public entry fun create_proposal(
        _admin: &signer,
        description: string::String,
    ) acquires VotingState {
        let state = borrow_global_mut<VotingState>(object::object_address(&get_voting_state()));
        let proposal = Proposal {
            id: state.next_id,
            description,
            yes_votes: 0,
            no_votes: 0,
            voters: vector::empty(),
        };
        vector::push_back(&mut state.proposals, proposal);
        state.next_id = state.next_id + 1;
    }

    public entry fun vote(
        voter: &signer,
        proposal_id: u64,
        vote_yes: bool,
    ) acquires VotingState {
        let state = borrow_global_mut<VotingState>(object::object_address(&get_voting_state()));
        let voter_addr = signer::address_of(voter);
        assert!(proposal_id < vector::length(&state.proposals), error::not_found(E_PROPOSAL_NOT_FOUND));
        let proposal = vector::borrow_mut(&mut state.proposals, proposal_id);
        let len = vector::length(&proposal.voters);
        let i = 0;
        while (i < len) {
            assert!(*vector::borrow(&proposal.voters, i) != voter_addr, error::invalid_state(E_ALREADY_VOTED));
            i = i + 1;
        };
        vector::push_back(&mut proposal.voters, voter_addr);
        if (vote_yes) {
            proposal.yes_votes = proposal.yes_votes + 1;
        } else {
            proposal.no_votes = proposal.no_votes + 1;
        };
    }

    #[view]
    public fun check_results(proposal_id: u64): (u64, u64, string::String) acquires VotingState {
        let state = borrow_global<VotingState>(object::object_address(&get_voting_state()));
        assert!(proposal_id < vector::length(&state.proposals), error::not_found(E_PROPOSAL_NOT_FOUND));
        let proposal = vector::borrow(&state.proposals, proposal_id);
        (proposal.yes_votes, proposal.no_votes, proposal.description)
    }
}