/// # Dutch Auction Contract
/// A simple NFT auction where price decreases linearly over time until someone buys
module module_addr::dutch_auction {
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
    /// Auction has already been sold or cancelled
    const E_AUCTION_ALREADY_SOLD: u64 = 3;
    /// Caller is not the seller of this auction
    const E_NOT_SELLER: u64 = 4;
    /// Invalid price parameters (start price must be greater than end price)
    const E_INVALID_PRICE: u64 = 5;
    /// Payment amount is insufficient for the current price
    const E_INSUFFICIENT_PAYMENT: u64 = 6;
    /// Auction duration must be greater than zero
    const E_INVALID_DURATION: u64 = 7;

    // ========== Data Structures ==========
    
    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Auction object that holds the NFT - stored at its own address
    struct AuctionObject has key {
        auction_id: u64,
        seller: address,
        nft: Object<Token>,
        start_price: u64,
        end_price: u64,
        start_time: u64,
        duration: u64,
        payment_token: Object<Metadata>,
        is_sold: bool,
        extend_ref: ExtendRef,  // Used to generate signer for NFT transfers
    }

    /// Global state tracking all auctions
    struct AuctionState has key {
        next_auction_id: u64,
        auction_objects: Table<u64, Object<AuctionObject>>,
    }

    // ========== Events ==========
    
    #[event]
    /// Event emitted when a new auction is created
    struct AuctionCreated has drop, store {
        auction_id: u64,
        auction_object: Object<AuctionObject>,
        seller: address,
        nft: Object<Token>,
        start_price: u64,
        end_price: u64,
        duration: u64,
        start_time: u64,
    }

    #[event]
    /// Event emitted when a buyer purchases the NFT
        struct AuctionPurchased has drop, store {
        auction_id: u64,
        buyer: address,
        seller: address,
        nft: Object<Token>,
        price: u64,
        timestamp: u64,
    }

    #[event]
    /// Event emitted when an auction is cancelled
    struct AuctionCancelled has drop, store {
        auction_id: u64,
        seller: address,
        nft: Object<Token>,
    }

    // ========== Initialization ==========
    
    fun init_module(admin: &signer) {
        move_to(admin, AuctionState {
            next_auction_id: 1,
            auction_objects: table::new(),
        });
    }

    // ========== Public Entry Functions ==========
    
    /// Create a new Dutch auction for an NFT
    public entry fun create_auction(
        seller: &signer,
        nft: Object<Token>,
        start_price: u64,
        end_price: u64,
        duration: u64,
        payment_token: Object<Metadata>,
    ) acquires AuctionState {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(start_price > end_price, error::invalid_argument(E_INVALID_PRICE));
        assert!(duration > 0, error::invalid_argument(E_INVALID_DURATION));

        let seller_addr = signer::address_of(seller);
        let state = borrow_global_mut<AuctionState>(@module_addr);
        let auction_id = state.next_auction_id;
        let start_time = timestamp::now_seconds();

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
            start_price,
            end_price,
            start_time,
            duration,
            payment_token,
            is_sold: false,
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
            start_price,
            end_price,
            duration,
            start_time,
        });
    }

    /// Buy the NFT at the current price
    public entry fun buy_now(
        buyer: &signer,
        auction_id: u64,
    ) acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global_mut<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));

        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global_mut<AuctionObject>(auction_object_addr);
        
        assert!(!auction.is_sold, error::invalid_state(E_AUCTION_ALREADY_SOLD));

        let current_price = calculate_current_price(auction);
        let buyer_addr = signer::address_of(buyer);

        // Transfer payment from buyer to seller
        primary_fungible_store::transfer(buyer, auction.payment_token, auction.seller, current_price);

        // Transfer NFT from auction object to buyer
        let nft = auction.nft;
        let seller_addr = auction.seller;
        
        // Generate signer from ExtendRef to transfer the NFT
        let auction_obj_signer = object::generate_signer_for_extending(&auction.extend_ref);
        
        auction.is_sold = true;

        // Transfer NFT to buyer
        object::transfer(&auction_obj_signer, nft, buyer_addr);

        event::emit(AuctionPurchased {
            auction_id,
            buyer: buyer_addr,
            seller: seller_addr,
            nft,
            price: current_price,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Cancel auction and return NFT to seller (only if not sold)
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
        assert!(!auction.is_sold, error::invalid_state(E_AUCTION_ALREADY_SOLD));

        // Return NFT to seller
        let nft = auction.nft;
        
        // Generate signer from ExtendRef to transfer the NFT back
        let auction_obj_signer = object::generate_signer_for_extending(&auction.extend_ref);
        
        auction.is_sold = true; // Mark as sold to prevent further operations

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
    /// Calculate current price based on elapsed time
    /// Formula: current_price = start_price - ((start_price - end_price) * elapsed_time / duration)
    public fun get_current_price(auction_id: u64): u64 acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));
        
        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global<AuctionObject>(auction_object_addr);
        calculate_current_price(auction)
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
    public fun get_auction_info(auction_id: u64): (address, Object<Token>, u64, u64, u64, u64, bool) acquires AuctionState, AuctionObject {
        assert!(exists<AuctionState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global<AuctionState>(@module_addr);
        assert!(table::contains(&state.auction_objects, auction_id), error::not_found(E_AUCTION_NOT_FOUND));
        
        let auction_object = *table::borrow(&state.auction_objects, auction_id);
        let auction_object_addr = object::object_address(&auction_object);
        let auction = borrow_global<AuctionObject>(auction_object_addr);
        (auction.seller, auction.nft, auction.start_price, auction.end_price, auction.start_time, auction.duration, auction.is_sold)
    }

    // ========== Helper Functions ==========
    
    /// Internal price calculation
    fun calculate_current_price(auction: &AuctionObject): u64 {
        let now = timestamp::now_seconds();
        let elapsed = if (now > auction.start_time) { now - auction.start_time } else { 0 };
        
        // If duration has passed, return end_price
        if (elapsed >= auction.duration) {
            return auction.end_price
        };

        // Linear decay: current_price = start_price - ((start_price - end_price) * elapsed / duration)
        let price_drop = auction.start_price - auction.end_price;
        let decay = (price_drop * elapsed) / auction.duration;
        auction.start_price - decay
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
