// Membership system - manages who can join the DAO based on staking requirements and tracks member status
module movedao_addrx::membership {
    use std::signer;
    use std::simple_map::{Self, SimpleMap};
    use std::event;
    use std::vector;
    use cedra_framework::timestamp;
    use movedao_addrx::admin;
    use movedao_addrx::staking;
    use movedao_addrx::errors;
    use movedao_addrx::activity_tracker;

    struct Member has store, copy, drop {
        joined_at: u64,
    }

    struct MembershipConfig has key {
        min_stake_to_join: u64,
        min_stake_to_propose: u64,  // Minimum stake required to create proposals
    }

    struct MemberList has key {
        members: SimpleMap<address, Member>,
        total_members: u64,
    }

    #[event]
    struct MemberJoined has drop, store {
        member: address
    }

    #[event]
    struct MemberLeft has drop, store {
        member: address
    }

    #[event]
    struct MinStakeUpdated has drop, store {
        old_min_stake: u64,
        new_min_stake: u64,
        updated_by: address
    }

    #[event]
    struct MinProposalStakeUpdated has drop, store {
        old_min_proposal_stake: u64,
        new_min_proposal_stake: u64,
        updated_by: address
    }

    public fun initialize(account: &signer) {
        initialize_with_min_stake(account, 1) // Default to 10 APT
    }

    public fun initialize_with_min_stake(account: &signer, min_stake_to_join: u64) {
        let min_stake_to_propose = 6000000; // 6 Move tokens (6 * 1e6 decimals) for proposal creation
        initialize_with_stake_requirements(account, min_stake_to_join, min_stake_to_propose)
    }

    public fun initialize_with_stake_requirements(account: &signer, min_stake_to_join: u64, min_stake_to_propose: u64) {
        let addr = signer::address_of(account);
        if (!exists<MemberList>(addr)) {
            let member_list = MemberList {
                members: simple_map::new(),
                total_members: 0,
            };

            let config = MembershipConfig {
                min_stake_to_join,
                min_stake_to_propose,
            };

            move_to(account, member_list);
            move_to(account, config);
        } else {
            abort errors::member_exists()
        }
    }

    /// Join the DAO as a member
    /// 
    /// MINIMUM STAKE ENFORCEMENT:
    /// - Users must have staked at least the minimum amount before joining
    /// - Minimum stake is set when DAO is created (e.g., 10 MOVE tokens for Gorilla Moverz)
    /// - If user hasn't staked enough tokens, join() will fail with min_stake_required error
    /// - This prevents people from joining without commitment to the DAO
    /// 
    /// PROCESS:
    /// 1. Check if user is already a member (prevent duplicate joins)
    /// 2. Get the DAO's minimum stake requirement from config
    /// 3. Check user's current staked balance
    /// 4. If staked balance >= minimum requirement -> Allow join
    /// 5. If staked balance < minimum requirement -> Reject with error
    /// 6. Add user to member list and emit join event
    /// 
    /// EXAMPLE FOR GORILLA MOVERZ:
    /// - Minimum stake: 10 MOVE tokens
    /// - User stakes 15 MOVE -> Can join (15 >= 10)
    /// - User stakes 5 MOVE -> Cannot join (5 < 10)
    /// - User stakes 0 MOVE -> Cannot join (0 < 10)
    public entry fun join(account: &signer, movedao_addrx: address) acquires MemberList, MembershipConfig {
        let addr = signer::address_of(account);
        let member_list = borrow_global_mut<MemberList>(movedao_addrx);
        
        // Prevent duplicate membership
        errors::require_not_exists(!simple_map::contains_key(&member_list.members, &addr), errors::already_member());
        
        // Get the DAO's minimum stake requirement
        let config = borrow_global<MembershipConfig>(movedao_addrx);
        // Check user's current staked balance in THIS DAO (not global)
        let stake_amount = staking::get_staker_amount(movedao_addrx, addr);
        // Enforce minimum stake requirement - this is the key validation!
        assert!(stake_amount >= config.min_stake_to_join, errors::min_stake_required());
        
        // User meets requirements - add to member list
        simple_map::add(&mut member_list.members, addr, Member {
            joined_at: timestamp::now_seconds(),
        });
        
        // Add overflow protection for member count
        assert!(member_list.total_members < 18446744073709551615u64, errors::invalid_amount());
        member_list.total_members = member_list.total_members + 1;
        
        // Log member joined activity
        activity_tracker::emit_member_joined(
            movedao_addrx,            // dao_address
            addr,                    // member
            vector::empty<u8>(),     // transaction_hash
            0                        // block_number
        );
        
        // Emit event for tracking
        event::emit(MemberJoined {
            member: addr
        });
    }

    public entry fun leave(account: &signer, movedao_addrx: address) acquires MemberList {
        let addr = signer::address_of(account);
        let member_list = borrow_global_mut<MemberList>(movedao_addrx);
        
        errors::require_member(simple_map::contains_key(&member_list.members, &addr));
        
        // Allow voluntary leaving regardless of stake (users can choose to leave)
        // The is_member function will handle continuous validation of membership privileges
        
        simple_map::remove(&mut member_list.members, &addr);
        member_list.total_members = member_list.total_members - 1;
        
        // Log member left activity
        activity_tracker::emit_member_left(
            movedao_addrx,            // dao_address
            addr,                    // member
            vector::empty<u8>(),     // transaction_hash
            0                        // block_number
        );
        
        event::emit(MemberLeft { member: addr });
    }

    #[view]
    public fun is_member(movedao_addrx: address, member: address): bool acquires MemberList, MembershipConfig {
        if (!exists<MemberList>(movedao_addrx)) return false;
        if (!exists<MembershipConfig>(movedao_addrx)) return false;
        
        // Admin bypass: Admins are always considered members regardless of stake or membership status
        if (admin::is_admin(movedao_addrx, member)) return true;
        
        // Check if member is in the list (has joined the DAO)
        let is_in_list = simple_map::contains_key(&borrow_global<MemberList>(movedao_addrx).members, &member);
        if (!is_in_list) return false;
        
        // CRITICAL: Verify member still meets minimum stake requirement (prevents membership gaming)
        // This is the key validation that enforces minimum stake for proposal creation
        let config = borrow_global<MembershipConfig>(movedao_addrx);
        let current_stake = staking::get_staker_amount(movedao_addrx, member);
        current_stake >= config.min_stake_to_join
    }

    #[view]
    public fun get_voting_power(movedao_addrx: address, member: address): u64 acquires MembershipConfig {
        // Admin bypass: Give admins voting power equal to their stake, or minimum proposal stake if they have no stake
        if (admin::is_admin(movedao_addrx, member)) {
            let staked_amount = staking::get_staker_amount(movedao_addrx, member);
            if (staked_amount > 0) {
                return staked_amount
            } else {
                // If admin has no stake, give them voting power equal to minimum proposal stake requirement
                if (exists<MembershipConfig>(movedao_addrx)) {
                    return borrow_global<MembershipConfig>(movedao_addrx).min_stake_to_propose
                } else {
                    return 1  // Fallback minimum voting power
                }
            }
        };
        staking::get_staker_amount(movedao_addrx, member)
    }

    #[view]
    public fun total_members(movedao_addrx: address): u64 acquires MemberList {
        if (!exists<MemberList>(movedao_addrx)) {
            return 0
        };
        borrow_global<MemberList>(movedao_addrx).total_members
    }

    #[view]
    public fun total_voting_power(movedao_addrx: address): u64 {
        staking::get_total_staked(movedao_addrx)
    }

    public entry fun update_voting_power(_account: &signer) {
        // No-op since voting power is dynamically calculated
    }

    // Administrative function to remove members who no longer meet stake requirements
    public entry fun remove_inactive_member(
        admin: &signer, 
        movedao_addrx: address, 
        member: address
    ) acquires MemberList, MembershipConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin::is_admin(movedao_addrx, admin_addr), errors::not_admin());
        
        let member_list = borrow_global_mut<MemberList>(movedao_addrx);
        let config = borrow_global<MembershipConfig>(movedao_addrx);
        
        // Verify member exists in list
        assert!(simple_map::contains_key(&member_list.members, &member), errors::not_member());
        
        // Verify member no longer meets minimum stake requirement
        let current_stake = staking::get_staker_amount(movedao_addrx, member);
        assert!(current_stake < config.min_stake_to_join, errors::min_stake_required());
        
        // Remove the member
        simple_map::remove(&mut member_list.members, &member);
        member_list.total_members = member_list.total_members - 1;
        
        event::emit(MemberLeft { member });
    }

    // Administrative function to update minimum stake requirement
    public entry fun update_min_stake(
        admin: &signer,
        movedao_addrx: address,
        new_min_stake: u64
    ) acquires MembershipConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin::is_admin(movedao_addrx, admin_addr), errors::not_admin());
        
        // Validate new minimum stake (reasonable bounds)
        assert!(new_min_stake > 0, errors::invalid_amount());
        assert!(new_min_stake <= 10000000000, errors::invalid_amount()); // Max 10,000 MOVE tokens
        
        let config = borrow_global_mut<MembershipConfig>(movedao_addrx);
        let old_min_stake = config.min_stake_to_join;
        config.min_stake_to_join = new_min_stake;
        
        event::emit(MinStakeUpdated {
            old_min_stake,
            new_min_stake,
            updated_by: admin_addr
        });
    }

    // Administrative function to update minimum proposal creation stake requirement
    public entry fun update_min_proposal_stake(
        admin: &signer,
        movedao_addrx: address,
        new_min_proposal_stake: u64
    ) acquires MembershipConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin::is_admin(movedao_addrx, admin_addr), errors::not_admin());
        
        // Validate new minimum proposal stake (reasonable bounds)
        assert!(new_min_proposal_stake > 0, errors::invalid_amount());
        assert!(new_min_proposal_stake <= 10000000000, errors::invalid_amount()); // Max 10,000 MOVE tokens
        
        let config = borrow_global_mut<MembershipConfig>(movedao_addrx);
        
        // Ensure proposal stake is at least as much as join stake to maintain hierarchy
        assert!(new_min_proposal_stake >= config.min_stake_to_join, errors::invalid_amount());
        
        let old_min_proposal_stake = config.min_stake_to_propose;
        config.min_stake_to_propose = new_min_proposal_stake;
        
        event::emit(MinProposalStakeUpdated {
            old_min_proposal_stake,
            new_min_proposal_stake,
            updated_by: admin_addr
        });
    }

    // Convenient function for admins to set proposal stake as a multiplier of join stake
    public entry fun set_proposal_stake_multiplier(
        admin: &signer,
        movedao_addrx: address,
        multiplier: u64
    ) acquires MembershipConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin::is_admin(movedao_addrx, admin_addr), errors::not_admin());
        
        // Validate multiplier (1x to 100x)
        assert!(multiplier >= 1, errors::invalid_amount());
        assert!(multiplier <= 100, errors::invalid_amount());
        
        let config = borrow_global<MembershipConfig>(movedao_addrx);
        let new_min_proposal_stake = config.min_stake_to_join * multiplier;
        
        // Use the existing update function to ensure all validations
        update_min_proposal_stake(admin, movedao_addrx, new_min_proposal_stake);
    }

    // View function to get current minimum stake requirement
    #[view]
    public fun get_min_stake(movedao_addrx: address): u64 acquires MembershipConfig {
        borrow_global<MembershipConfig>(movedao_addrx).min_stake_to_join
    }

    // View function to get current minimum proposal stake requirement
    #[view]
    public fun get_min_proposal_stake(movedao_addrx: address): u64 acquires MembershipConfig {
        borrow_global<MembershipConfig>(movedao_addrx).min_stake_to_propose
    }

    // Check if membership system is initialized for a DAO
    #[view]
    public fun is_membership_initialized(movedao_addrx: address): bool {
        exists<MembershipConfig>(movedao_addrx) && exists<MemberList>(movedao_addrx)
    }

    // View function to get the current proposal stake multiplier
    #[view]
    public fun get_proposal_stake_multiplier(movedao_addrx: address): u64 acquires MembershipConfig {
        let config = borrow_global<MembershipConfig>(movedao_addrx);
        if (config.min_stake_to_join == 0) return 1;
        config.min_stake_to_propose / config.min_stake_to_join
    }

    // Check if a member can create proposals based on stake requirements
    #[view]
    public fun can_create_proposal(movedao_addrx: address, member: address): bool acquires MemberList, MembershipConfig {
        if (!exists<MemberList>(movedao_addrx)) return false;
        if (!exists<MembershipConfig>(movedao_addrx)) return false;
        
        // Admin bypass: Admins can always create proposals regardless of stake requirements
        if (admin::is_admin(movedao_addrx, member)) return true;
        
        // Must be a member first
        if (!is_member(movedao_addrx, member)) return false;
        
        // Check if member meets proposal creation stake requirement
        let config = borrow_global<MembershipConfig>(movedao_addrx);
        let current_stake = staking::get_staker_amount(movedao_addrx, member);
        current_stake >= config.min_stake_to_propose
    }
}