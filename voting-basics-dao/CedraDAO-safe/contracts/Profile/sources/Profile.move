module profile_system::profile {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use cedra_framework::timestamp;
    use cedra_framework::event;

    struct UserProfile has key {
        display_name: String,
        avatar_url: String,
        wallet_address: address,
        created_at: u64,
        updated_at: u64,
    }

    #[event]
    struct ProfileCreatedEvent has drop, store {
        user_address: address,
        display_name: String,
        avatar_url: String,
        created_at: u64,
    }

    #[event]
    struct ProfileUpdatedEvent has drop, store {
        user_address: address,
        display_name: String,
        avatar_url: String,
        updated_at: u64,
    }

    const E_PROFILE_ALREADY_EXISTS: u64 = 1;
    const E_PROFILE_NOT_FOUND: u64 = 2;
    const E_INVALID_DISPLAY_NAME: u64 = 3;

    public entry fun create_profile(
        user: &signer,
        display_name: String,
        avatar_url: String,
    ) {
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();
        
        assert!(!exists<UserProfile>(user_addr), E_PROFILE_ALREADY_EXISTS);
        assert!(string::length(&display_name) > 0, E_INVALID_DISPLAY_NAME);
        
        let profile = UserProfile {
            display_name,
            avatar_url,
            wallet_address: user_addr,
            created_at: now,
            updated_at: now,
        };
        
        move_to(user, profile);
        
        event::emit(ProfileCreatedEvent {
            user_address: user_addr,
            display_name,
            avatar_url,
            created_at: now,
        });
    }

    public entry fun update_profile(
        user: &signer,
        new_display_name: String,
        new_avatar_url: String,
    ) acquires UserProfile {
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();
        
        assert!(exists<UserProfile>(user_addr), E_PROFILE_NOT_FOUND);
        assert!(string::length(&new_display_name) > 0, E_INVALID_DISPLAY_NAME);
        
        let profile = borrow_global_mut<UserProfile>(user_addr);
        profile.display_name = new_display_name;
        profile.avatar_url = new_avatar_url;
        profile.updated_at = now;
        
        event::emit(ProfileUpdatedEvent {
            user_address: user_addr,
            display_name: new_display_name,
            avatar_url: new_avatar_url,
            updated_at: now,
        });
    }

    public entry fun update_display_name(
        user: &signer,
        new_display_name: String,
    ) acquires UserProfile {
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();
        
        assert!(exists<UserProfile>(user_addr), E_PROFILE_NOT_FOUND);
        assert!(string::length(&new_display_name) > 0, E_INVALID_DISPLAY_NAME);
        
        let profile = borrow_global_mut<UserProfile>(user_addr);
        let old_avatar = profile.avatar_url;
        profile.display_name = new_display_name;
        profile.updated_at = now;
        
        event::emit(ProfileUpdatedEvent {
            user_address: user_addr,
            display_name: new_display_name,
            avatar_url: old_avatar,
            updated_at: now,
        });
    }

    public entry fun update_avatar_url(
        user: &signer,
        new_avatar_url: String,
    ) acquires UserProfile {
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();
        
        assert!(exists<UserProfile>(user_addr), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(user_addr);
        let old_display_name = profile.display_name;
        profile.avatar_url = new_avatar_url;
        profile.updated_at = now;
        
        event::emit(ProfileUpdatedEvent {
            user_address: user_addr,
            display_name: old_display_name,
            avatar_url: new_avatar_url,
            updated_at: now,
        });
    }

    #[view]
    public fun get_profile(user_address: address): (String, String, address, u64, u64) acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        (profile.display_name, profile.avatar_url, profile.wallet_address, profile.created_at, profile.updated_at)
    }

    #[view]
    public fun get_basic_profile(user_address: address): (String, String) acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        (profile.display_name, profile.avatar_url)
    }

    #[view]
    public fun profile_exists(user_address: address): bool {
        exists<UserProfile>(user_address)
    }

    #[view]
    public fun get_display_name(user_address: address): String acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        profile.display_name
    }

    #[view]
    public fun get_avatar_url(user_address: address): String acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        profile.avatar_url
    }

    #[view]
    public fun get_wallet_address(user_address: address): address acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        profile.wallet_address
    }

    #[view]
    public fun get_profile_timestamps(user_address: address): (u64, u64) acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        (profile.created_at, profile.updated_at)
    }

    #[view]
    public fun get_multiple_display_names(addresses: vector<address>): vector<String> acquires UserProfile {
        let result = vector::empty<String>();
        let i = 0;
        let len = vector::length(&addresses);
        
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            if (exists<UserProfile>(addr)) {
                let profile = borrow_global<UserProfile>(addr);
                vector::push_back(&mut result, profile.display_name);
            } else {
                vector::push_back(&mut result, string::utf8(b""));
            };
            i = i + 1;
        };
        
        result
    }
    
    #[view]
    public fun get_multiple_avatar_urls(addresses: vector<address>): vector<String> acquires UserProfile {
        let result = vector::empty<String>();
        let i = 0;
        let len = vector::length(&addresses);
        
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            if (exists<UserProfile>(addr)) {
                let profile = borrow_global<UserProfile>(addr);
                vector::push_back(&mut result, profile.avatar_url);
            } else {
                vector::push_back(&mut result, string::utf8(b""));
            };
            i = i + 1;
        };
        
        result
    }

    #[view]
    public fun check_multiple_profiles_exist(addresses: vector<address>): vector<bool> {
        let result = vector::empty<bool>();
        let i = 0;
        let len = vector::length(&addresses);
        
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            vector::push_back(&mut result, exists<UserProfile>(addr));
            i = i + 1;
        };
        
        result
    }

    #[view]
    public fun get_profile_for_dao_member_exists(member_address: address): bool {
        exists<UserProfile>(member_address)
    }

    #[view]
    public fun validate_profile_for_dao_action(user_address: address): bool acquires UserProfile {
        if (exists<UserProfile>(user_address)) {
            let profile = borrow_global<UserProfile>(user_address);
            string::length(&profile.display_name) > 0
        } else {
            false
        }
    }
}