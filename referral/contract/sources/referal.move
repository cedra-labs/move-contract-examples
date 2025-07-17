module referral_example::referral_system {
    use std::signer;
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::object::Object;
    use cedra_framework::primary_fungible_store;
    use cedra_framework::event;
    use cedra_framework::account;
    use cedra_std::math64;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_REGISTERED: u64 = 2;
    const E_INVALID_REFERRER: u64 = 3;
    const E_SELF_REFERRAL: u64 = 4;
    const E_INVALID_REWARD_PERCENTAGE: u64 = 5;
    
    const MAX_REWARD_PERCENTAGE: u64 = 10000; // 100%

    struct ReferralConfig has key {
        reward_percentage: u64, // 500 = 5%
        is_active: bool,
        total_rewards_paid: u64,
        reward_events: event::EventHandle<RewardEvent>,
    }

    struct UserReferral has key {
        referrer: address,
        referred_count: u64,
        total_earned: u64,
    }

    struct RewardEvent has drop, store {
        referrer: address,
        buyer: address,
        amount: u64,
    }

    public entry fun initialize(admin: &signer, reward_percentage: u64) {
        assert!(reward_percentage <= MAX_REWARD_PERCENTAGE, E_INVALID_REWARD_PERCENTAGE);
        
        move_to(admin, ReferralConfig {
            reward_percentage,
            is_active: true,
            total_rewards_paid: 0,
            reward_events: account::new_event_handle<RewardEvent>(admin),
        });
    }

    /// Register a user with a referrer
    public entry fun register_with_referrer(
        user: &signer, 
        referrer_addr: address
    ) acquires UserReferral {
        let user_addr = signer::address_of(user);
        
        assert!(!exists<UserReferral>(user_addr), E_ALREADY_REGISTERED);
        assert!(exists<UserReferral>(referrer_addr), E_INVALID_REFERRER);
        assert!(user_addr != referrer_addr, E_SELF_REFERRAL);
        
        move_to(user, UserReferral {
            referrer: referrer_addr,
            referred_count: 0,
            total_earned: 0,
        });
        
        let referrer_data = borrow_global_mut<UserReferral>(referrer_addr);
        referrer_data.referred_count = referrer_data.referred_count + 1;
    }

    /// Register without referrer
    public entry fun register_solo(user: &signer) {
        let user_addr = signer::address_of(user);
        assert!(!exists<UserReferral>(user_addr), E_ALREADY_REGISTERED);
        
        move_to(user, UserReferral {
            referrer: @0x0,
            referred_count: 0,
            total_earned: 0,
        });
    }

    /// Calculate and pay referral rewards
    public entry fun process_purchase_with_referral(
        buyer: &signer,
        seller: address,
        asset: Object<Metadata>,
        amount: u64
    ) acquires ReferralConfig, UserReferral {
        let buyer_addr = signer::address_of(buyer);
        
        if (!exists<UserReferral>(buyer_addr)) {
            primary_fungible_store::transfer(buyer, asset, seller, amount);
            return
        };
        
        let user_data = borrow_global<UserReferral>(buyer_addr);
        let referrer_addr = user_data.referrer;
        if (referrer_addr == @0x0) {
            // No referrer, normal payment
            primary_fungible_store::transfer(buyer, asset, seller, amount);
            return  
        };
        
        // Calculate referral reward with overflow protection
        let config = borrow_global_mut<ReferralConfig>(@referral_example);
        
        let reward_amount = math64::mul_div(amount, config.reward_percentage, 10000);
        let seller_amount = amount - reward_amount;
        
        primary_fungible_store::transfer(buyer, asset, seller, seller_amount);
        
        primary_fungible_store::transfer(buyer, asset, referrer_addr, reward_amount);
        
        let referrer_data = borrow_global_mut<UserReferral>(referrer_addr);
        referrer_data.total_earned = referrer_data.total_earned + reward_amount;
        config.total_rewards_paid = config.total_rewards_paid + reward_amount;
        
        event::emit_event(&mut config.reward_events, RewardEvent {
            referrer: referrer_addr,
            buyer: buyer_addr,
            amount: reward_amount,
        });
    }

    #[view]
    public fun get_user_stats(user: address): (address, u64, u64) acquires UserReferral {
        if (!exists<UserReferral>(user)) {
            return (@0x0, 0, 0)
        };
        
        let data = borrow_global<UserReferral>(user);
        (data.referrer, data.referred_count, data.total_earned)
    }
    
    #[view]
    public fun get_global_stats(admin: address): (u64, bool, u64) acquires ReferralConfig {
        assert!(exists<ReferralConfig>(admin), E_NOT_INITIALIZED);
        
        let config = borrow_global<ReferralConfig>(admin);
        (config.reward_percentage, config.is_active, config.total_rewards_paid)
    }
}