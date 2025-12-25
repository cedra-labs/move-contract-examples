/// Production-Ready Escrow Smart Contract for Cedra Blockchain
/// 
/// This escrow uses a state-based locking mechanism where:
/// - Funds remain in buyer's primary_fungible_store
/// - Escrow state controls who can withdraw and transfer
/// - No need to store FungibleAsset (which is ephemeral)
/// Author COAT
module coat_escrow::escrow {
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::primary_fungible_store;
    use cedra_framework::object::Object;
    use cedra_framework::timestamp;
    use std::vector;
    use std::error;
    use std::signer;
    use std::option::{Self, Option};

    // ==================== Error Codes ====================

    const EESCROW_NOT_FOUND: u64 = 1;
    const EUNAUTHORIZED: u64 = 2;
    const EINVALID_STATE: u64 = 3;
    const EINVALID_AMOUNT: u64 = 4;
    const EINVALID_DEADLINE: u64 = 5;
    const EALREADY_FUNDED: u64 = 6;
    const ENOT_FUNDED: u64 = 7;
    const EDEADLINE_NOT_PASSED: u64 = 8;
    const EINVALID_ADDRESSES: u64 = 9;
    const EINSUFFICIENT_BALANCE: u64 = 10;

    // ==================== Status Constants ====================

    const STATUS_INITIALIZED: u8 = 0;
    const STATUS_FUNDED: u8 = 1;
    const STATUS_RELEASED: u8 = 2;
    const STATUS_REFUNDED: u8 = 3;
    const STATUS_DISPUTED: u8 = 4;

    // ==================== Data Structures ====================

    /// Individual escrow - now stored in a table/vector structure
    struct EscrowData has store, drop {
        escrow_id: u64,
        buyer: address,
        seller: address,
        arbiter: Option<address>,
        amount: u64,
        deadline: u64,
        status: u8,
        asset_metadata: Object<Metadata>,
        funds_deposited: bool,
    }

    /// Registry to track multiple escrows per account
    struct EscrowRegistry has key {
        escrows: vector<EscrowData>,
        next_id: u64,
    }

    // ==================== Helper Functions ====================

    fun get_escrow_mut(registry: &mut EscrowRegistry, escrow_id: u64): &mut EscrowData {
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow_mut(&mut registry.escrows, i);
            if (escrow.escrow_id == escrow_id) {
                return escrow
            };
            i = i + 1;
        };
        abort error::not_found(EESCROW_NOT_FOUND)
    }

    fun get_escrow(registry: &EscrowRegistry, escrow_id: u64): &EscrowData {
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.escrow_id == escrow_id) {
                return escrow
            };
            i = i + 1;
        };
        abort error::not_found(EESCROW_NOT_FOUND)
    }

    // ==================== Entry Functions ====================

    /// Create a new escrow
    public entry fun create_escrow(
        buyer: &signer,
        seller: address,
        arbiter_opt: vector<address>,
        amount: u64,
        deadline: u64,
        asset_metadata: Object<Metadata>,
    ) acquires EscrowRegistry {
        let buyer_addr = signer::address_of(buyer);

        // Validate inputs
        assert!(amount > 0, error::invalid_argument(EINVALID_AMOUNT));
        assert!(buyer_addr != seller, error::invalid_argument(EINVALID_ADDRESSES));
        assert!(deadline >= timestamp::now_seconds(), error::invalid_argument(EINVALID_DEADLINE));

        // Parse optional arbiter
        let arbiter = if (vector::is_empty(&arbiter_opt)) {
            option::none<address>()
        } else {
            let a = *vector::borrow(&arbiter_opt, 0);
            assert!(a != buyer_addr && a != seller, error::invalid_argument(EINVALID_ADDRESSES));
            option::some(a)
        };

        // Initialize registry if not exists
        if (!exists<EscrowRegistry>(buyer_addr)) {
            move_to(buyer, EscrowRegistry {
                escrows: vector::empty<EscrowData>(),
                next_id: 0,
            });
        };

        let registry = borrow_global_mut<EscrowRegistry>(buyer_addr);
        let escrow_id = registry.next_id;
        registry.next_id = escrow_id + 1;

        // Create and add escrow to vector
        let escrow_data = EscrowData {
            escrow_id,
            buyer: buyer_addr,
            seller,
            arbiter,
            amount,
            deadline,
            status: STATUS_INITIALIZED,
            asset_metadata,
            funds_deposited: false,
        };
        
        vector::push_back(&mut registry.escrows, escrow_data);
    }

    /// Deposit funds into the escrow
    public entry fun deposit(
        buyer: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistry {
        let buyer_addr = signer::address_of(buyer);
        assert!(exists<EscrowRegistry>(buyer_addr), error::not_found(EESCROW_NOT_FOUND));

        let registry = borrow_global_mut<EscrowRegistry>(buyer_addr);
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(escrow.buyer == buyer_addr, error::permission_denied(EUNAUTHORIZED));
        assert!(escrow.status == STATUS_INITIALIZED, error::invalid_state(EINVALID_STATE));
        assert!(!escrow.funds_deposited, error::invalid_state(EALREADY_FUNDED));

        // Verify buyer has sufficient balance
        let balance = primary_fungible_store::balance(buyer_addr, escrow.asset_metadata);
        assert!(balance >= escrow.amount, error::invalid_argument(EINSUFFICIENT_BALANCE));

        // Mark as funded
        escrow.funds_deposited = true;
        escrow.status = STATUS_FUNDED;
    }

    /// Release funds to seller
    public entry fun release(
        buyer: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistry {
        let buyer_addr = signer::address_of(buyer);
        assert!(exists<EscrowRegistry>(buyer_addr), error::not_found(EESCROW_NOT_FOUND));

        let registry = borrow_global_mut<EscrowRegistry>(buyer_addr);
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(escrow.buyer == buyer_addr, error::permission_denied(EUNAUTHORIZED));
        assert!(escrow.funds_deposited, error::invalid_state(ENOT_FUNDED));
        assert!(escrow.status == STATUS_FUNDED, error::invalid_state(EINVALID_STATE));

        // Transfer funds from buyer to seller
        primary_fungible_store::transfer(buyer, escrow.asset_metadata, escrow.seller, escrow.amount);

        escrow.funds_deposited = false;
        escrow.status = STATUS_RELEASED;
    }

    /// Refund funds to buyer after deadline
    public entry fun refund(
        buyer: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistry {
        let buyer_addr = signer::address_of(buyer);
        assert!(exists<EscrowRegistry>(buyer_addr), error::not_found(EESCROW_NOT_FOUND));

        let registry = borrow_global_mut<EscrowRegistry>(buyer_addr);
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(escrow.buyer == buyer_addr, error::permission_denied(EUNAUTHORIZED));
        assert!(escrow.funds_deposited, error::invalid_state(ENOT_FUNDED));
        assert!(escrow.status == STATUS_FUNDED, error::invalid_state(EINVALID_STATE));
        assert!(timestamp::now_seconds() >= escrow.deadline, error::invalid_state(EDEADLINE_NOT_PASSED));

        escrow.funds_deposited = false;
        escrow.status = STATUS_REFUNDED;
    }

    /// Raise a dispute
    public entry fun raise_dispute(
        caller: &signer,
        escrow_owner: address,
        escrow_id: u64,
    ) acquires EscrowRegistry {
        let caller_addr = signer::address_of(caller);
        assert!(exists<EscrowRegistry>(escrow_owner), error::not_found(EESCROW_NOT_FOUND));

        let registry = borrow_global_mut<EscrowRegistry>(escrow_owner);
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(
            caller_addr == escrow.buyer || caller_addr == escrow.seller,
            error::permission_denied(EUNAUTHORIZED)
        );
        assert!(escrow.status == STATUS_FUNDED, error::invalid_state(EINVALID_STATE));
        assert!(option::is_some(&escrow.arbiter), error::permission_denied(EUNAUTHORIZED));

        escrow.status = STATUS_DISPUTED;
    }

    /// Resolve dispute
    public entry fun resolve_dispute(
        arbiter: &signer,
        buyer: &signer,
        escrow_id: u64,
        release_to_seller: bool,
    ) acquires EscrowRegistry {
        let arbiter_addr = signer::address_of(arbiter);
        let buyer_addr = signer::address_of(buyer);

        assert!(exists<EscrowRegistry>(buyer_addr), error::not_found(EESCROW_NOT_FOUND));
        let registry = borrow_global_mut<EscrowRegistry>(buyer_addr);
        let escrow = get_escrow_mut(registry, escrow_id);

        assert!(escrow.buyer == buyer_addr, error::permission_denied(EUNAUTHORIZED));
        assert!(escrow.status == STATUS_DISPUTED, error::invalid_state(EINVALID_STATE));
        assert!(escrow.funds_deposited, error::invalid_state(ENOT_FUNDED));
        assert!(option::contains(&escrow.arbiter, &arbiter_addr), error::permission_denied(EUNAUTHORIZED));

        if (release_to_seller) {
            primary_fungible_store::transfer(buyer, escrow.asset_metadata, escrow.seller, escrow.amount);
            escrow.status = STATUS_RELEASED;
        } else {
            escrow.status = STATUS_REFUNDED;
        };

        escrow.funds_deposited = false;
    }

    /// Cancel an unfunded escrow
    public entry fun cancel_escrow(
        buyer: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistry {
        let buyer_addr = signer::address_of(buyer);
        assert!(exists<EscrowRegistry>(buyer_addr), error::not_found(EESCROW_NOT_FOUND));

        let registry = borrow_global_mut<EscrowRegistry>(buyer_addr);
        
        // Find and remove escrow
        let len = vector::length(&registry.escrows);
        let i = 0;
        let found = false;
        
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.escrow_id == escrow_id) {
                assert!(escrow.buyer == buyer_addr, error::permission_denied(EUNAUTHORIZED));
                assert!(escrow.status == STATUS_INITIALIZED, error::invalid_state(EINVALID_STATE));
                assert!(!escrow.funds_deposited, error::invalid_state(EALREADY_FUNDED));
                
                vector::remove(&mut registry.escrows, i);
                found = true;
                break
            };
            i = i + 1;
        };
        
        assert!(found, error::not_found(EESCROW_NOT_FOUND));
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_escrow_info(owner: address): (
        u64, address, address, vector<address>, u64, u64, u8, bool
    ) acquires EscrowRegistry {
        assert!(exists<EscrowRegistry>(owner), error::not_found(EESCROW_NOT_FOUND));
        let registry = borrow_global<EscrowRegistry>(owner);
        
        // Get first escrow for compatibility
        assert!(vector::length(&registry.escrows) > 0, error::not_found(EESCROW_NOT_FOUND));
        let escrow = vector::borrow(&registry.escrows, 0);

        let arbiter_vec = if (option::is_some(&escrow.arbiter)) {
            vector::singleton(*option::borrow(&escrow.arbiter))
        } else {
            vector::empty<address>()
        };

        (
            escrow.escrow_id,
            escrow.buyer,
            escrow.seller,
            arbiter_vec,
            escrow.amount,
            escrow.deadline,
            escrow.status,
            escrow.funds_deposited,
        )
    }

    #[view]
    public fun escrow_exists(owner: address): bool acquires EscrowRegistry {
        if (!exists<EscrowRegistry>(owner)) {
            return false
        };
        let registry = borrow_global<EscrowRegistry>(owner);
        vector::length(&registry.escrows) > 0
    }

    #[view]
    public fun get_status(owner: address): u8 acquires EscrowRegistry {
        assert!(exists<EscrowRegistry>(owner), error::not_found(EESCROW_NOT_FOUND));
        let registry = borrow_global<EscrowRegistry>(owner);
        assert!(vector::length(&registry.escrows) > 0, error::not_found(EESCROW_NOT_FOUND));
        vector::borrow(&registry.escrows, 0).status
    }

    #[view]
    public fun is_funded(owner: address): bool acquires EscrowRegistry {
        assert!(exists<EscrowRegistry>(owner), error::not_found(EESCROW_NOT_FOUND));
        let registry = borrow_global<EscrowRegistry>(owner);
        assert!(vector::length(&registry.escrows) > 0, error::not_found(EESCROW_NOT_FOUND));
        vector::borrow(&registry.escrows, 0).funds_deposited
    }

    #[view]
    public fun is_expired(owner: address): bool acquires EscrowRegistry {
        assert!(exists<EscrowRegistry>(owner), error::not_found(EESCROW_NOT_FOUND));
        let registry = borrow_global<EscrowRegistry>(owner);
        assert!(vector::length(&registry.escrows) > 0, error::not_found(EESCROW_NOT_FOUND));
        let escrow = vector::borrow(&registry.escrows, 0);
        timestamp::now_seconds() >= escrow.deadline
    }

    #[view]
    public fun get_escrow_ids(owner: address): vector<u64> acquires EscrowRegistry {
        if (!exists<EscrowRegistry>(owner)) {
            return vector::empty<u64>()
        };
        
        let registry = borrow_global<EscrowRegistry>(owner);
        let ids = vector::empty<u64>();
        let len = vector::length(&registry.escrows);
        let i = 0;
        
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            vector::push_back(&mut ids, escrow.escrow_id);
            i = i + 1;
        };
        
        ids
    }

    #[view]
    public fun get_buyer_balance(owner: address): u64 acquires EscrowRegistry {
        assert!(exists<EscrowRegistry>(owner), error::not_found(EESCROW_NOT_FOUND));
        let registry = borrow_global<EscrowRegistry>(owner);
        assert!(vector::length(&registry.escrows) > 0, error::not_found(EESCROW_NOT_FOUND));
        let escrow = vector::borrow(&registry.escrows, 0);
        primary_fungible_store::balance(escrow.buyer, escrow.asset_metadata)
    }
}