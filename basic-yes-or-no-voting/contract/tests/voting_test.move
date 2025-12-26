#[test_only]
module module_addr::voting_test {
    use std::signer;
    use cedra_framework::account;
    use module_addr::voting;

    fun setup_accounts(admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        voting::init_for_test(admin);
    }

    fun setup_accounts_with_users(admin: &signer, user1: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        voting::init_for_test(admin);
    }

    fun setup_accounts_with_two_users(admin: &signer, user1: &signer, user2: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        voting::init_for_test(admin);
    }

    fun setup_accounts_with_three_users(admin: &signer, user1: &signer, user2: &signer, user3: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        account::create_account_for_test(signer::address_of(user3));
        voting::init_for_test(admin);
    }

    #[test(admin = @module_addr)]
    fun test_create_proposal(admin: &signer) {
        setup_accounts(admin);
        voting::create_proposal(admin, b"Test proposal");
        assert!(voting::proposal_exists(1), 0);
        let (yes, no, exists) = voting::get_results(1);
        assert!(yes == 0, 1);
        assert!(no == 0, 2);
        assert!(exists == true, 3);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    fun test_vote_yes(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_yes(user1, 1);
        let (yes, no, exists) = voting::get_results(1);
        assert!(yes == 1, 0);
        assert!(no == 0, 1);
        assert!(exists == true, 2);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    fun test_vote_no(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_no(user1, 1);
        let (yes, no, exists) = voting::get_results(1);
        assert!(yes == 0, 0);
        assert!(no == 1, 1);
        assert!(exists == true, 2);
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200)]
    fun test_multiple_votes(admin: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_two_users(admin, user1, user2);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_yes(user1, 1);
        voting::vote_yes(user2, 1);
        let (yes, no, _exists) = voting::get_results(1);
        assert!(yes == 2, 0);
        assert!(no == 0, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200)]
    fun test_mixed_votes(admin: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_two_users(admin, user1, user2);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_yes(user1, 1);
        voting::vote_no(user2, 1);
        let (yes, no, _exists) = voting::get_results(1);
        assert!(yes == 1, 0);
        assert!(no == 1, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200, user3 = @0x300)]
    fun test_multiple_proposals(admin: &signer, user1: &signer, user2: &signer, user3: &signer) {
        setup_accounts_with_three_users(admin, user1, user2, user3);
        voting::create_proposal(admin, b"Proposal 1");
        voting::create_proposal(admin, b"Proposal 2");
        voting::vote_yes(user1, 1);
        voting::vote_no(user2, 1);
        voting::vote_yes(user3, 2);
        let (yes1, no1, exists1) = voting::get_results(1);
        let (yes2, no2, exists2) = voting::get_results(2);
        assert!(yes1 == 1 && no1 == 1 && exists1 == true, 0);
        assert!(yes2 == 1 && no2 == 0 && exists2 == true, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    #[expected_failure(abort_code = 393217, location = module_addr::voting)]
    fun test_vote_on_nonexistent_proposal(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::vote_yes(user1, 999);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    #[expected_failure(abort_code = 196610, location = module_addr::voting)]
    fun test_duplicate_vote_yes(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_yes(user1, 1);
        voting::vote_yes(user1, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    #[expected_failure(abort_code = 196610, location = module_addr::voting)]
    fun test_duplicate_vote_no(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_no(user1, 1);
        voting::vote_no(user1, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    #[expected_failure(abort_code = 196610, location = module_addr::voting)]
    fun test_vote_yes_after_vote_no(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_no(user1, 1);
        voting::vote_yes(user1, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    #[expected_failure(abort_code = 196610, location = module_addr::voting)]
    fun test_vote_no_after_vote_yes(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_yes(user1, 1);
        voting::vote_no(user1, 1);
    }

    #[test(admin = @module_addr)]
    fun test_get_results_nonexistent_proposal(admin: &signer) {
        setup_accounts(admin);
        let (yes, no, exists) = voting::get_results(999);
        assert!(yes == 0, 0);
        assert!(no == 0, 1);
        assert!(exists == false, 2);
    }

    #[test(admin = @module_addr)]
    fun test_proposal_exists_false(admin: &signer) {
        setup_accounts(admin);
        assert!(!voting::proposal_exists(999), 0);
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200, user3 = @0x300)]
    fun test_large_vote_counts(admin: &signer, user1: &signer, user2: &signer, user3: &signer) {
        setup_accounts_with_three_users(admin, user1, user2, user3);
        voting::create_proposal(admin, b"Test proposal");
        voting::vote_yes(user1, 1);
        voting::vote_yes(user2, 1);
        voting::vote_yes(user3, 1);
        let (yes, no, _exists) = voting::get_results(1);
        assert!(yes == 3, 0);
        assert!(no == 0, 1);
    }

    #[test(admin = @module_addr, user1 = @0x100)]
    fun test_zero_votes_initially(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        voting::create_proposal(admin, b"Test proposal");
        let (yes, no, exists) = voting::get_results(1);
        assert!(yes == 0, 0);
        assert!(no == 0, 1);
        assert!(exists == true, 2);
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200)]
    fun test_sequential_proposal_ids(admin: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_two_users(admin, user1, user2);
        voting::create_proposal(admin, b"Proposal 1");
        voting::create_proposal(admin, b"Proposal 2");
        assert!(voting::proposal_exists(1), 0);
        assert!(voting::proposal_exists(2), 1);
        assert!(!voting::proposal_exists(3), 2);
    }
}

