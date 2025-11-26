// Proposal system - handles creating, voting on, and executing community governance proposals
module movedao_addrx::proposal {
    use std::signer;
    use std::vector;
    use std::string;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use movedao_addrx::admin;
    use movedao_addrx::membership;
    use movedao_addrx::staking;
    use movedao_addrx::errors;
    use movedao_addrx::safe_math;
    use movedao_addrx::activity_tracker;

    // Proposal Status Enum
    struct ProposalStatus has copy, drop, store {
        value: u8
    }

    // Status constructors
    public fun status_draft(): ProposalStatus { ProposalStatus { value: 0 } }
    public fun status_active(): ProposalStatus { ProposalStatus { value: 1 } }
    public fun status_passed(): ProposalStatus { ProposalStatus { value: 2 } }
    public fun status_rejected(): ProposalStatus { ProposalStatus { value: 3 } }
    public fun status_executed(): ProposalStatus { ProposalStatus { value: 4 } }
    public fun status_cancelled(): ProposalStatus { ProposalStatus { value: 5 } }

    // Status checkers
    public fun is_draft(status: &ProposalStatus): bool { status.value == 0 }
    public fun is_active(status: &ProposalStatus): bool { status.value == 1 }
    public fun is_passed(status: &ProposalStatus): bool { status.value == 2 }
    public fun is_rejected(status: &ProposalStatus): bool { status.value == 3 }
    public fun is_executed(status: &ProposalStatus): bool { status.value == 4 }
    public fun is_cancelled(status: &ProposalStatus): bool { status.value == 5 }

    // Get status value for events and external use
    public fun get_status_value(status: &ProposalStatus): u8 { status.value }

    // Vote Type Enum
    struct VoteType has copy, drop, store {
        value: u8
    }

    // Vote type constructors
    public fun vote_yes(): VoteType { VoteType { value: 1 } }
    public fun vote_no(): VoteType { VoteType { value: 2 } }
    public fun vote_abstain(): VoteType { VoteType { value: 3 } }

    // Vote type checkers
    public fun is_yes_vote(vote_type: &VoteType): bool { vote_type.value == 1 }
    public fun is_no_vote(vote_type: &VoteType): bool { vote_type.value == 2 }
    public fun is_abstain_vote(vote_type: &VoteType): bool { vote_type.value == 3 }

    // Get vote type value
    public fun get_vote_type_value(vote_type: &VoteType): u8 { vote_type.value }

    // Role constants for identification
    const ROLE_MEMBER: u8 = 1;
    const ROLE_ADMIN: u8 = 2;
    const ROLE_SUPER_ADMIN: u8 = 3;

    // Helper function to get user role at proposal creation/voting time
    fun get_user_role(movedao_addrx: address, user: address): u8 {
        if (admin::is_admin(movedao_addrx, user)) {
            let admin_role = admin::get_admin_role(movedao_addrx, user);
            if (admin_role == admin::role_super_admin()) {
                ROLE_SUPER_ADMIN
            } else {
                ROLE_ADMIN
            }
        } else if (membership::is_member(movedao_addrx, user)) {
            ROLE_MEMBER
        } else {
            0 // No role
        }
    }

    // Helper function to create member snapshot for proposal
    fun create_member_snapshot(movedao_addrx: address): vector<address> {
        let members = vector::empty<address>();
        let all_admins = admin::get_admins(movedao_addrx);
        let i = 0;
        
        // Add all admins first
        while (i < vector::length(&all_admins)) {
            let admin_addr = *vector::borrow(&all_admins, i);
            vector::push_back(&mut members, admin_addr);
            i = i + 1;
        };
        
        // Note: For a complete implementation, you'd need a way to get all members
        // This would require adding a get_all_members function to the membership module
        members
    }


    struct Proposal has store, copy, drop {
        id: u64,
        title: string::String,
        description: string::String,
        proposer: address,
        proposer_role: u8,               // Role of proposer when created (admin/member)
        status: ProposalStatus,
        votes: vector<Vote>,
        yes_votes: u64,
        no_votes: u64,
        abstain_votes: u64,
        created_at: u64,
        voting_start: u64,
        voting_end: u64,
        execution_window: u64,
        min_quorum_percent: u64,
        approved_by_admin: bool,         // Whether admin has approved activation
        finalized_by_admin: bool,        // Whether admin has finalized
        constant_member_list: vector<address>  // Snapshot of eligible voters
    }

    struct Vote has store, copy, drop {
        voter: address,
        voter_role: u8,                  // Role of voter when voted (admin/member)
        vote_type: VoteType,
        weight: u64,
        voted_at: u64
    }

    struct DaoProposals has key {
        proposals: vector<Proposal>,
        next_id: u64,
        proposal_fee: u64,        // Fee required to create proposals
    }
    
    struct ProposerRecord has key {
        last_proposal_time: u64,
        proposal_count: u64,
    }

    #[event]
    struct ProposalCreatedEvent has drop, store {
        proposal_id: u64,
        proposer: address,
        proposer_role: u8,
        title: string::String,
    }

    #[event]
    struct ProposalStatusChangedEvent has drop, store {
        proposal_id: u64,
        old_status: u8,
        new_status: u8,
        reason: string::String,
    }

    #[event]
    struct VoteCastEvent has drop, store {
        proposal_id: u64,
        voter: address,
        voter_role: u8,
        vote_type: u8,
        weight: u64,
    }

    #[event]
    struct ProposalActivatedEvent has drop, store {
        proposal_id: u64,
        activated_by: address,
        admin_role: u8,
    }

    #[event]
    struct ProposalFinalizedEvent has drop, store {
        proposal_id: u64,
        finalized_by: address,
        admin_role: u8,
        final_status: u8,
    }

    public fun initialize_proposals(
        account: &signer
    ) {
        let addr = signer::address_of(account);
        if (!exists<DaoProposals>(addr)) {
            let dao_proposals = DaoProposals {
                proposals: vector::empty(),
                next_id: 0,
                proposal_fee: 1000000,          // 0.001 APT in octas - minimal fee to prevent spam
            };

            move_to(account, dao_proposals);
        } else {
            // If already exists, abort
            abort errors::not_authorized()
        }
    }

    /// Create a new governance proposal for the DAO
    /// 
    /// MINIMUM STAKE REQUIREMENT FOR PROPOSAL CREATION:
    /// - Users must be DAO members AND meet proposal creation stake requirements
    /// - Two separate stake requirements:
    ///   1. min_stake_to_join: Required to become a DAO member
    ///   2. min_stake_to_propose: Required to create proposals (configurable by admin)
    /// - The membership::can_create_proposal() function enforces both requirements
    /// - Admins can configure proposal stake to be higher than membership stake
    /// 
    /// AUTHORIZATION CHECK:
    /// - Must be either: DAO admin OR member who meets proposal creation stake
    /// - DAO admins can always create proposals (regardless of stake)
    /// - DAO members must meet proposal creation stake requirement
    /// - Non-members cannot create proposals
    /// 
    /// AUTOMATIC FINALIZATION (ADMIN/MEMBER-TRIGGERED):
    /// - DAO admins OR members with proposal creation stake can call finalize_proposal()
    /// - Finalization logic automatically determines pass/fail based on votes and quorum
    /// - Neither admins nor members decide the outcome, they just trigger the automatic process
    /// - This ensures proper oversight while maintaining democratic voting results
    /// 
    /// PROCESS:
    /// 1. Check if user is admin OR can create proposals (includes membership + proposal stake validation)
    /// 2. If admin -> Allow proposal creation
    /// 3. If member with sufficient proposal stake -> Allow proposal creation
    /// 4. If neither -> Reject with "not_authorized" error
    /// 5. Proposal created in "draft" status
    /// 6. Admin must activate proposal using activate_proposal()
    /// 7. After voting period ends, admin OR qualified member calls finalize_proposal() to automatically determine outcome
    /// 
    /// EXAMPLE:
    /// - min_stake_to_join: 10 MOVE tokens (to become member)
    /// - min_stake_to_propose: 50 MOVE tokens (to create proposals)
    /// - User stakes 15 MOVE -> Becomes member -> Cannot create proposals (needs 50)
    /// - User stakes 60 MOVE -> Becomes member -> Can create proposals
    /// - Admin user -> Can create proposals (regardless of stake)
    public entry fun create_proposal(
        account: &signer,
        movedao_addrx: address,
        title: string::String,
        description: string::String,
        voting_start_timestamp: u64,
        voting_end_timestamp: u64,
        execution_window_secs: u64,
        min_quorum_percent: u64
    ) acquires DaoProposals, ProposerRecord {
        let sender = signer::address_of(account);
        // MINIMUM STAKE ENFORCEMENT: Check if user is admin OR can create proposals
        // For non-admins, this checks both membership AND proposal creation stake requirements
        let is_admin = admin::is_admin(movedao_addrx, sender);
        if (!is_admin) {
            assert!(membership::can_create_proposal(movedao_addrx, sender), errors::not_authorized());
        };
        
        // Get proposer role for identification
        let proposer_role = get_user_role(movedao_addrx, sender);
        assert!(proposer_role > 0, errors::not_authorized());

        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let now = timestamp::now_seconds();
        
        // PROPOSAL FEE: Charge fee to prevent spam
        coin::transfer<CedraCoin>(account, movedao_addrx, proposals.proposal_fee);
        
        // RATE LIMITING: Enforce cooldown period between proposals
        if (exists<ProposerRecord>(sender)) {
            let proposer_record = borrow_global_mut<ProposerRecord>(sender);
            let cooldown_period = 60; // 1 minute in seconds
            assert!(now >= proposer_record.last_proposal_time + cooldown_period, errors::rate_limit_exceeded());
            proposer_record.last_proposal_time = now;
            proposer_record.proposal_count = safe_math::safe_add(proposer_record.proposal_count, 1);
        } else {
            let proposer_record = ProposerRecord {
                last_proposal_time: now,
                proposal_count: 1,
            };
            move_to(account, proposer_record);
        };
        
        // VALIDATION: Validate quorum and threshold parameters
        assert!(min_quorum_percent > 0 && min_quorum_percent <= 100, errors::invalid_amount());

        let proposal_id = proposals.next_id;

        // Validate timestamp inputs
        assert!(voting_start_timestamp >= now, errors::invalid_amount());
        assert!(voting_end_timestamp > voting_start_timestamp, errors::invalid_amount());

        // Create member snapshot for consistent voting eligibility
        let member_snapshot = create_member_snapshot(movedao_addrx);
        
        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            proposer: sender,
            proposer_role,
            status: status_draft(),
            votes: vector::empty(),
            yes_votes: 0,
            no_votes: 0,
            abstain_votes: 0,
            created_at: now,
            voting_start: voting_start_timestamp,
            voting_end: voting_end_timestamp,
            execution_window: execution_window_secs,
            min_quorum_percent,
            approved_by_admin: false,
            finalized_by_admin: false,
            constant_member_list: member_snapshot
        };

        vector::push_back(&mut proposals.proposals, proposal);
        proposals.next_id = proposal_id + 1;
        
        // Log proposal created activity
        activity_tracker::emit_proposal_created(
            movedao_addrx,            // dao_address
            sender,                  // proposer
            title,                   // proposal_title
            vector::empty<u8>(),     // transaction_hash
            0                        // block_number
        );
        
        event::emit(ProposalCreatedEvent {
            proposal_id,
            proposer: sender,
            proposer_role,
            title: copy title,
        });
    }

    // Admin activation function - more formal proposal activation
    public entry fun activate_proposal(
        account: &signer,
        movedao_addrx: address,
        proposal_id: u64
    ) acquires DaoProposals {
        let sender = signer::address_of(account);
        // Only admins can activate proposals
        assert!(admin::is_admin(movedao_addrx, sender), errors::not_admin());
        
        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let proposal = find_proposal_mut(&mut proposals.proposals, proposal_id);
        
        assert!(is_draft(&proposal.status), errors::invalid_status());
        
        // Mark as approved by admin
        proposal.approved_by_admin = true;
        proposal.status = status_active();
        
        let admin_role = get_user_role(movedao_addrx, sender);
        
        event::emit(ProposalActivatedEvent {
            proposal_id,
            activated_by: sender,
            admin_role,
        });
        
        event::emit(ProposalStatusChangedEvent {
            proposal_id,
            old_status: get_status_value(&status_draft()),
            new_status: get_status_value(&status_active()),
            reason: string::utf8(b"admin_activated")
        });
    }

    public entry fun start_voting(
        account: &signer,
        movedao_addrx: address,
        proposal_id: u64
    ) acquires DaoProposals {
        let sender = signer::address_of(account);
        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let proposal = find_proposal_mut(&mut proposals.proposals, proposal_id);

        assert!(is_draft(&proposal.status), errors::invalid_status());
        assert!(
            proposal.proposer == sender || admin::is_admin(movedao_addrx, sender), 
            errors::not_admin_or_proposer()
        );

        proposal.status = status_active();
        event::emit(ProposalStatusChangedEvent {
            proposal_id,
            old_status: get_status_value(&status_draft()),
            new_status: get_status_value(&status_active()),
            reason: string::utf8(b"voting_started")
        });
    }

    public entry fun cast_vote(
        account: &signer,
        movedao_addrx: address,
        proposal_id: u64,
        vote_type: u8
    ) acquires DaoProposals {
        assert!(vote_type == 1 || vote_type == 2 || vote_type == 3, errors::invalid_vote_type());
        
        let sender = signer::address_of(account);
        
        // SIMPLIFIED: Just check if user is a member (includes both members and admins)
        assert!(membership::is_member(movedao_addrx, sender), errors::not_member());
        
        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let proposal = find_proposal_mut(&mut proposals.proposals, proposal_id);

        assert!(is_active(&proposal.status), errors::invalid_status());
        let now = timestamp::now_seconds();
        assert!(now >= proposal.voting_start, errors::voting_not_started());
        assert!(now <= proposal.voting_end, errors::voting_ended());

        let i = 0;
        let len = vector::length(&proposal.votes);
        while (i < len) {
            let vote = vector::borrow(&proposal.votes, i);
            if (vote.voter == sender) abort errors::already_voted();
            i = i + 1;
        };

        // Get voting power from membership module (which already checks staking)
        let weight = membership::get_voting_power(movedao_addrx, sender);
        assert!(weight > 0, errors::not_member());
        
        // Get voter role for tracking (but don't fail if role can't be determined)
        let voter_role = get_user_role(movedao_addrx, sender);
        let final_voter_role = if (voter_role == 0) {
            ROLE_MEMBER // Default to member if role detection fails
        } else {
            voter_role
        };
        
        let vote_enum = if (vote_type == 1) {
            vote_yes()
        } else if (vote_type == 2) {
            vote_no()
        } else {
            vote_abstain()
        };
        
        vector::push_back(&mut proposal.votes, Vote { 
            voter: sender,
            voter_role: final_voter_role,
            vote_type: vote_enum, 
            weight,
            voted_at: now
        });

        // Safe vote counting using safe_math to prevent overflow attacks
        if (vote_type == 1) {
            proposal.yes_votes = safe_math::safe_add(proposal.yes_votes, weight);
        } else if (vote_type == 2) {
            proposal.no_votes = safe_math::safe_add(proposal.no_votes, weight);
        } else {
            proposal.abstain_votes = safe_math::safe_add(proposal.abstain_votes, weight);
        };

        // Log proposal voted activity
        activity_tracker::emit_proposal_voted(
            movedao_addrx,            // dao_address
            sender,                  // voter
            proposal.title,          // proposal_title
            vector::empty<u8>(),     // transaction_hash
            0                        // block_number
        );

        event::emit(VoteCastEvent {
            proposal_id,
            voter: sender,
            voter_role: final_voter_role,
            vote_type,
            weight,
        });
    }

    // AUTOMATIC FINALIZATION - Admins OR members with proposal creation stake can call
    public entry fun finalize_proposal(
        account: &signer,
        movedao_addrx: address,
        proposal_id: u64
    ) acquires DaoProposals {
        let sender = signer::address_of(account);
        // AUTHORIZATION: Admin OR member who can create proposals
        let is_admin = admin::is_admin(movedao_addrx, sender);
        let can_create_proposals = membership::can_create_proposal(movedao_addrx, sender);
        assert!(is_admin || can_create_proposals, errors::not_authorized());
        
        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let proposal = find_proposal_mut(&mut proposals.proposals, proposal_id);

        assert!(is_active(&proposal.status), errors::invalid_status());
        let now = timestamp::now_seconds();
        assert!(now >= proposal.voting_end, errors::voting_ended());

        let total_staked = staking::get_total_staked(movedao_addrx);
        let total_votes = proposal.yes_votes + proposal.no_votes + proposal.abstain_votes;
        
        // Ensure votes cannot exceed total staked amount (critical security check)
        assert!(total_votes <= total_staked, errors::invalid_amount());
        
        let quorum = if (total_staked > 0) {
            (total_votes * 100) / total_staked
        } else {
            0
        };
        
        // AUTOMATIC LOGIC: Determine outcome based on votes and quorum
        if (quorum < proposal.min_quorum_percent) {
            let old_status = get_status_value(&proposal.status);
            proposal.status = status_rejected();
            proposal.finalized_by_admin = true;
            
            event::emit(ProposalStatusChangedEvent {
                proposal_id,
                old_status,
                new_status: get_status_value(&status_rejected()),
                reason: string::utf8(b"automatic_quorum_not_met")
            });
            return
        };

        // AUTOMATIC LOGIC: Check vote majority
        let new_status_enum = if (proposal.yes_votes > proposal.no_votes) status_passed() else status_rejected();
        let old_status = get_status_value(&proposal.status);
        let new_status = get_status_value(&new_status_enum);
        proposal.status = new_status_enum;
        proposal.finalized_by_admin = true;
        
        event::emit(ProposalStatusChangedEvent {
            proposal_id,
            old_status,
            new_status,
            reason: string::utf8(b"automatic_vote_majority")
        });
    }

    // NOTE: Proposal finalization is AUTOMATIC but REQUIRES STAKE
    // Admins OR members with proposal creation stake can call finalize_proposal()
    // The outcome is determined automatically by votes and quorum
    // This ensures proper oversight while maintaining democratic voting integrity

    public entry fun execute_proposal(
        account: &signer,
        movedao_addrx: address,
        proposal_id: u64
    ) acquires DaoProposals {
        let sender = signer::address_of(account);
        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let proposal = find_proposal_mut(&mut proposals.proposals, proposal_id);

        assert!(is_passed(&proposal.status), errors::invalid_status());
        assert!(
            admin::is_admin(movedao_addrx, sender) || proposal.proposer == sender, 
            errors::not_admin_or_proposer()
        );
        
        let now = timestamp::now_seconds();
        assert!(now <= proposal.voting_end + proposal.execution_window, errors::execution_window_expired());

        let old_status = get_status_value(&proposal.status);
        proposal.status = status_executed();
        
        event::emit(ProposalStatusChangedEvent {
            proposal_id,
            old_status,
            new_status: get_status_value(&status_executed()),
            reason: string::utf8(b"executed")
        });
    }

    public entry fun cancel_proposal(
        account: &signer,
        movedao_addrx: address,
        proposal_id: u64
    ) acquires DaoProposals {
        let sender = signer::address_of(account);
        let proposals = borrow_global_mut<DaoProposals>(movedao_addrx);
        let proposal = find_proposal_mut(&mut proposals.proposals, proposal_id);

        assert!(
            is_draft(&proposal.status) || is_active(&proposal.status),
            errors::cannot_cancel()
        );
        assert!(
            admin::is_admin(movedao_addrx, sender) || proposal.proposer == sender,
            errors::not_admin_or_proposer()
        );

        let old_status = get_status_value(&proposal.status);
        proposal.status = status_cancelled();
        
        event::emit(ProposalStatusChangedEvent {
            proposal_id,
            old_status,
            new_status: get_status_value(&status_cancelled()),
            reason: string::utf8(b"cancelled")
        });
    }

    #[view]
    public fun get_proposal_status(movedao_addrx: address, proposal_id: u64): u8 acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        get_status_value(&proposal.status)
    }

    #[view]
    public fun get_proposal(movedao_addrx: address, proposal_id: u64): Proposal acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        *proposal
    }

    #[view]
    public fun get_proposals_count(movedao_addrx: address): u64 acquires DaoProposals {
        if (!exists<DaoProposals>(movedao_addrx)) {
            return 0
        };
        vector::length(&borrow_global<DaoProposals>(movedao_addrx).proposals)
    }

    // Get all proposals for a DAO
    #[view]
    public fun get_all_proposals(movedao_addrx: address): vector<Proposal> acquires DaoProposals {
        if (!exists<DaoProposals>(movedao_addrx)) {
            return vector::empty<Proposal>()
        };
        let dao_proposals = borrow_global<DaoProposals>(movedao_addrx);
        dao_proposals.proposals
    }

    // Check if DAO has proposals resource
    #[view]
    public fun has_proposals(movedao_addrx: address): bool {
        exists<DaoProposals>(movedao_addrx)
    }

    // Get proposal vote count
    #[view] 
    public fun get_proposal_vote_count(movedao_addrx: address, proposal_id: u64): u64 acquires DaoProposals {
        if (!exists<DaoProposals>(movedao_addrx)) return 0;
        let dao_proposals = borrow_global<DaoProposals>(movedao_addrx);
        if (proposal_id >= vector::length(&dao_proposals.proposals)) return 0;
        let proposal = vector::borrow(&dao_proposals.proposals, proposal_id);
        vector::length(&proposal.votes)
    }

    // Get proposal details for statistics
    #[view]
    public fun get_proposal_details(movedao_addrx: address, proposal_id: u64): (u64, string::String, string::String, address, u8, u64, u64, u64, u64, u64, u64, u64, bool, bool, u64, u64) acquires DaoProposals {
        if (!exists<DaoProposals>(movedao_addrx)) {
            return (0, string::utf8(b""), string::utf8(b""), @0x0, 0, 0, 0, 0, 0, 0, 0, 0, false, false, 0, 0)
        };
        let dao_proposals = borrow_global<DaoProposals>(movedao_addrx);
        if (proposal_id >= vector::length(&dao_proposals.proposals)) {
            return (0, string::utf8(b""), string::utf8(b""), @0x0, 0, 0, 0, 0, 0, 0, 0, 0, false, false, 0, 0)
        };
        let proposal = vector::borrow(&dao_proposals.proposals, proposal_id);
        (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.status.value,
            proposal.yes_votes,
            proposal.no_votes,
            proposal.abstain_votes,
            proposal.created_at,
            proposal.voting_start,
            proposal.voting_end,
            proposal.execution_window,
            proposal.approved_by_admin,
            proposal.finalized_by_admin,
            vector::length(&proposal.votes),
            vector::length(&proposal.constant_member_list)
        )
    }

    fun find_proposal(proposals: &vector<Proposal>, proposal_id: u64): &Proposal {
        let i = 0;
        while (i < vector::length(proposals)) {
            let proposal = vector::borrow(proposals, i);
            if (proposal.id == proposal_id) return proposal;
            i = i + 1;
        };
        abort errors::no_such_proposal()
    }

    fun find_proposal_mut(proposals: &mut vector<Proposal>, proposal_id: u64): &mut Proposal {
        let i = 0;
        while (i < vector::length(proposals)) {
            let proposal = vector::borrow_mut(proposals, i);
            if (proposal.id == proposal_id) return proposal;
            i = i + 1;
        };
        abort errors::no_such_proposal()
    }

    #[view] public fun get_status_draft(): u8 { get_status_value(&status_draft()) }
    #[view] public fun get_status_active(): u8 { get_status_value(&status_active()) }
    #[view] public fun get_status_passed(): u8 { get_status_value(&status_passed()) }
    #[view] public fun get_status_rejected(): u8 { get_status_value(&status_rejected()) }
    #[view] public fun get_status_executed(): u8 { get_status_value(&status_executed()) }
    #[view] public fun get_status_cancelled(): u8 { get_status_value(&status_cancelled()) }
    
    #[view] public fun get_vote_yes(): u8 { get_vote_type_value(&vote_yes()) }
    #[view] public fun get_vote_no(): u8 { get_vote_type_value(&vote_no()) }
    #[view] public fun get_vote_abstain(): u8 { get_vote_type_value(&vote_abstain()) }

    // New view functions for enhanced proposal features
    #[view]
    public fun is_proposal_approved_by_admin(movedao_addrx: address, proposal_id: u64): bool acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        proposal.approved_by_admin
    }

    #[view]
    public fun is_proposal_finalized_by_admin(movedao_addrx: address, proposal_id: u64): bool acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        proposal.finalized_by_admin
    }

    #[view]
    public fun get_proposal_roles(movedao_addrx: address, proposal_id: u64): (u8, vector<u8>) acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        let voter_roles = vector::empty<u8>();
        let i = 0;
        while (i < vector::length(&proposal.votes)) {
            let vote = vector::borrow(&proposal.votes, i);
            vector::push_back(&mut voter_roles, vote.voter_role);
            i = i + 1;
        };
        (proposal.proposer_role, voter_roles)
    }

    #[view] 
    public fun get_role_member(): u8 { ROLE_MEMBER }
    #[view] 
    public fun get_role_admin(): u8 { ROLE_ADMIN }
    #[view] 
    public fun get_role_super_admin(): u8 { ROLE_SUPER_ADMIN }

    // Additional view functions for frontend integration
    #[view]
    public fun has_user_voted_on_proposal(movedao_addrx: address, proposal_id: u64, user: address): bool acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        let i = 0;
        while (i < vector::length(&proposal.votes)) {
            let vote = vector::borrow(&proposal.votes, i);
            if (vote.voter == user) {
                return true
            };
            i = i + 1;
        };
        false
    }

    #[view]
    public fun get_user_vote_on_proposal(movedao_addrx: address, proposal_id: u64, user: address): (bool, u8, u64) acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        let i = 0;
        while (i < vector::length(&proposal.votes)) {
            let vote = vector::borrow(&proposal.votes, i);
            if (vote.voter == user) {
                return (true, get_vote_type_value(&vote.vote_type), vote.weight)
            };
            i = i + 1;
        };
        (false, 0, 0)
    }

    #[view]
    public fun get_user_status_in_dao(movedao_addrx: address, user: address): u8 {
        get_user_role(movedao_addrx, user)
    }

    #[view]
    public fun get_proposal_votes_count(movedao_addrx: address, proposal_id: u64): (u64, u64, u64) acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        (proposal.yes_votes, proposal.no_votes, proposal.abstain_votes)
    }

    #[view]
    public fun get_proposal_detailed_info(movedao_addrx: address, proposal_id: u64): (string::String, string::String, address, u8, u64, u64, u64, u64, u64) acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        (
            proposal.title,
            proposal.description,
            proposal.proposer,
            get_status_value(&proposal.status),
            proposal.created_at,
            proposal.voting_start,
            proposal.voting_end,
            proposal.yes_votes + proposal.no_votes + proposal.abstain_votes,
            proposal.min_quorum_percent
        )
    }

    // Diagnostic function to check voting eligibility
    #[view]
    public fun check_voting_eligibility(movedao_addrx: address, user: address): (bool, u64, bool, u8) {
        let is_member = membership::is_member(movedao_addrx, user);
        let voting_power = membership::get_voting_power(movedao_addrx, user);
        let has_stake = voting_power > 0;
        let user_role = get_user_role(movedao_addrx, user);
        (is_member, voting_power, has_stake, user_role)
    }

    // Get user status string for display
    #[view]
    public fun get_user_status_string(movedao_addrx: address, user: address): string::String {
        // Try admin check first
        let is_admin_result = admin::is_admin(movedao_addrx, user);
        if (is_admin_result) {
            return string::utf8(b"Admin")
        };

        // Try member check
        let is_member_result = membership::is_member(movedao_addrx, user);
        if (is_member_result) {
            return string::utf8(b"Member")
        };

        // Default case
        string::utf8(b"Not a member")
    }

    // Alternative status function with more detailed admin check
    #[view] 
    public fun get_user_status_detailed(movedao_addrx: address, user: address): string::String {
        // Check admin status first (most privileged)
        if (admin::is_admin(movedao_addrx, user)) {
            // Try to get admin role safely
            let admin_role = admin::get_admin_role(movedao_addrx, user);
            if (admin_role == admin::role_super_admin()) {
                return string::utf8(b"Super Admin")
            } else {
                return string::utf8(b"Admin")
            }
        };
        
        // Check member status
        if (membership::is_member(movedao_addrx, user)) {
            return string::utf8(b"Member")
        };

        // Default case
        string::utf8(b"Not a member")
    }

    // Get detailed user permissions
    #[view]
    public fun get_user_permissions(movedao_addrx: address, user: address): (bool, bool, bool, bool, bool) {
        let is_admin = admin::is_admin(movedao_addrx, user);
        let is_member = membership::is_member(movedao_addrx, user);
        let can_create_proposals = membership::can_create_proposal(movedao_addrx, user);
        let can_vote = is_member || is_admin;
        let can_finalize = is_admin || can_create_proposals;

        (is_admin, is_member, can_create_proposals, can_vote, can_finalize)
    }

    // Check if user can finalize proposals
    #[view]
    public fun can_user_finalize_proposals(movedao_addrx: address, user: address): bool {
        let is_admin = admin::is_admin(movedao_addrx, user);
        let can_create_proposals = membership::can_create_proposal(movedao_addrx, user);
        is_admin || can_create_proposals
    }

    // Debug function to see all status checks
    #[view]
    public fun debug_user_status(movedao_addrx: address, user: address): (bool, bool, u8, u64) {
        let is_admin = admin::is_admin(movedao_addrx, user);
        let is_member = membership::is_member(movedao_addrx, user);
        let admin_role = if (is_admin) admin::get_admin_role(movedao_addrx, user) else 0;
        let voting_power = membership::get_voting_power(movedao_addrx, user);

        (is_admin, is_member, admin_role, voting_power)
    }

    // Direct admin check - simple and reliable
    #[view]
    public fun is_user_admin(movedao_addrx: address, user: address): bool {
        admin::is_admin(movedao_addrx, user)
    }

    // Direct member check - simple and reliable
    #[view] 
    public fun is_user_member(movedao_addrx: address, user: address): bool {
        membership::is_member(movedao_addrx, user)
    }

    // Check if user can create proposals - for frontend button logic
    #[view]
    public fun can_user_create_proposals(movedao_addrx: address, user: address): bool {
        let is_admin = admin::is_admin(movedao_addrx, user);
        let can_propose = membership::can_create_proposal(movedao_addrx, user);
        is_admin || can_propose
    }

    // Get simple status for frontend - returns number for easy checking
    #[view]
    public fun get_user_status_code(movedao_addrx: address, user: address): u8 {
        if (admin::is_admin(movedao_addrx, user)) {
            2 // Admin
        } else if (membership::is_member(movedao_addrx, user)) {
            1 // Member
        } else {
            0 // Not a member
        }
    }

    // Get list of all voters who voted on a proposal
    #[view]
    public fun get_proposal_voters(movedao_addrx: address, proposal_id: u64): vector<address> acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        let voters = vector::empty<address>();
        let i = 0;
        while (i < vector::length(&proposal.votes)) {
            let vote = vector::borrow(&proposal.votes, i);
            vector::push_back(&mut voters, vote.voter);
            i = i + 1;
        };
        voters
    }

    // Get detailed vote information for all voters on a proposal
    #[view]
    public fun get_proposal_votes_detailed(movedao_addrx: address, proposal_id: u64): (vector<address>, vector<u8>, vector<u64>, vector<u64>) acquires DaoProposals {
        let proposals = &borrow_global<DaoProposals>(movedao_addrx).proposals;
        let proposal = find_proposal(proposals, proposal_id);
        let voters = vector::empty<address>();
        let vote_types = vector::empty<u8>();
        let weights = vector::empty<u64>();
        let timestamps = vector::empty<u64>();
        let i = 0;
        while (i < vector::length(&proposal.votes)) {
            let vote = vector::borrow(&proposal.votes, i);
            vector::push_back(&mut voters, vote.voter);
            vector::push_back(&mut vote_types, get_vote_type_value(&vote.vote_type));
            vector::push_back(&mut weights, vote.weight);
            vector::push_back(&mut timestamps, vote.voted_at);
            i = i + 1;
        };
        (voters, vote_types, weights, timestamps)
    }
}