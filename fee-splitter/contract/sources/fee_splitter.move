module fee_splitter::fee_splitter {
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::primary_fungible_store;
    use cedra_framework::object::Object;
    use cedra_std::math64;
    use std::vector;
    use std::error;
    use std::signer;
    use std::event;

    /// Error codes
    const EINVALID_SHARE: u64 = 1;
    const EINVALID_RECIPIENTS: u64 = 2;
    const EINVALID_AMOUNT: u64 = 3;
    const EINSUFFICIENT_BALANCE: u64 = 4;
    const ESPLITTER_NOT_FOUND: u64 = 5;
    const EINVALID_TOTAL_SHARES: u64 = 6;
    const ENOT_OWNER: u64 = 7;
    const EPAUSED: u64 = 8;
    const EDUPLICATE_RECIPIENT: u64 = 9;
    const EZERO_ADDRESS: u64 = 10;
    const EMAX_RECIPIENTS_EXCEEDED: u64 = 11;
    const EINVALID_RECIPIENT_COUNT: u64 = 12;

    /// Constants
    const MAX_TOTAL_SHARES: u64 = 10000;
    const MAX_RECIPIENTS: u64 = 50;

    struct Recipient has copy, drop, store {
        addr: address,
        share: u64, // Share amount (e.g., 30 means 30 parts)
    }

    struct FeeSplitter has key {
        recipients: vector<Recipient>,
        total_shares: u64,
        owner: address,
        paused: bool,
        created_at: u64,
        total_distributed: u64,
    }

    /// Events
    struct SplitterCreated has drop, store {
        owner: address,
        recipients: vector<Recipient>,
        total_shares: u64,
    }

    struct FeesDistributed has drop, store {
        splitter_owner: address,
        asset_metadata: Object<Metadata>,
        total_amount: u64,
        recipient_amounts: vector<u64>,
    }

    struct SplitterUpdated has drop, store {
        owner: address,
        old_recipients: vector<Recipient>,
        new_recipients: vector<Recipient>,
        old_total_shares: u64,
        new_total_shares: u64,
    }

    struct OwnershipTransferred has drop, store {
        old_owner: address,
        new_owner: address,
    }

    struct SplitterPaused has drop, store {
        owner: address,
        paused: bool,
    }

    /// Create a new fee splitter with specified recipients and their shares
    public entry fun create_splitter(
        creator: &signer,
        addresses: vector<address>,
        shares: vector<u64>,
    ) {
        let creator_addr = signer::address_of(creator);

        // Validate inputs
        assert!(!vector::is_empty(&addresses), error::invalid_argument(EINVALID_RECIPIENTS));
        assert!(!vector::is_empty(&shares), error::invalid_argument(EINVALID_RECIPIENTS));
        assert!(vector::length(&addresses) == vector::length(&shares), error::invalid_argument(EINVALID_RECIPIENT_COUNT));
        assert!(vector::length(&addresses) <= MAX_RECIPIENTS, error::invalid_argument(EMAX_RECIPIENTS_EXCEEDED));

        let total_shares = 0;
        let recipients = vector::empty<Recipient>();
        let seen_addresses = vector::empty<address>();

        // Validate shares and calculate total, build recipients vector
        for (i in 0..vector::length(&addresses)) {
            let share = *vector::borrow(&shares, i);
            let addr = *vector::borrow(&addresses, i);

            // Validate address is not zero
            assert!(addr != @0x0, error::invalid_argument(EZERO_ADDRESS));
            // Validate share is positive
            assert!(share > 0, error::invalid_argument(EINVALID_SHARE));
            // Check for duplicates
            assert!(!vector::contains(&seen_addresses, &addr), error::invalid_argument(EDUPLICATE_RECIPIENT));

            vector::push_back(&mut recipients, Recipient { addr, share });
            vector::push_back(&mut seen_addresses, addr);
            total_shares = total_shares + share;
        };

        // Validate total shares doesn't exceed maximum
        assert!(total_shares <= MAX_TOTAL_SHARES, error::invalid_argument(EINVALID_TOTAL_SHARES));

        // Create the splitter resource
        let splitter = FeeSplitter {
            recipients,
            total_shares,
            owner: creator_addr,
            paused: false,
            created_at: 0, // TODO: Add timestamp when available
            total_distributed: 0,
        };

        // Move the splitter to the creator's account
        move_to(creator, splitter);

        // Emit creation event
        event::emit(SplitterCreated {
            owner: creator_addr,
            recipients,
            total_shares,
        });
    }

    /// Distribute fees from sender to recipients according to their shares
    public entry fun distribute_fees(
        sender: &signer,
        splitter_owner: address,
        asset_metadata: Object<Metadata>,
        amount: u64,
    ) acquires FeeSplitter {
        // Check if splitter exists
        assert!(exists<FeeSplitter>(splitter_owner), error::not_found(ESPLITTER_NOT_FOUND));
        assert!(amount > 0, error::invalid_argument(EINVALID_AMOUNT));

        let splitter = borrow_global_mut<FeeSplitter>(splitter_owner);

        // Check if splitter is paused
        assert!(!splitter.paused, error::invalid_state(EPAUSED));

        let total_shares = splitter.total_shares;
        let recipients = &splitter.recipients;
        let recipient_amounts = vector::empty<u64>();

        // Calculate and collect all recipient amounts first (better gas efficiency)
        for (i in 0..vector::length(recipients)) {
            let recipient = vector::borrow(recipients, i);
            let share_amount = math64::mul_div(amount, recipient.share, total_shares);
            vector::push_back(&mut recipient_amounts, share_amount);
        };

        // Now perform the transfers
        for (i in 0..vector::length(recipients)) {
            let recipient = vector::borrow(recipients, i);
            let share_amount = *vector::borrow(&recipient_amounts, i);

            // Only transfer if amount is greater than 0
            if (share_amount > 0) {
                primary_fungible_store::transfer(sender, asset_metadata, recipient.addr, share_amount);
            };
        };

        // Update total distributed
        splitter.total_distributed = splitter.total_distributed + amount;

        // Emit distribution event
        event::emit(FeesDistributed {
            splitter_owner,
            asset_metadata,
            total_amount: amount,
            recipient_amounts,
        });
    }

    #[view]
    public fun get_splitter_info(splitter_address: address): (vector<Recipient>, u64) acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_address), error::not_found(ESPLITTER_NOT_FOUND));
        let splitter = borrow_global<FeeSplitter>(splitter_address);
        (splitter.recipients, splitter.total_shares)
    }

    #[view]
    public fun get_splitter_details(splitter_address: address): (vector<Recipient>, u64, address, bool, u64, u64) acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_address), error::not_found(ESPLITTER_NOT_FOUND));
        let splitter = borrow_global<FeeSplitter>(splitter_address);
        (
            splitter.recipients,
            splitter.total_shares,
            splitter.owner,
            splitter.paused,
            splitter.created_at,
            splitter.total_distributed
        )
    }

    #[view]
    public fun splitter_exists(splitter_address: address): bool {
        exists<FeeSplitter>(splitter_address)
    }

    #[view]
    public fun is_recipient(splitter_address: address, recipient_address: address): bool acquires FeeSplitter {
        if (!exists<FeeSplitter>(splitter_address)) {
            return false
        };

        let splitter = borrow_global<FeeSplitter>(splitter_address);
        let recipients = &splitter.recipients;

        for (i in 0..vector::length(recipients)) {
            let recipient = vector::borrow(recipients, i);
            if (recipient.addr == recipient_address) {
                return true
            };
        };

        false
    }

    /// Update splitter recipients and shares (owner only)
    public entry fun update_splitter(
        owner: &signer,
        addresses: vector<address>,
        shares: vector<u64>,
    ) acquires FeeSplitter {
        let owner_addr = signer::address_of(owner);
        assert!(exists<FeeSplitter>(owner_addr), error::not_found(ESPLITTER_NOT_FOUND));

        let splitter = borrow_global_mut<FeeSplitter>(owner_addr);
        assert!(splitter.owner == owner_addr, error::permission_denied(ENOT_OWNER));

        // Validate inputs
        assert!(!vector::is_empty(&addresses), error::invalid_argument(EINVALID_RECIPIENTS));
        assert!(!vector::is_empty(&shares), error::invalid_argument(EINVALID_RECIPIENTS));
        assert!(vector::length(&addresses) == vector::length(&shares), error::invalid_argument(EINVALID_RECIPIENT_COUNT));
        assert!(vector::length(&addresses) <= MAX_RECIPIENTS, error::invalid_argument(EMAX_RECIPIENTS_EXCEEDED));

        let total_shares = 0;
        let new_recipients = vector::empty<Recipient>();
        let seen_addresses = vector::empty<address>();

        // Validate shares and calculate total, build recipients vector
        for (i in 0..vector::length(&addresses)) {
            let share = *vector::borrow(&shares, i);
            let addr = *vector::borrow(&addresses, i);

            // Validate address is not zero
            assert!(addr != @0x0, error::invalid_argument(EZERO_ADDRESS));
            // Validate share is positive
            assert!(share > 0, error::invalid_argument(EINVALID_SHARE));
            // Check for duplicates
            assert!(!vector::contains(&seen_addresses, &addr), error::invalid_argument(EDUPLICATE_RECIPIENT));

            vector::push_back(&mut new_recipients, Recipient { addr, share });
            vector::push_back(&mut seen_addresses, addr);
            total_shares = total_shares + share;
        };

        // Validate total shares doesn't exceed maximum
        assert!(total_shares <= MAX_TOTAL_SHARES, error::invalid_argument(EINVALID_TOTAL_SHARES));

        // Store old values for event
        let old_recipients = splitter.recipients;
        let old_total_shares = splitter.total_shares;

        // Update splitter
        splitter.recipients = new_recipients;
        splitter.total_shares = total_shares;

        // Emit update event
        event::emit(SplitterUpdated {
            owner: owner_addr,
            old_recipients,
            new_recipients,
            old_total_shares,
            new_total_shares: total_shares,
        });
    }

    /// Pause or unpause the splitter (owner only)
    public entry fun set_paused(owner: &signer, paused: bool) acquires FeeSplitter {
        let owner_addr = signer::address_of(owner);
        assert!(exists<FeeSplitter>(owner_addr), error::not_found(ESPLITTER_NOT_FOUND));

        let splitter = borrow_global_mut<FeeSplitter>(owner_addr);
        assert!(splitter.owner == owner_addr, error::permission_denied(ENOT_OWNER));

        splitter.paused = paused;

        // Emit pause event
        event::emit(SplitterPaused {
            owner: owner_addr,
            paused,
        });
    }

    /// Transfer ownership of the splitter
    public entry fun transfer_ownership(owner: &signer, new_owner: address) acquires FeeSplitter {
        let owner_addr = signer::address_of(owner);
        assert!(exists<FeeSplitter>(owner_addr), error::not_found(ESPLITTER_NOT_FOUND));
        assert!(new_owner != @0x0, error::invalid_argument(EZERO_ADDRESS));

        let splitter = borrow_global_mut<FeeSplitter>(owner_addr);
        assert!(splitter.owner == owner_addr, error::permission_denied(ENOT_OWNER));

        let old_owner = splitter.owner;
        splitter.owner = new_owner;

        // Emit ownership transfer event
        event::emit(OwnershipTransferred {
            old_owner,
            new_owner,
        });
    }

    /// Delete the splitter (owner only, only if no distributions have occurred)
    public entry fun delete_splitter(owner: &signer) acquires FeeSplitter {
        let owner_addr = signer::address_of(owner);
        assert!(exists<FeeSplitter>(owner_addr), error::not_found(ESPLITTER_NOT_FOUND));

        let splitter = borrow_global<FeeSplitter>(owner_addr);
        assert!(splitter.owner == owner_addr, error::permission_denied(ENOT_OWNER));
        assert!(splitter.total_distributed == 0, error::invalid_state(1)); // Cannot delete if distributions have occurred

        let FeeSplitter {
            recipients: _,
            total_shares: _,
            owner: _,
            paused: _,
            created_at: _,
            total_distributed: _,
        } = move_from<FeeSplitter>(owner_addr);
    } 