/// Dutch Auction for NFTs - Price decreases linearly over time until someone buys
/// Price formula: current_price = start_price - ((start_price - end_price) * elapsed_time / duration)
module AuctionDutchNFT::DutchAuction {
    use std::signer;
    use std::error;
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::event;
    use cedra_framework::account;
    use cedra_framework::timestamp;
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::primary_fungible_store;
    use cedra_token_objects::token;

    /// Error codes
    const E_AUCTION_NOT_FOUND: u64 = 1;
    const E_NOT_SELLER: u64 = 2;
    const E_AUCTION_ALREADY_SOLD: u64 = 3;
    const E_INSUFFICIENT_PAYMENT: u64 = 4;
    const E_INVALID_PRICE: u64 = 5;
    const E_INVALID_DURATION: u64 = 6;
    const E_AUCTION_EXPIRED: u64 = 7;
    const E_NOT_NFT_OWNER: u64 = 8;

    /// Auction state
    struct Auction has key {
        id: u64,
        nft: Object<token::Token>,
        seller: address,
        start_price: u64,
        end_price: u64,
        start_time: u64,
        duration: u64,
        sold: bool,
        buyer: address,
        payment_asset: Object<Metadata>,
        extend_ref: ExtendRef,  // Needed to transfer NFT owned by auction object
        purchase_events: event::EventHandle<PurchaseEvent>,
        price_update_events: event::EventHandle<PriceUpdateEvent>,
    }

    /// Global auction counter
    struct AuctionState has key {
        next_auction_id: u64,
    }

    /// Purchase event
    struct PurchaseEvent has drop, store {
        auction_id: u64,
        buyer: address,
        seller: address,
        price: u64,
        nft: address,
    }

    /// Price update event (for tracking price changes)
    struct PriceUpdateEvent has drop, store {
        auction_id: u64,
        current_price: u64,
        elapsed_time: u64,
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

    /// Create a new Dutch auction
    /// @param nft: The NFT token to auction
    /// @param start_price: Starting price (highest)
    /// @param end_price: Ending price (lowest, must be <= start_price)
    /// @param duration: Auction duration in seconds
    /// @param payment_asset: The fungible asset used for payment
    public entry fun create_auction(
        seller: &signer,
        nft: Object<token::Token>,
        start_price: u64,
        end_price: u64,
        duration: u64,
        payment_asset: Object<Metadata>,
    ) acquires AuctionState, Auction {
        let seller_addr = signer::address_of(seller);
        
        // Validate inputs
        assert!(start_price > 0, error::invalid_argument(E_INVALID_PRICE));
        assert!(end_price <= start_price, error::invalid_argument(E_INVALID_PRICE));
        assert!(duration > 0, error::invalid_argument(E_INVALID_DURATION));
        
        // Verify seller owns the NFT
        assert!(object::owner(nft) == seller_addr, error::permission_denied(E_NOT_NFT_OWNER));
        
        // Get next auction ID
        let state = borrow_global_mut<AuctionState>(@AuctionDutchNFT);
        let auction_id = state.next_auction_id;
        state.next_auction_id = auction_id + 1;
        
        // Create auction object first
        let constructor_ref = &object::create_named_object(seller, b"Auction");
        let auction_signer = object::generate_signer(constructor_ref);
        let auction_address = object::address_from_constructor_ref(constructor_ref);
        let extend_ref = object::generate_extend_ref(constructor_ref);
        
        // Transfer NFT to auction object
        object::transfer(seller, nft, auction_address);
        
        let start_time = timestamp::now_seconds();
        
        move_to(&auction_signer, Auction {
            id: auction_id,
            nft,
            seller: seller_addr,
            start_price,
            end_price,
            start_time,
            duration,
            sold: false,
            buyer: @0x0,
            payment_asset,
            extend_ref,
            purchase_events: account::new_event_handle<PurchaseEvent>(&auction_signer),
            price_update_events: account::new_event_handle<PriceUpdateEvent>(&auction_signer),
        });
        
        // Emit initial price update
        let auction = borrow_global_mut<Auction>(auction_address);
        event::emit_event(&mut auction.price_update_events, PriceUpdateEvent {
            auction_id,
            current_price: start_price,
            elapsed_time: 0,
        });
    }

    /// Calculate current price based on elapsed time
    /// Formula: current_price = start_price - ((start_price - end_price) * elapsed_time / duration)
    #[view]
    public fun get_current_price(auction_address: address): u64 acquires Auction {
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global<Auction>(auction_address);
        
        if (auction.sold) {
            return 0
        };
        
        let now = timestamp::now_seconds();
        let elapsed_time = if (now >= auction.start_time) {
            now - auction.start_time
        } else {
            0
        };
        
        // If auction expired, return end_price
        if (elapsed_time >= auction.duration) {
            return auction.end_price
        };
        
        // Calculate price: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = auction.start_price - auction.end_price;
        let price_decrease = (price_range * elapsed_time) / auction.duration;
        let current_price = auction.start_price - price_decrease;
        
        // Ensure price doesn't go below end_price due to rounding
        if (current_price < auction.end_price) {
            auction.end_price
        } else {
            current_price
        }
    }

    /// Buy the NFT at current price (instant purchase)
    public entry fun buy_now(
        buyer: &signer,
        auction_address: address,
    ) acquires Auction {
        let buyer_addr = signer::address_of(buyer);
        
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global_mut<Auction>(auction_address);
        
        // Check auction is not already sold
        assert!(!auction.sold, error::invalid_state(E_AUCTION_ALREADY_SOLD));
        
        // Calculate current price
        let now = timestamp::now_seconds();
        let elapsed_time = if (now >= auction.start_time) {
            now - auction.start_time
        } else {
            0
        };
        
        let current_price = if (elapsed_time >= auction.duration) {
            auction.end_price
        } else {
            let price_range = auction.start_price - auction.end_price;
            let price_decrease = (price_range * elapsed_time) / auction.duration;
            let price = auction.start_price - price_decrease;
            if (price < auction.end_price) {
                auction.end_price
            } else {
                price
            }
        };
        
        // Transfer payment from buyer to seller
        primary_fungible_store::transfer(buyer, auction.payment_asset, auction.seller, current_price);
        
        // Transfer NFT to buyer (auction object owns the NFT)
        let auction_signer = object::generate_signer_for_extending(&auction.extend_ref);
        object::transfer(&auction_signer, auction.nft, buyer_addr);
        
        // Mark as sold
        auction.sold = true;
        auction.buyer = buyer_addr;
        
        // Emit purchase event
        event::emit_event(&mut auction.purchase_events, PurchaseEvent {
            auction_id: auction.id,
            buyer: buyer_addr,
            seller: auction.seller,
            price: current_price,
            nft: object::object_address(&auction.nft),
        });
        
        // Emit final price update
        event::emit_event(&mut auction.price_update_events, PriceUpdateEvent {
            auction_id: auction.id,
            current_price,
            elapsed_time,
        });
    }

    /// Cancel auction (seller only, if not sold)
    public entry fun cancel_auction(
        seller: &signer,
        auction_address: address,
    ) acquires Auction {
        let seller_addr = signer::address_of(seller);
        
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global_mut<Auction>(auction_address);
        
        // Verify seller
        assert!(auction.seller == seller_addr, error::permission_denied(E_NOT_SELLER));
        
        // Check not already sold
        assert!(!auction.sold, error::invalid_state(E_AUCTION_ALREADY_SOLD));
        
        // Return NFT to seller (auction object owns the NFT)
        let auction_signer = object::generate_signer_for_extending(&auction.extend_ref);
        object::transfer(&auction_signer, auction.nft, seller_addr);
        
        // Mark as sold to prevent further operations
        auction.sold = true;
    }

    /// Get auction details
    #[view]
    public fun get_auction_info(auction_address: address): (
        u64,        // auction_id
        address,    // nft address
        address,    // seller
        u64,        // start_price
        u64,        // end_price
        u64,        // start_time
        u64,        // duration
        bool,       // sold
        address,    // buyer
        address     // payment_asset address
    ) acquires Auction {
        assert!(exists<Auction>(auction_address), error::not_found(E_AUCTION_NOT_FOUND));
        let auction = borrow_global<Auction>(auction_address);
        (
            auction.id,
            object::object_address(&auction.nft),
            auction.seller,
            auction.start_price,
            auction.end_price,
            auction.start_time,
            auction.duration,
            auction.sold,
            auction.buyer,
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
        if (auction.sold) {
            return false
        };
        let now = timestamp::now_seconds();
        let elapsed_time = if (now >= auction.start_time) {
            now - auction.start_time
        } else {
            0
        };
        elapsed_time >= auction.duration
    }
}

