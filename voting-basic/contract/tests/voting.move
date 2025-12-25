#[test_only]
module voting::poll_tests {
    use cedra_framework::timestamp;
    use cedra_framework::account;
    use std::signer;
    use std::vector;
    use std::string;
    use voting::poll::{
        Self,
        create_poll,
        vote,
        close_poll,
        finalize_poll,
        delete_poll,
        get_poll_info,
        get_poll_ids,
        has_user_voted,
        get_vote_counts,
        is_poll_active,
        get_poll_result,
        poll_exists,
        get_total_polls,
    };

    // ==================== Test Constants ====================
    
    const CURRENT_TIME: u64 = 1000000;
    const FUTURE_DEADLINE: u64 = 2000000;
    const PAST_DEADLINE: u64 = 500000;

    // ==================== Helper Functions ====================

    #[test_only]
    fun setup_test(
        creator: &signer,
        framework: &signer,
    ): address {
        let creator_addr = signer::address_of(creator);
        account::create_account_for_test(creator_addr);
        
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test(CURRENT_TIME);
        
        creator_addr
    }

    #[test_only]
    fun create_test_poll(creator: &signer, question: vector<u8>, deadline: u64) {
        create_poll(creator, question, deadline);
    }

    // ==================== Creation Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    /// Test successful poll creation
    public fun test_create_poll_success(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let question = b"Should we implement feature X?";
        
        create_test_poll(creator, question, FUTURE_DEADLINE);
        
        assert!(poll_exists(creator_addr, 0), 0);
        assert!(get_total_polls(creator_addr) == 1, 1);
        
        let (id, creator_ret, q, yes, no, dl, status, voters, created) = get_poll_info(creator_addr, 0);
        assert!(id == 0, 2);
        assert!(creator_ret == creator_addr, 3);
        assert!(q == question, 4);
        assert!(yes == 0, 5);
        assert!(no == 0, 6);
        assert!(dl == FUTURE_DEADLINE, 7);
        assert!(status == 0, 8); // STATUS_ACTIVE
        assert!(voters == 0, 9);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test creating multiple polls
    public fun test_create_multiple_polls(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_test_poll(creator, b"Question 1?", FUTURE_DEADLINE);
        create_test_poll(creator, b"Question 2?", FUTURE_DEADLINE + 1000);
        create_test_poll(creator, b"Question 3?", FUTURE_DEADLINE + 2000);
        
        assert!(get_total_polls(creator_addr) == 3, 0);
        
        let ids = get_poll_ids(creator_addr);
        assert!(vector::length(&ids) == 3, 1);
        assert!(*vector::borrow(&ids, 0) == 0, 2);
        assert!(*vector::borrow(&ids, 1) == 1, 3);
        assert!(*vector::borrow(&ids, 2) == 2, 4);
    }

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x10007, location = voting::poll)]
    /// Test creating poll with empty question
    public fun test_create_poll_empty_question(
        creator: &signer,
        framework: &signer,
    ) {
        setup_test(creator, framework);
        create_test_poll(creator, b"", FUTURE_DEADLINE); // Should fail
    }

    // ==================== Voting Tests ====================

    #[test(creator = @0x100, voter = @0x200, framework = @0x1)]
    /// Test successful yes vote
    public fun test_vote_yes_success(
        creator: &signer,
        voter: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let voter_addr = signer::address_of(voter);
        account::create_account_for_test(voter_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        vote(voter, creator_addr, 0, true);
        
        assert!(has_user_voted(creator_addr, 0, voter_addr), 0);
        
        let (yes, no, total) = get_vote_counts(creator_addr, 0);
        assert!(yes == 1, 1);
        assert!(no == 0, 2);
        assert!(total == 1, 3);
    }

    #[test(creator = @0x100, voter = @0x200, framework = @0x1)]
    /// Test successful no vote
    public fun test_vote_no_success(
        creator: &signer,
        voter: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let voter_addr = signer::address_of(voter);
        account::create_account_for_test(voter_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        vote(voter, creator_addr, 0, false);
        
        let (yes, no, total) = get_vote_counts(creator_addr, 0);
        assert!(yes == 0, 0);
        assert!(no == 1, 1);
        assert!(total == 1, 2);
    }

    #[test(creator = @0x100, v1 = @0x201, v2 = @0x202, v3 = @0x203, framework = @0x1)]
    /// Test multiple voters
    public fun test_multiple_voters(
        creator: &signer,
        v1: &signer,
        v2: &signer,
        v3: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        let v1_addr = signer::address_of(v1);
        let v2_addr = signer::address_of(v2);
        let v3_addr = signer::address_of(v3);
        
        account::create_account_for_test(v1_addr);
        account::create_account_for_test(v2_addr);
        account::create_account_for_test(v3_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        vote(v1, creator_addr, 0, true);   // Yes
        vote(v2, creator_addr, 0, true);   // Yes
        vote(v3, creator_addr, 0, false);  // No
        
        let (yes, no, total) = get_vote_counts(creator_addr, 0);
        assert!(yes == 2, 0);
        assert!(no == 1, 1);
        assert!(total == 3, 2);
        
        let (yes_winning, yes_count, no_count) = get_poll_result(creator_addr, 0);
        assert!(yes_winning, 3);
        assert!(yes_count == 2, 4);
        assert!(no_count == 1, 5);
    }

    #[test(creator = @0x100, voter = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 196612 , location = voting::poll)]
    /// Test voting twice on same poll
    public fun test_vote_twice_fails(
        creator: &signer,
        voter: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let voter_addr = signer::address_of(voter);
        account::create_account_for_test(voter_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        vote(voter, creator_addr, 0, true);
        vote(voter, creator_addr, 0, false); // Should fail - already voted
    }

    #[test(creator = @0x100, voter = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 196611 , location = voting::poll)]
    /// Test voting on closed poll
    public fun test_vote_closed_poll_fails(
        creator: &signer,
        voter: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let voter_addr = signer::address_of(voter);
        account::create_account_for_test(voter_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        close_poll(creator, 0);
        
        vote(voter, creator_addr, 0, true); // Should fail - poll closed
    }

    // ==================== Poll Management Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    /// Test closing poll by creator
    public fun test_close_poll_success(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        assert!(is_poll_active(creator_addr, 0), 0);
        
        close_poll(creator, 0);
        
        assert!(!is_poll_active(creator_addr, 0), 1);
        
        let (_, _, _, _, _, _, status, _, _) = get_poll_info(creator_addr, 0);
        assert!(status == 1, 2); // STATUS_CLOSED
    }

    #[test(creator = @0x100, other = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x60001, location = voting::poll)]
    /// Test unauthorized close poll
    public fun test_close_poll_unauthorized(
        creator: &signer,
        other: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let other_addr = signer::address_of(other);
        account::create_account_for_test(other_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        close_poll(other, 0); // Should fail - not creator
    }

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 196616 , location = voting::poll)]
    /// Test finalize non-expired poll fails
    public fun test_finalize_active_poll_fails(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        finalize_poll(creator_addr, 0); // Should fail - not expired yet
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test delete poll with no votes
    public fun test_delete_poll_success(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        assert!(poll_exists(creator_addr, 0), 0);
        
        delete_poll(creator, 0);
        
        assert!(!poll_exists(creator_addr, 0), 1);
        assert!(get_total_polls(creator_addr) == 0, 2);
    }

    #[test(creator = @0x100, voter = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 196611, location = voting::poll)]
    /// Test delete poll with votes fails
    public fun test_delete_poll_with_votes_fails(
        creator: &signer,
        voter: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let voter_addr = signer::address_of(voter);
        account::create_account_for_test(voter_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        vote(voter, creator_addr, 0, true);
        
        delete_poll(creator, 0); // Should fail - has votes
    }

    // ==================== View Function Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    /// Test poll_exists for non-existent poll
    public fun test_poll_not_exists(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        assert!(!poll_exists(creator_addr, 0), 0);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test get_poll_ids for account with no polls
    public fun test_get_poll_ids_empty(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let ids = get_poll_ids(creator_addr);
        assert!(vector::is_empty(&ids), 0);
    }

    #[test(creator = @0x100, voter = @0x200, framework = @0x1)]
    /// Test has_user_voted for non-voter
    public fun test_has_not_voted(
        creator: &signer,
        voter: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let voter_addr = signer::address_of(voter);
        account::create_account_for_test(voter_addr);
        
        create_test_poll(creator, b"Test question?", FUTURE_DEADLINE);
        
        assert!(!has_user_voted(creator_addr, 0, voter_addr), 0);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test get_total_polls returns zero for new account
    public fun test_get_total_polls_zero(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        assert!(get_total_polls(creator_addr) == 0, 0);
    }

    // ==================== Edge Case Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x60001, location = voting::poll)]
    /// Test get_poll_info for non-existent poll
    public fun test_get_info_non_existent(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let (_, _, _, _, _, _, _, _, _) = get_poll_info(creator_addr, 0); // Should fail
    }

    #[test(creator = @0x100, v1 = @0x201, v2 = @0x202, v3 = @0x203, v4 = @0x204, v5 = @0x205, framework = @0x1)]
    /// Test complete poll lifecycle with voting
    public fun test_complete_poll_lifecycle(
        creator: &signer,
        v1: &signer,
        v2: &signer,
        v3: &signer,
        v4: &signer,
        v5: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        account::create_account_for_test(signer::address_of(v1));
        account::create_account_for_test(signer::address_of(v2));
        account::create_account_for_test(signer::address_of(v3));
        account::create_account_for_test(signer::address_of(v4));
        account::create_account_for_test(signer::address_of(v5));
        
        // Create poll
        create_test_poll(creator, b"Should we proceed with the proposal?", FUTURE_DEADLINE);
        assert!(is_poll_active(creator_addr, 0), 0);
        
        // Multiple votes
        vote(v1, creator_addr, 0, true);
        vote(v2, creator_addr, 0, true);
        vote(v3, creator_addr, 0, true);
        vote(v4, creator_addr, 0, false);
        vote(v5, creator_addr, 0, false);
        
        // Check results
        let (yes, no, total) = get_vote_counts(creator_addr, 0);
        assert!(yes == 3, 1);
        assert!(no == 2, 2);
        assert!(total == 5, 3);
        
        // Close poll
        close_poll(creator, 0);
        assert!(!is_poll_active(creator_addr, 0), 4);
        
        // Verify final result
        let (yes_wins, yes_final, no_final) = get_poll_result(creator_addr, 0);
        assert!(yes_wins, 5);
        assert!(yes_final == 3, 6);
        assert!(no_final == 2, 7);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test managing multiple independent polls
    public fun test_multiple_polls_independent(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        // Create three polls
        create_test_poll(creator, b"Question 1?", FUTURE_DEADLINE);
        create_test_poll(creator, b"Question 2?", FUTURE_DEADLINE);
        create_test_poll(creator, b"Question 3?", FUTURE_DEADLINE);
        
        assert!(get_total_polls(creator_addr) == 3, 0);
        
        // Close middle poll
        close_poll(creator, 1);
        
        // Verify first and third are still active
        assert!(is_poll_active(creator_addr, 0), 1);
        assert!(!is_poll_active(creator_addr, 1), 2);
        assert!(is_poll_active(creator_addr, 2), 3);
        
        // Delete first poll (no votes)
        delete_poll(creator, 0);
        
        assert!(get_total_polls(creator_addr) == 2, 4);
        assert!(!poll_exists(creator_addr, 0), 5);
        assert!(poll_exists(creator_addr, 1), 6);
        assert!(poll_exists(creator_addr, 2), 7);
    }

    #[test(creator = @0x100, v1 = @0x201, v2 = @0x202, framework = @0x1)]
    /// Test tie vote scenario
    public fun test_tie_vote(
        creator: &signer,
        v1: &signer,
        v2: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        account::create_account_for_test(signer::address_of(v1));
        account::create_account_for_test(signer::address_of(v2));
        
        create_test_poll(creator, b"Tie vote test?", FUTURE_DEADLINE);
        
        vote(v1, creator_addr, 0, true);
        vote(v2, creator_addr, 0, false);
        
        let (yes_winning, yes, no) = get_poll_result(creator_addr, 0);
        assert!(!yes_winning, 0); // No wins in tie (yes is not > no)
        assert!(yes == 1, 1);
        assert!(no == 1, 2);
    }
}