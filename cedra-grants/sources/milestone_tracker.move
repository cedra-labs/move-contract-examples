/// CedraGrants Milestone Tracker Module
/// Tracks project milestones and enables community voting for fund release
module cedra_grants::milestone_tracker {
    use std::vector;
    use std::string::String;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_grants::registry;

    // ==================== Error Codes ====================
    const E_NOT_PROJECT_OWNER: u64 = 1;
    const E_MILESTONE_NOT_FOUND: u64 = 2;
    const E_ALREADY_VOTED: u64 = 3;
    const E_VOTING_ENDED: u64 = 4;
    const E_VOTING_NOT_ENDED: u64 = 5;
    const E_ALREADY_COMPLETED: u64 = 6;
    const E_NOT_ENOUGH_VOTES: u64 = 7;
    const E_VOTE_FAILED: u64 = 8;

    // ==================== Constants ====================
    const VOTING_PERIOD: u64 = 604800; // 7 days
    const MIN_APPROVAL_PERCENT: u64 = 60; // 60% approval needed
    const MIN_VOTERS: u64 = 3;

    // ==================== Structs ====================

    /// Milestone verification request
    struct MilestoneVerification has key, store {
        project_address: address,
        milestone_id: u64,
        evidence_url: String,
        evidence_description: String,
        submitted_at: u64,
        voting_ends: u64,
        votes_for: u64,
        votes_against: u64,
        voters: vector<address>,
        resolved: bool,
        approved: bool,
    }

    /// Track all verification requests
    struct VerificationRegistry has key {
        verifications: vector<address>,
        verification_count: u64,
        submission_events: event::EventHandle<MilestoneSubmissionEvent>,
        vote_events: event::EventHandle<MilestoneVoteEvent>,
        resolution_events: event::EventHandle<MilestoneResolutionEvent>,
    }

    // ==================== Events ====================

    struct MilestoneSubmissionEvent has drop, store {
        project_address: address,
        milestone_id: u64,
        evidence_url: String,
        timestamp: u64,
    }

    struct MilestoneVoteEvent has drop, store {
        project_address: address,
        milestone_id: u64,
        voter: address,
        approved: bool,
        timestamp: u64,
    }

    struct MilestoneResolutionEvent has drop, store {
        project_address: address,
        milestone_id: u64,
        approved: bool,
        votes_for: u64,
        votes_against: u64,
        timestamp: u64,
    }

    // ==================== Initialization ====================

    fun init_module(admin: &signer) {
        move_to(admin, VerificationRegistry {
            verifications: vector::empty(),
            verification_count: 0,
            submission_events: event::new_event_handle<MilestoneSubmissionEvent>(admin),
            vote_events: event::new_event_handle<MilestoneVoteEvent>(admin),
            resolution_events: event::new_event_handle<MilestoneResolutionEvent>(admin),
        });
    }

    // ==================== Public Functions ====================

    /// Submit milestone completion for community verification
    public entry fun submit_milestone(
        project_owner: &signer,
        project_address: address,
        milestone_id: u64,
        evidence_url: String,
        evidence_description: String,
    ) acquires VerificationRegistry {
        let owner_addr = signer::address_of(project_owner);
        
        // Verify ownership (would check registry in production)
        let (_, _, _, stored_owner, _, _, _) = registry::get_project(project_address);
        assert!(stored_owner == owner_addr, E_NOT_PROJECT_OWNER);

        let now = timestamp::now_seconds();
        let registry = borrow_global_mut<VerificationRegistry>(@cedra_grants);
        
        // Create verification request
        let verification_signer = project_owner; // In production, create object
        move_to(verification_signer, MilestoneVerification {
            project_address,
            milestone_id,
            evidence_url: copy evidence_url,
            evidence_description,
            submitted_at: now,
            voting_ends: now + VOTING_PERIOD,
            votes_for: 0,
            votes_against: 0,
            voters: vector::empty(),
            resolved: false,
            approved: false,
        });

        registry.verification_count = registry.verification_count + 1;

        // Emit event
        event::emit_event(&mut registry.submission_events, MilestoneSubmissionEvent {
            project_address,
            milestone_id,
            evidence_url,
            timestamp: now,
        });
    }

    /// Vote on a milestone verification
    public entry fun vote_milestone(
        voter: &signer,
        verification_address: address,
        approve: bool,
    ) acquires VerificationRegistry, MilestoneVerification {
        let voter_addr = signer::address_of(voter);
        let verification = borrow_global_mut<MilestoneVerification>(verification_address);
        
        let now = timestamp::now_seconds();
        assert!(now <= verification.voting_ends, E_VOTING_ENDED);
        assert!(!verification.resolved, E_ALREADY_COMPLETED);

        // Check not already voted
        let i = 0;
        while (i < vector::length(&verification.voters)) {
            assert!(*vector::borrow(&verification.voters, i) != voter_addr, E_ALREADY_VOTED);
            i = i + 1;
        };

        // Record vote
        vector::push_back(&mut verification.voters, voter_addr);
        if (approve) {
            verification.votes_for = verification.votes_for + 1;
        } else {
            verification.votes_against = verification.votes_against + 1;
        };

        // Emit event
        let registry = borrow_global_mut<VerificationRegistry>(@cedra_grants);
        event::emit_event(&mut registry.vote_events, MilestoneVoteEvent {
            project_address: verification.project_address,
            milestone_id: verification.milestone_id,
            voter: voter_addr,
            approved: approve,
            timestamp: now,
        });
    }

    /// Resolve milestone verification after voting ends
    public entry fun resolve_milestone(
        anyone: &signer,
        verification_address: address,
    ) acquires VerificationRegistry, MilestoneVerification {
        let verification = borrow_global_mut<MilestoneVerification>(verification_address);
        
        let now = timestamp::now_seconds();
        assert!(now > verification.voting_ends, E_VOTING_NOT_ENDED);
        assert!(!verification.resolved, E_ALREADY_COMPLETED);

        let total_votes = verification.votes_for + verification.votes_against;
        assert!(total_votes >= MIN_VOTERS, E_NOT_ENOUGH_VOTES);

        // Calculate approval percentage
        let approval_percent = (verification.votes_for * 100) / total_votes;
        let approved = approval_percent >= MIN_APPROVAL_PERCENT;

        verification.resolved = true;
        verification.approved = approved;

        // If approved, mark milestone complete in registry
        if (approved) {
            registry::complete_milestone(
                verification.project_address,
                verification.milestone_id,
            );
        };

        // Emit event
        let registry = borrow_global_mut<VerificationRegistry>(@cedra_grants);
        event::emit_event(&mut registry.resolution_events, MilestoneResolutionEvent {
            project_address: verification.project_address,
            milestone_id: verification.milestone_id,
            approved,
            votes_for: verification.votes_for,
            votes_against: verification.votes_against,
            timestamp: now,
        });
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_verification_count(): u64 acquires VerificationRegistry {
        borrow_global<VerificationRegistry>(@cedra_grants).verification_count
    }

    #[view]
    public fun get_verification_status(
        verification_address: address,
    ): (bool, bool, u64, u64) acquires MilestoneVerification {
        let v = borrow_global<MilestoneVerification>(verification_address);
        (v.resolved, v.approved, v.votes_for, v.votes_against)
    }

    #[view]
    public fun get_voting_deadline(
        verification_address: address,
    ): u64 acquires MilestoneVerification {
        borrow_global<MilestoneVerification>(verification_address).voting_ends
    }

    #[view]
    public fun has_voted(
        verification_address: address,
        voter: address,
    ): bool acquires MilestoneVerification {
        let v = borrow_global<MilestoneVerification>(verification_address);
        let i = 0;
        while (i < vector::length(&v.voters)) {
            if (*vector::borrow(&v.voters, i) == voter) {
                return true
            };
            i = i + 1;
        };
        false
    }
}
