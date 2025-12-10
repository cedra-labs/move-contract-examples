#[test_only]
module ReferralBasic::ReferralTest {
    use ReferralBasic::Referral;
    use std::string;

    #[test(admin = @0xcafe)]
    fun test_init_module(admin: signer) {
        Referral::init_for_testing(&admin);
    }

    #[test(admin = @0xcafe, user1 = @0x1)]
    fun test_register_referral_code(admin: signer, user1: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        assert!(Referral::code_exists(string::utf8(b"REF1")) == true, 1);
        assert!(Referral::has_referral_code(@0x1) == true, 2);
        let (code, total_refs, total_rewards) = Referral::get_code_by_owner(@0x1);
        let expected_code = string::utf8(b"REF1");
        assert!(string::bytes(&code) == string::bytes(&expected_code), 3);
        assert!(total_refs == 0, 4);
        assert!(total_rewards == 0, 5);
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    fun test_track_referral(admin: signer, user1: signer, user2: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::track_referral(&user2, string::utf8(b"REF1"));
        let (code, owner, total_refs, total_rewards) = Referral::get_referral_code_info(string::utf8(b"REF1"));
        assert!(total_refs == 1, 6);
        assert!(total_rewards == 100, 7); // REWARD_AMOUNT = 100
        let unclaimed = Referral::get_unclaimed_rewards(@0x1);
        assert!(unclaimed == 100, 8);
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    fun test_claim_rewards(admin: signer, user1: signer, user2: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::track_referral(&user2, string::utf8(b"REF1"));
        let unclaimed_before = Referral::get_unclaimed_rewards(@0x1);
        assert!(unclaimed_before == 100, 9);
        Referral::claim_rewards(&user1);
        let unclaimed_after = Referral::get_unclaimed_rewards(@0x1);
        assert!(unclaimed_after == 0, 10);
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2, user3 = @0x3)]
    fun test_multiple_referrals(admin: signer, user1: signer, user2: signer, user3: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::track_referral(&user2, string::utf8(b"REF1"));
        Referral::track_referral(&user3, string::utf8(b"REF1"));
        let (code, owner, total_refs, total_rewards) = Referral::get_referral_code_info(string::utf8(b"REF1"));
        assert!(total_refs == 2, 11);
        assert!(total_rewards == 200, 12);
        let unclaimed = Referral::get_unclaimed_rewards(@0x1);
        assert!(unclaimed == 200, 13);
    }

    #[test(admin = @0xcafe, user1 = @0x1)]
    #[expected_failure(abort_code = 65540, location = ReferralBasic::Referral)]
    fun test_self_referral_prevention(admin: signer, user1: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::track_referral(&user1, string::utf8(b"REF1")); // Should fail
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    #[expected_failure(abort_code = 524290, location = ReferralBasic::Referral)]
    fun test_duplicate_code_prevention(admin: signer, user1: signer, user2: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::register_referral_code(&user2, string::utf8(b"REF1")); // Should fail
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    #[expected_failure(abort_code = 524294, location = ReferralBasic::Referral)]
    fun test_duplicate_referral_prevention(admin: signer, user1: signer, user2: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::track_referral(&user2, string::utf8(b"REF1"));
        Referral::track_referral(&user2, string::utf8(b"REF1")); // Should fail - duplicate referral
    }

    #[test(admin = @0xcafe, user1 = @0x1)]
    #[expected_failure(abort_code = 524295, location = ReferralBasic::Referral)]
    fun test_register_multiple_codes_per_user(admin: signer, user1: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::register_referral_code(&user1, string::utf8(b"REF2")); // Should fail
    }

    #[test(admin = @0xcafe, user1 = @0x1)]
    #[expected_failure(abort_code = 65545, location = ReferralBasic::Referral)]
    fun test_code_too_short(admin: signer, user1: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"AB")); // Should fail - too short
    }

    #[test(admin = @0xcafe, user1 = @0x1)]
    #[expected_failure(abort_code = 65546, location = ReferralBasic::Referral)]
    fun test_code_too_long(admin: signer, user1: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"THIS_CODE_IS_TOO_LONG_FOR_VALIDATION")); // Should fail - too long
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    #[expected_failure(abort_code = 393217, location = ReferralBasic::Referral)]
    fun test_track_referral_invalid_code(admin: signer, user1: signer, user2: signer) {
        Referral::init_for_testing(&admin);
        Referral::track_referral(&user2, string::utf8(b"INVALID")); // Should fail - code doesn't exist
    }

    #[test(admin = @0xcafe, user1 = @0x1)]
    #[expected_failure(abort_code = 196613, location = ReferralBasic::Referral)]
    fun test_claim_rewards_no_rewards(admin: signer, user1: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::claim_rewards(&user1); // Should fail - no rewards to claim
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2, user3 = @0x3)]
    fun test_multiple_codes(admin: signer, user1: signer, user2: signer, user3: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::register_referral_code(&user2, string::utf8(b"REF2"));
        Referral::track_referral(&user3, string::utf8(b"REF1"));
        assert!(Referral::get_total_codes() == 2, 14);
        assert!(Referral::get_total_records() == 1, 15);
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2, user3 = @0x3, user4 = @0x4)]
    fun test_multiple_referrers(admin: signer, user1: signer, user2: signer, user3: signer, user4: signer) {
        Referral::init_for_testing(&admin);
        Referral::register_referral_code(&user1, string::utf8(b"REF1"));
        Referral::register_referral_code(&user2, string::utf8(b"REF2"));
        Referral::track_referral(&user3, string::utf8(b"REF1"));
        Referral::track_referral(&user4, string::utf8(b"REF2"));
        let (code1, owner1, total_refs1, total_rewards1) = Referral::get_referral_code_info(string::utf8(b"REF1"));
        let (code2, owner2, total_refs2, total_rewards2) = Referral::get_referral_code_info(string::utf8(b"REF2"));
        assert!(total_refs1 == 1, 16);
        assert!(total_rewards1 == 100, 17);
        assert!(total_refs2 == 1, 18);
        assert!(total_rewards2 == 100, 19);
    }
}

