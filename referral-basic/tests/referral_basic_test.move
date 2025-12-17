#[test]
public fun test_referral_flow() {
    let owner = @0x1;
    let alice = @0x2;

    referral_basic::init(&owner);

    referral_basic::register_referral(
        owner,
        &alice,
        owner
    );

    let reward = referral_basic::get_reward(owner, owner);
    assert!(reward == 10, 0);

    referral_basic::claim_rewards(owner, &owner);

    let reward_after = referral_basic::get_reward(owner, owner);
    assert!(reward_after == 0, 1);
}
