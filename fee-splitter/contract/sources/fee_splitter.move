module FeeSplitter::FeeSplitter {
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object::Object;
    use aptos_std::math64;
    use std::vector;
    use std::error;
    use std::signer;

    /// Error codes
    const EINVALID_SHARE: u64 = 1;
    const EINVALID_RECIPIENTS: u64 = 2;
    const EINVALID_AMOUNT: u64 = 3;
    const EINSUFFICIENT_BALANCE: u64 = 4;
    const ESPLITTER_NOT_FOUND: u64 = 5;
    const EINVALID_TOTAL_SHARES: u64 = 6;
    
    /// Maximum allowed total shares, could be any number
    const MAX_TOTAL_SHARES: u64 = 10000;

    struct Recipient has copy, drop, store {
        addr: address,
        share: u64, // Share amount (e.g., 30 means 30 parts)
    }

    struct FeeSplitter has key {
        recipients: vector<Recipient>,
        total_shares: u64,
        owner: address,
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
        assert!(vector::length(&addresses) == vector::length(&shares), error::invalid_argument(EINVALID_RECIPIENTS));
        
        let total_shares = 0;
        let recipients = vector::empty<Recipient>();
        
        // Validate shares and calculate total, build recipients vector
        for (i in 0..vector::length(&addresses)) {
            let share = *vector::borrow(&shares, i);
            let addr = *vector::borrow(&addresses, i);
            assert!(share > 0, error::invalid_argument(EINVALID_SHARE));
            
            vector::push_back(&mut recipients, Recipient { addr, share });
            total_shares = total_shares + share;
        };
        
        // Validate total shares doesn't exceed maximum
        assert!(total_shares <= MAX_TOTAL_SHARES, error::invalid_argument(EINVALID_TOTAL_SHARES));
        
        // Create the splitter resource
        let splitter = FeeSplitter {
            recipients,
            total_shares,
            owner: creator_addr,
        };
        
        // Move the splitter to the creator's account
        move_to(creator, splitter);
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
        
        // Check sender has enough balance
        let sender_addr = signer::address_of(sender);
        
        let splitter = borrow_global<FeeSplitter>(splitter_owner);
        let total_shares = splitter.total_shares;
        let recipients = &splitter.recipients;
        
        // Distribute to each recipient based on their share
        for (i in 0..vector::length(recipients)) {
            let recipient = vector::borrow(recipients, i);
            let share_amount = math64::mul_div(amount, recipient.share, total_shares);
            
            // Only transfer if amount is greater than 0
            if (share_amount > 0) {
                primary_fungible_store::transfer(sender, asset_metadata, recipient.addr, share_amount);
            };
        };
    }

    /// Get splitter info - returns recipients and total shares
    #[view]
    public fun get_splitter_info(splitter_address: address): (vector<Recipient>, u64) acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_address), error::not_found(ESPLITTER_NOT_FOUND));
        let splitter = borrow_global<FeeSplitter>(splitter_address);
        (splitter.recipients, splitter.total_shares)
    }

    /// Check if a splitter exists at the given address
    #[view]
    public fun splitter_exists(splitter_address: address): bool {
        exists<FeeSplitter>(splitter_address)
    }

    /// Check if a given address is a recipient in the splitter
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


} 