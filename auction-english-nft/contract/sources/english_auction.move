/// English Auction for NFTs - Price increases with each bid, highest bidder wins
/// Features:
/// - Multiple bidders can place bids
/// - Automatic refund to previous highest bidder when outbid
/// - Time extension if bid placed in last 5 minutes (anti-sniping)
/// - Finalize auction to transfer NFT to winner
/// - Claim refund for losing bidders
module AuctionEnglishNFT::EnglishAuction {
    use std::signer;
    use std::error;
    use std::table::{Self, Table};
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::event;
    use cedra_framework::account;
    use cedra_framework::timestamp;
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::dispatchable_fungible_asset;
    use cedra_token_objects::token;

    /// Error codes
    const E_AUCTION_NOT_FOUND: u64 = 1;
    const E_NOT_SELLER: u64 = 2;
    const E_AUCTION_ALREADY_FINALIZED: u64 = 3;
    const E_AUCTION_NOT_EXPIRED: u64 = 4;
    const E_AUCTION_EXPIRED: u64 = 4; // Same as NOT_EXPIRED but for different context
    const E_INSUFFICIENT_BID: u64 = 5;
    const E_INVALID_PRICE: u64 = 6;
    const E_INVALID_DURATION: u64 = 7;
    const E_NOT_NFT_OWNER: u64 = 8;
    const E_NO_BIDS: u64 = 9;
    const E_NOT_BIDDER: u64 = 10;
    const E_ALREADY_CLAIMED: u64 = 11;
    const E_TIME_EXTENSION_SECONDS: u64 = 300; // 5 minutes

    /// Auction state
    struct Auction has key {
        id: u64,
        nft: Object<token::Token>,
        seller: address,
        starting_price: u64,
        end_time: u64,
        duration: u64,
        highest_bidder: address,
        highest_bid: u64,
        finalized: bool,
        payment_asset: Object<Metadata>,
        extend_ref: ExtendRef,
        refunds: Table<address, u64>, // Track refunds for bidders
        bid_events: event::EventHandle<BidEvent>,
        finalize_events: event::EventHandle<FinalizeEvent>,
    }

    /// Global auction counter
    struct AuctionState has key {
        next_auction_id: u64,
    }

    /// Bid event
    struct BidEvent has drop, store {
        auction_id: u64,
        bidder: address,
        amount: u64,
        previous_bidder: address,
        previous_amount: u64,
        new_end_time: u64,
    }

    /// Finalize event
    struct FinalizeEvent has drop, store {
        auction_id: u64,
        winner: address,
        final_price: u64,
        seller: address,
        nft: address,
    }

    /// Initialize the auction module
    fun init_module(admin: &signer) {
        move_to(admin, AuctionState {
            next_auction_id: 0,
        });
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        init_module(admin);
    }

    /// Create a new English auction
    /// @param nft: The NFT token to auction
    /// @param starting_price: Minimum starting price
    /// @param duration: Auction duration in seconds
    /// @param payment_asset: The fungible asset used for payment
    public entry fun create_auction(
        seller: &signer,
        nft: Object<token::Token>,
        starting_price: u64,
        duration: u64,
        payment_asset: Object<Metadata>,
    ) acquires AuctionState {
        let seller_addr = signer::address_of(seller);
        
        // Validate inputs
        assert!(starting_price > 0, error::invalid_argument(E_INVALID_PRICE));
        assert!(duration > 0, error::invalid_argument(E_INVALID_DURATION));
        
        // Verify seller owns the NFT
        assert!(object::owner(nft) == seller_addr, error::permission_denied(E_NOT_NFT_OWNER));
        
        // Get next auction ID
        let state = borrow_global_mut<AuctionState>(@AuctionEnglishNFT);
        let auction_id = state.next_auction_id;
        state.next_auction_id = auction_id + 1;
        
        // Create auction object
        let constructor_ref = &object::create_named_object(seller, b"Auction");
        let auction_signer = object::generate_signer(constructor_ref);
        let auction_address = object::address_from_constructor_ref(constructor_ref);
        let extend_ref = object::generate_extend_ref(constructor_ref);
        
        // Create fungible store for auction object to hold payments
        fungible_asset::create_store(constructor_ref, payment_asset);
        
        // Transfer NFT to auction object
        object::transfer(seller, nft, auction_address);
        
        let start_time = timestamp::now_seconds();
        let end_time = start_time + duration;
        
        move_to(&auction_signer, Auction {
            id: auction_id,
            nft,
            seller: seller_addr,
            starting_price,
            end_time,
            duration,
            highest_bidder: @0x0,
            highest_bid: 0,
            finalized: false,
            payment_asset,
            extend_ref,
            refunds: table::new(),
            bid_events: account::new_event_handle<BidEvent>(&auction_signer),
            finalize_events: account::new_event_handle<FinalizeEvent>(&auction_signer),
        });
    }

    /// Place a bid on the auction
    /// Automatically refunds previous highest bidder if outbid
    /// Extends auction time if bid placed in last 5 minutes (anti-sniping)
    public entry fun place_bid(
        bidder: &signer,
        auction_address: address,
        amount: u64,
    ) acquires Auction {
        let bidder_addr = signer::address_of(bidder);
        
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global_mut<Auction>(auction_address);
        
        // Check auction is not finalized
        assert!(!auction.finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        
        // Check auction is not expired
        let now = timestamp::now_seconds();
        assert!(now < auction.end_time, error::invalid_state(E_AUCTION_EXPIRED));
        
        // Check bid is sufficient
        let min_bid = if (auction.highest_bid == 0) {
            auction.starting_price
        } else {
            auction.highest_bid + 1 // Must be at least 1 more than current highest
        };
        assert!(amount >= min_bid, error::invalid_argument(E_INSUFFICIENT_BID));
        
        // Store previous bidder info for refund
        let previous_bidder = auction.highest_bidder;
        let previous_amount = auction.highest_bid;
        
        // Refund previous highest bidder if exists (store refund amount)
        if (previous_bidder != @0x0) {
            // Store refund amount for previous bidder in auction's refund table
            if (!table::contains(&auction.refunds, previous_bidder)) {
                table::add(&mut auction.refunds, previous_bidder, 0);
            };
            let current_refund = *table::borrow(&auction.refunds, previous_bidder);
            table::upsert(&mut auction.refunds, previous_bidder, current_refund + previous_amount);
        };
        
        // Transfer payment from new bidder to auction object
        let bidder_store = primary_fungible_store::primary_store_inlined(bidder_addr, auction.payment_asset);
        let auction_store = object::address_to_object<FungibleStore>(auction_address);
        dispatchable_fungible_asset::transfer(bidder, bidder_store, auction_store, amount);
        
        // Update highest bid
        auction.highest_bidder = bidder_addr;
        auction.highest_bid = amount;
        
        // Anti-sniping: extend time if bid placed in last 5 minutes
        let time_remaining = auction.end_time - now;
        if (time_remaining <= E_TIME_EXTENSION_SECONDS) {
            auction.end_time = now + E_TIME_EXTENSION_SECONDS;
        };
        
        // Emit bid event
        event::emit_event(&mut auction.bid_events, BidEvent {
            auction_id: auction.id,
            bidder: bidder_addr,
            amount,
            previous_bidder,
            previous_amount,
            new_end_time: auction.end_time,
        });
    }

    /// Finalize the auction - transfers NFT to winner and payment to seller
    public entry fun finalize_auction(
        auction_address: address,
    ) acquires Auction {
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global_mut<Auction>(auction_address);
        
        // Check auction is not finalized
        assert!(!auction.finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        
        // Check auction is expired
        let now = timestamp::now_seconds();
        assert!(now >= auction.end_time, error::invalid_state(E_AUCTION_NOT_EXPIRED));
        
        // Check there is at least one bid
        assert!(auction.highest_bidder != @0x0, error::invalid_state(E_NO_BIDS));
        
        // Transfer payment to seller from auction object
        let auction_signer = object::generate_signer_for_extending(&auction.extend_ref);
        let auction_store = object::address_to_object<FungibleStore>(auction_address);
        let seller_store = primary_fungible_store::ensure_primary_store_exists(auction.seller, auction.payment_asset);
        dispatchable_fungible_asset::transfer(&auction_signer, auction_store, seller_store, auction.highest_bid);
        
        // Transfer NFT to winner
        object::transfer(&auction_signer, auction.nft, auction.highest_bidder);
        
        // Mark as finalized
        auction.finalized = true;
        
        // Emit finalize event
        event::emit_event(&mut auction.finalize_events, FinalizeEvent {
            auction_id: auction.id,
            winner: auction.highest_bidder,
            final_price: auction.highest_bid,
            seller: auction.seller,
            nft: object::object_address(&auction.nft),
        });
    }

    /// Claim refund for losing bidders
    public entry fun claim_refund(
        bidder: &signer,
        auction_address: address,
    ) acquires Auction {
        let bidder_addr = signer::address_of(bidder);
        
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global_mut<Auction>(auction_address);
        
        // Check auction is finalized
        assert!(auction.finalized, error::invalid_state(E_AUCTION_NOT_EXPIRED));
        
        // Check bidder is not the winner
        assert!(bidder_addr != auction.highest_bidder, error::invalid_argument(E_NOT_BIDDER));
        
        // Check bidder has a refund
        assert!(table::contains(&auction.refunds, bidder_addr), error::not_found(E_NOT_BIDDER));
        let amount = *table::borrow(&auction.refunds, bidder_addr);
        assert!(amount > 0, error::invalid_state(E_ALREADY_CLAIMED));
        
        // Remove refund from table
        table::remove(&mut auction.refunds, bidder_addr);
        
        // Transfer refund to bidder from auction object
        let auction_signer = object::generate_signer_for_extending(&auction.extend_ref);
        let auction_store = object::address_to_object<FungibleStore>(auction_address);
        let bidder_store = primary_fungible_store::ensure_primary_store_exists(bidder_addr, auction.payment_asset);
        dispatchable_fungible_asset::transfer(&auction_signer, auction_store, bidder_store, amount);
    }

    /// Cancel auction (seller only, if no bids)
    public entry fun cancel_auction(
        seller: &signer,
        auction_address: address,
    ) acquires Auction {
        let seller_addr = signer::address_of(seller);
        
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global_mut<Auction>(auction_address);
        
        // Verify seller
        assert!(auction.seller == seller_addr, error::permission_denied(E_NOT_SELLER));
        
        // Check not finalized
        assert!(!auction.finalized, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        
        // Check no bids (seller can only cancel if no bids)
        assert!(auction.highest_bidder == @0x0, error::invalid_state(E_AUCTION_ALREADY_FINALIZED));
        
        // Return NFT to seller
        let auction_signer = object::generate_signer_for_extending(&auction.extend_ref);
        object::transfer(&auction_signer, auction.nft, seller_addr);
        
        // Mark as finalized to prevent further operations
        auction.finalized = true;
    }

    /// Get auction details
    #[view]
    public fun get_auction_info(auction_address: address): (
        u64,        // auction_id
        address,    // nft address
        address,    // seller
        u64,        // starting_price
        u64,        // end_time
        u64,        // duration
        address,    // highest_bidder
        u64,        // highest_bid
        bool,       // finalized
        address     // payment_asset address
    ) acquires Auction {
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global<Auction>(auction_address);
        (
            auction.id,
            object::object_address(&auction.nft),
            auction.seller,
            auction.starting_price,
            auction.end_time,
            auction.duration,
            auction.highest_bidder,
            auction.highest_bid,
            auction.finalized,
            object::object_address(&auction.payment_asset)
        )
    }

    /// Check if auction exists
    #[view]
    public fun auction_exists(auction_address: address): bool {
        exists<Auction>(auction_address)
    }

    /// Check if auction is expired
    #[view]
    public fun is_auction_expired(auction_address: address): bool acquires Auction {
        if (!exists<Auction>(auction_address)) {
            return false
        };
        let auction = borrow_global<Auction>(auction_address);
        if (auction.finalized) {
            return false
        };
        let now = timestamp::now_seconds();
        now >= auction.end_time
    }

    /// Get refund amount for a bidder
    #[view]
    public fun get_refund_amount(auction_address: address, bidder: address): u64 acquires Auction {
        if (!exists<Auction>(auction_address)) {
            return 0
        };
        let auction = borrow_global<Auction>(auction_address);
        if (!table::contains(&auction.refunds, bidder)) {
            return 0
        };
        *table::borrow(&auction.refunds, bidder)
    }
}

