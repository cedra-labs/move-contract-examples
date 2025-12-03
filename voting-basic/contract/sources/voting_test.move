#[test_only]
module VotingBasic::VotingTest {
    use std::string;
    use VotingBasic::Voting;

    #[test(admin = @0xcafe)]
    fun test_init_module(admin: signer) {
        Voting::init_for_testing(&admin);
    }

    #[test(admin = @0xcafe)]
    fun test_create_proposal(admin: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"Test proposal"));
        let (yes, no, _desc) = Voting::check_results(0);
        assert!(yes == 0, 2);
        assert!(no == 0, 3);
    }

    #[test(admin = @0xcafe, voter1 = @0x1)]
    fun test_vote_yes(admin: signer, voter1: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"Vote test"));
        Voting::vote(&voter1, 0, true);
        let (yes, no, _desc) = Voting::check_results(0);
        assert!(yes == 1, 5);
        assert!(no == 0, 6);
    }

    #[test(admin = @0xcafe, voter1 = @0x1)]
    fun test_vote_no(admin: signer, voter1: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"Vote test"));
        Voting::vote(&voter1, 0, false);
        let (yes, no, _desc) = Voting::check_results(0);
        assert!(yes == 0, 7);
        assert!(no == 1, 8);
    }

    #[test(admin = @0xcafe, voter1 = @0x1, voter2 = @0x2)]
    fun test_multiple_votes(admin: signer, voter1: signer, voter2: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"Multiple votes"));
        Voting::vote(&voter1, 0, true);
        Voting::vote(&voter2, 0, false);
        let (yes, no, _desc) = Voting::check_results(0);
        assert!(yes == 1, 9);
        assert!(no == 1, 10);
    }

    #[test(admin = @0xcafe, voter1 = @0x1, voter2 = @0x2, voter3 = @0x3)]
    fun test_multiple_yes_votes(admin: signer, voter1: signer, voter2: signer, voter3: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"All yes"));
        Voting::vote(&voter1, 0, true);
        Voting::vote(&voter2, 0, true);
        Voting::vote(&voter3, 0, true);
        let (yes, no, _desc) = Voting::check_results(0);
        assert!(yes == 3, 11);
        assert!(no == 0, 12);
    }

    #[test(admin = @0xcafe, voter1 = @0x1)]
    #[expected_failure(abort_code = 196610, location = VotingBasic::Voting)]
    fun test_vote_twice_fails(admin: signer, voter1: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"Double vote"));
        Voting::vote(&voter1, 0, true);
        Voting::vote(&voter1, 0, false);
    }

    #[test(admin = @0xcafe, voter1 = @0x1)]
    #[expected_failure(abort_code = 393217, location = VotingBasic::Voting)]
    fun test_vote_invalid_proposal(admin: signer, voter1: signer) {
        Voting::init_for_testing(&admin);
        Voting::vote(&voter1, 0, true);
    }

    #[test(admin = @0xcafe)]
    #[expected_failure(abort_code = 393217, location = VotingBasic::Voting)]
    fun test_check_results_invalid_proposal(admin: signer) {
        Voting::init_for_testing(&admin);
        Voting::check_results(0);
    }

    #[test(admin = @0xcafe, voter1 = @0x1, voter2 = @0x2, voter3 = @0x3)]
    fun test_complete_flow(admin: signer, voter1: signer, voter2: signer, voter3: signer) {
        Voting::init_for_testing(&admin);
        Voting::create_proposal(&admin, string::utf8(b"Complete flow"));
        Voting::vote(&voter1, 0, true);
        Voting::vote(&voter2, 0, true);
        Voting::vote(&voter3, 0, false);
        let (yes, no, _desc) = Voting::check_results(0);
        assert!(yes == 2, 13);
        assert!(no == 1, 14);
    }
}

