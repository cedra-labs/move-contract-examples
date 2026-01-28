module voting::community_voting {
    use std::signer;
    use std::string::{Self, String};
    use cedra_framework::timestamp;
    use std::vector;

    const E_ALREADY_VOTED: u64 = 1;
    const E_VOTING_ENDED: u64 = 2;

    struct VotingPlatform has key { proposals: vector<Proposal> }

    struct Proposal has store, copy, drop {
        id: u64,
        description: String,
        creator: address,
        yes_votes: u64,
        no_votes: u64,
        voters: vector<address>,
        end_time: u64,
    }

    public entry fun initialize(account: &signer) {
        move_to(account, VotingPlatform { proposals: vector::empty() });
    }

    public entry fun create_proposal(
        creator: &signer,
        platform_addr: address,
        description: vector<u8>,
        duration_seconds: u64,
    ) acquires VotingPlatform {
        let platform = borrow_global_mut<VotingPlatform>(platform_addr);
        let proposal_id = vector::length(&platform.proposals);

        let proposal = Proposal {
            id: proposal_id,
            description: string::utf8(description),
            creator: signer::address_of(creator),
            yes_votes: 0,
            no_votes: 0,
            voters: vector::empty(),
            end_time: timestamp::now_seconds() + duration_seconds,
        };

        vector::push_back(&mut platform.proposals, proposal);
    }

    public entry fun vote_yes(voter: &signer, platform_addr: address, proposal_id: u64) acquires VotingPlatform {
        vote_internal(voter, platform_addr, proposal_id, true);
    }

    public entry fun vote_no(voter: &signer, platform_addr: address, proposal_id: u64) acquires VotingPlatform {
        vote_internal(voter, platform_addr, proposal_id, false);
    }

    fun vote_internal(
        voter: &signer,
        platform_addr: address,
        proposal_id: u64,
        is_yes: bool,
    ) acquires VotingPlatform {
        let platform = borrow_global_mut<VotingPlatform>(platform_addr);
        let proposal = vector::borrow_mut(&mut platform.proposals, proposal_id);

        let now = timestamp::now_seconds();
        assert!(now < proposal.end_time, E_VOTING_ENDED);

        let voter_addr = signer::address_of(voter);
        assert!(!vector::contains(&proposal.voters, &voter_addr), E_ALREADY_VOTED);

        if (is_yes) { proposal.yes_votes = proposal.yes_votes + 1; }
        else { proposal.no_votes = proposal.no_votes + 1; };

        vector::push_back(&mut proposal.voters, voter_addr);
    }

    #[view]
    public fun get_proposal(platform_addr: address, proposal_id: u64): (String, address, u64, u64, u64, u64) acquires VotingPlatform {
        let platform = borrow_global<VotingPlatform>(platform_addr);
        let proposal = vector::borrow(&platform.proposals, proposal_id);
        (proposal.description, proposal.creator, proposal.yes_votes, proposal.no_votes, proposal.end_time, vector::length(&proposal.voters))
    }

    #[view]
    public fun get_proposal_voters(platform_addr: address, proposal_id: u64): vector<address> acquires VotingPlatform {
        let platform = borrow_global<VotingPlatform>(platform_addr);
        let proposal = vector::borrow(&platform.proposals, proposal_id);
        proposal.voters
    }
}
