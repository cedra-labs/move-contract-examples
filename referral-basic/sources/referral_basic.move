module referral_basic::referral_basic {
    use std::signer;
    use std::option;
    use std::table;
    use std::event;

    /// ===== Errors =====
    const E_ALREADY_INITIALIZED: u64 = 0;
    const E_SELF_REFERRAL: u64 = 1;
    const E_ALREADY_REFERRED: u64 = 2;
    const E_NO_REWARD: u64 = 3;

    /// ===== Constants =====
    const REFERRAL_REWARD: u64 = 10;

    /// ===== Events =====
    struct ReferralRegistered has drop, store {
        referrer: address,
        referee: address,
        reward: u64,
    }

    struct RewardClaimed has drop, store {
        user: address,
        amount: u64,
    }

    /// ===== Storage =====
    struct ReferralRegistry has key {
        referrer_of: table::Table<address, address>,
        rewards: table::Table<address, u64>,
    }

    /// ===== Init =====
    /// Initializes the referral registry.
    /// This function should be called ONCE by the owner.
    public entry fun init(account: &signer) {
        let addr = signer::address_of(account);
        assert!(
            !exists<ReferralRegistry>(addr),
            E_ALREADY_INITIALIZED
        );

        move_to(account, ReferralRegistry {
            referrer_of: table::new(),
            rewards: table::new(),
        });
    }

    /// ===== Register Referral =====
    /// Registers a referral and assigns a fixed reward to the referrer.
    public entry fun register_referral(
        owner: address,
        referee: &signer,
        referrer: address
    ) acquires ReferralRegistry {
        let referee_addr = signer::address_of(referee);
        let registry = borrow_global_mut<ReferralRegistry>(owner);

        // Anti-gaming checks
        assert!(referee_addr != referrer, E_SELF_REFERRAL);
        assert!(
            !table::contains(&registry.referrer_of, referee_addr),
            E_ALREADY_REFERRED
        );

        // Register referral relationship
        table::add(&mut registry.referrer_of, referee_addr, referrer);

        // Track referral reward
        let reward_ref = table::borrow_mut_with_default(
            &mut registry.rewards,
            referrer,
            0
        );
        *reward_ref = *reward_ref + REFERRAL_REWARD;

        event::emit(ReferralRegistered {
            referrer,
            referee: referee_addr,
            reward: REFERRAL_REWARD,
        });
    }

    /// ===== Claim Rewards =====
    /// Claims and resets accumulated referral rewards.
    public entry fun claim_rewards(
        owner: address,
        user: &signer
    ) acquires ReferralRegistry {
        let user_addr = signer::address_of(user);
        let registry = borrow_global_mut<ReferralRegistry>(owner);

        let reward = table::borrow_mut_with_default(
            &mut registry.rewards,
            user_addr,
            0
        );

        assert!(*reward > 0, E_NO_REWARD);

        let amount = *reward;
        *reward = 0;

        event::emit(RewardClaimed {
            user: user_addr,
            amount,
        });
    }

    /// ===== View Functions =====
    /// Returns the referrer of a given referee, if any.
    public fun get_referrer(
        owner: address,
        referee: address
    ): option::Option<address> acquires ReferralRegistry {
        let registry = borrow_global<ReferralRegistry>(owner);
        if (table::contains(&registry.referrer_of, referee)) {
            option::some(*table::borrow(&registry.referrer_of, referee))
        } else {
            option::none()
        }
    }

    /// Returns the current reward balance for a user.
    public fun get_reward(
        owner: address,
        user: address
    ): u64 acquires ReferralRegistry {
        let registry = borrow_global<ReferralRegistry>(owner);
        if (table::contains(&registry.rewards, user)) {
            *table::borrow(&registry.rewards, user)
        } else {
            0
        }
    }
}
