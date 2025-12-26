/// # English Auction Contract
/// An ascending price auction for NFTs where bidders compete and the highest bidder wins
module module_addr::english_auction {
    use std::signer;
    use std::error;
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::primary_fungible_store;
    use cedra_token_objects::token::Token;
    use cedra_std::table::{Self, Table};

    // ========== Error Codes ==========
    
    /// Auction system has not been initialized
    const E_NOT_INITIALIZED: u64 = 1;
    /// Auction with the given ID does not exist
    const E_AUCTION_NOT_FOUND: u64 = 2;
    /// Auction has already been finalized (completed or cancelled)
    const E_AUCTION_ALREADY_FINALIZED: u64 = 3;
    /// Caller is not the seller of this auction
    const E_NOT_SELLER: u64 = 4;
    /// Invalid price parameters (reserve price must be greater than zero)
    const E_INVALID_PRICE: u64 = 5;
    /// Bid amount is lower than the current highest bid or reserve price
    const E_BID_TOO_LOW: u64 = 6;
    /// Auction duration must be greater than zero
    const E_INVALID_DURATION: u64 = 7;
    /// Auction has not ended yet (cannot finalize before end time)
    const E_AUCTION_NOT_ENDED: u64 = 8;
    /// Auction has no bids to finalize
    const E_NO_BIDS: u64 = 9;
    /// Caller is not the bidder who placed this bid
    const E_NOT_BIDDER: u64 = 10;
    /// Bid has already been refunded
    const E_ALREADY_REFUNDED: u64 = 11;

    // ========== Constants ==========
    
    const TIME_EXTENSION_SECONDS: u64 = 300; // 5 minutes in seconds

    // ========== Data Structures ==========
    
    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Auction object that holds the NFT - stored at its own address
    struct AuctionObject has key {
        auction_id: u64,
        seller: address,
        nft: Object<Token>,
        starting_price: u64,
        current_highest_bid: u64,
        current_highest_bidder: address,
        start_time: u64,
        duration: u64,
        end_time: u64,
        payment_token: Object<Metadata>,
        is_finalized: bool,
        extend_ref: ExtendRef,  // Used to generate signer for NFT transfers
    }

    /// Global state tracking all auctions
    struct AuctionState has key {
        next_auction_id: u64,
        auction_objects: Table<u64, Object<AuctionObject>>,
    }

    // ========== Events ==========
    
    #[event]
    struct AuctionCreated has drop, store {
        auction_id: u64,
        auction_object: Object<AuctionObject>,
        seller: address,
        nft: Object<Token>,
        starting_price: u64,
        duration: u64,
        start_time: u64,
        end_time: u64,
    }

    #[event]
    struct BidPlaced has drop, store {
        auction_id: u64,
        bidder: address,
        amount: u64,
        previous_bidder: address,
        previous_bid: u64,
        new_end_time: u64,
        time_extended: bool,
    }

    #[event]
    struct AuctionFinalized has drop, store {
        auction_id: u64,
        winner: address,
        seller: address,
        nft: Object<Token>,
        final_price: u64,
        timestamp: u64,
    }

    #[event]
    struct AuctionCancelled has drop, store {
        auction_id: u64,
        seller: address,
        nft: Object<Token>,
    }

    #[event]
    struct RefundClaimed has drop, store {
        auction_id: u64,
        bidder: address,
        amount: u64,
    }

    // ========== Initialization ==========
    
    fun init_module(admin: &signer) {
        move_to(admin, AuctionState {
            next_auction_id: 1,
            auction_objects: table::new(),
        });
    }

    // ========== Public Entry Functions ==========
    
    /// Create a new English auction for an NFT
    public entry fun create_auction(
        seller: &signer,
        nft: Object<Token>,
        starting_price: u64,
        duration: u64,
        payment_token: Object<Metadata>,
    ) acquires AuctionState {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(starting_price > 0, error::invalid_argument(E_INVALID_PRICE));
        assert!(duration > 0, error::invalid_argument(E_INVALID_DURATION));

        let seller_addr = signer::address_of(seller);
        let state = borrow_global_mut<AuctionState>(@module_addr);
        let auction_id = state.next_auction_id;
        let start_time = timestamp::now_seconds();
        let end_time = start_time + duration;

        // Create a new auction object to hold the NFT
        let constructor_ref = object::create_object(@module_addr);
        let auction_object_signer = object::generate_signer(&constructor_ref);
        let auction_object_addr = object::address_from_constructor_ref(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);

        // Transfer NFT to the auction object address
        object::transfer(seller, nft, auction_object_addr);

        // Store auction data in the auction object
        move_to(&auction_object_signer, AuctionObject {
            auction_id,
            seller: seller_addr,
            nft,
            starting_price,
            current_highest_bid: 0,
            current_highest_bidder: @0x0,
            start_time,
            duration,
            end_time,
            payment_token,
            is_finalized: false,
            extend_ref,
        });

        let auction_object = object::object_from_constructor_ref(&constructor_ref);

        // Track the auction object in global state
        table::add(&mut state.auction_objects, auction_id, auction_object);
        state.next_auction_id = auction_id + 1;

        event::emit(AuctionCreated {
            auction_id,
            auction_object,
            seller: seller_addr,
            nft,
            starting_price,
            duration,
            start_time,
            end_time,
        });
    }

    /// Place a bid on the auction
    /// Automatically refunds the previous highest bidder if any
    /// Extends auction time by 5 minutes if bid is placed in last 5 minutes
    public entry fun place_bid(
        bidder: &signer,
        auction_id: u64,
        amount: u64,
    ) acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global_mut<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));

        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global_mut<AuctionObject>(auction_object_addr);
        
        assert!(!auction.is_finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        
        let now = timestamp::now_seconds();
        assert!(now < auction.end_time, error::invalid_state(E_AUCTION_NOT_ENDED));

        let bidder_addr = signer::address_of(bidder);
        let min_bid = if (auction.current_highest_bid == 0) {
            auction.starting_price
        } else {
            auction.current_highest_bid + 1
        };
        
        assert!(amount >= min_bid, error::invalid_argument(E_BID_TOO_LOW));

        let previous_bidder = auction.current_highest_bidder;
        let previous_bid = auction.current_highest_bid;

        // Transfer payment from bidder to auction (stored in auction object address)
        primary_fungible_store::transfer(bidder, auction.payment_token, auction_object_addr, amount);

        // Automatically refund previous highest bidder if any
        if (previous_bid > 0 && previous_bidder != @0x0) {
            // Generate signer from ExtendRef to transfer funds
            let auction_obj_signer = object::generate_signer_for_extending(&auction.extend_ref);
            // Immediately refund the previous bidder
            primary_fungible_store::transfer(&auction_obj_signer, auction.payment_token, previous_bidder, previous_bid);
        };

        // Update highest bid
        auction.current_highest_bid = amount;
        auction.current_highest_bidder = bidder_addr;

        // Check if we need to extend the auction time (anti-sniping)
        let time_remaining = auction.end_time - now;
        let time_extended = if (time_remaining <= TIME_EXTENSION_SECONDS) {
            auction.end_time = now + TIME_EXTENSION_SECONDS;
            true
        } else {
            false
        };

        event::emit(BidPlaced {
            auction_id,
            bidder: bidder_addr,
            amount,
            previous_bidder,
            previous_bid,
            new_end_time: auction.end_time,
            time_extended,
        });
    }

    /// Finalize the auction and transfer NFT to winner and payment to seller
    public entry fun finalize_auction(
        auction_id: u64,
    ) acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global_mut<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));

        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global_mut<AuctionObject>(auction_object_addr);
        
        assert!(!auction.is_finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        
        let now = timestamp::now_seconds();
        assert!(now >= auction.end_time, error::invalid_state(E_AUCTION_NOT_ENDED));
        assert!(auction.current_highest_bid > 0, error::invalid_state(E_NO_BIDS));

        let winner = auction.current_highest_bidder;
        let final_price = auction.current_highest_bid;
        let seller_addr = auction.seller;
        let nft = auction.nft;
        
        auction.is_finalized = true;

        // Generate signer from ExtendRef to transfer funds
        let auction_obj_signer = object::generate_signer_for_extending(&auction.extend_ref);
        
        // Transfer payment from auction object to seller
        primary_fungible_store::transfer(&auction_obj_signer, auction.payment_token, seller_addr, final_price);

        // Transfer NFT to winner (using the same signer)
        object::transfer(&auction_obj_signer, nft, winner);

        event::emit(AuctionFinalized {
            auction_id,
            winner,
            seller: seller_addr,
            nft,
            final_price,
            timestamp: now,
        });
    }

    /// Cancel auction and return NFT to seller (only if no bids)
    public entry fun cancel_auction(
        seller: &signer,
        auction_id: u64,
    ) acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global_mut<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));

        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global_mut<AuctionObject>(auction_object_addr);
        
        let seller_addr = signer::address_of(seller);
        assert!(auction.seller == seller_addr, error::permission_denied(E_NOT_SELLER));
        assert!(!auction.is_finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        assert!(auction.current_highest_bid == 0, error::invalid_state(E_NO_BIDS));

        // Return NFT to seller
        let nft = auction.nft;
        
        // Generate signer from ExtendRef to transfer the NFT back
        let auction_obj_signer = object::generate_signer_for_extending(&auction.extend_ref);
        
        auction.is_finalized = true; // Mark as finalized to prevent further operations

        // Transfer NFT back to seller
        object::transfer(&auction_obj_signer, nft, seller_addr);

        event::emit(AuctionCancelled {
            auction_id,
            seller: seller_addr,
            nft,
        });
    }

    // ========== View Functions ==========
    
    #[view]
    /// Get current highest bid
    public fun get_current_bid(auction_id: u64): u64 acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));
        
        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global<AuctionObject>(auction_object_addr);
        auction.current_highest_bid
    }

    #[view]
    /// Check if auction exists
    public fun auction_exists(auction_id: u64): bool acquires AuctionState {
        if (!exists<AuctionState>(@module_addr)) return false;
        let state = borrow_global<AuctionState>(@module_addr);
        table::contains(&state.auction_objects, auction_id)
    }

    #[view]
    /// Get auction details
    public fun get_auction_info(auction_id: u64): (address, Object<Token>, u64, u64, address, u64, u64, u64, bool) 
    acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));
        
        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global<AuctionObject>(auction_object_addr);
        (
            auction.seller,
            auction.nft,
            auction.starting_price,
            auction.current_highest_bid,
            auction.current_highest_bidder,
            auction.start_time,
            auction.end_time,
            auction.duration,
            auction.is_finalized,
        )
    }

    // ========== Test-only Functions ==========
    
    #[test_only]
    public fun init_for_test(admin: &signer) {
        if (!exists<AuctionState>(@module_addr)) {
            move_to(admin, AuctionState {
                next_auction_id: 1,
                auction_objects: table::new(),
            });
        };
    }
}

