module AuctionAddr::DutchAuction {
    use cedra_framework::object::{Self, Object};
    use cedra_framework::timestamp;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_framework::event;
    use cedra_token_objects::token::Token;
    use std::signer;

    const E_AUCTION_NOT_FOUND: u64 = 1;
    const E_ALREADY_SOLD: u64 = 2;
    const E_NOT_SELLER: u64 = 3;
    const E_INVALID_PRICE: u64 = 4;
    const E_INVALID_DURATION: u64 = 5;

    struct DutchAuction has key {
        nft: Object<Token>, seller: address, start_price: u64, end_price: u64,
        start_time: u64, duration: u64, sold: bool, buyer: address, final_price: u64,
    }

    #[event]
    struct AuctionCreated has drop, store {
        auction_addr: address, seller: address, start_price: u64, end_price: u64, duration: u64,
    }

    #[event]
    struct AuctionCompleted has drop, store {
        auction_addr: address, buyer: address, final_price: u64,
    }

    #[event]
    struct AuctionCancelled has drop, store { auction_addr: address, }

    /// Creates Dutch auction with linearly decreasing price
    public entry fun create_auction(
        seller: &signer, nft: Object<Token>, start_price: u64, end_price: u64, duration: u64,
    ) {
        assert!(start_price > end_price, E_INVALID_PRICE);
        assert!(duration > 0, E_INVALID_DURATION);
        let seller_addr = signer::address_of(seller);
        object::transfer(seller, nft, seller_addr);
        move_to(seller, DutchAuction {
            nft, seller: seller_addr, start_price, end_price,
            start_time: timestamp::now_seconds(), duration, sold: false, buyer: @0x0, final_price: 0,
        });
        event::emit(AuctionCreated {
            auction_addr: seller_addr, seller: seller_addr, start_price, end_price, duration,
        });
    }

    #[view]
    /// Calculates current price: start_price - ((start_price - end_price) * elapsed / duration)
    public fun get_current_price(auction_addr: address): u64 acquires DutchAuction {
        assert!(exists<DutchAuction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global<DutchAuction>(auction_addr);
        let elapsed = timestamp::now_seconds() - auction.start_time;
        if (elapsed >= auction.duration) { auction.end_price }
        else { auction.start_price - ((auction.start_price - auction.end_price) * elapsed) / auction.duration }
    }

    /// Buyer purchases at current price, payment escrowed
    public entry fun buy_now(buyer: &signer, auction_addr: address) acquires DutchAuction {
        assert!(exists<DutchAuction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global_mut<DutchAuction>(auction_addr);
        assert!(!auction.sold, E_ALREADY_SOLD);
        let buyer_addr = signer::address_of(buyer);
        let elapsed = timestamp::now_seconds() - auction.start_time;
        let current_price = if (elapsed >= auction.duration) { auction.end_price }
        else { auction.start_price - ((auction.start_price - auction.end_price) * elapsed) / auction.duration };
        coin::transfer<CedraCoin>(buyer, auction_addr, current_price);
        auction.buyer = buyer_addr;
        auction.final_price = current_price;
        auction.sold = true;
        event::emit(AuctionCompleted { auction_addr, buyer: buyer_addr, final_price: current_price, });
    }

    /// Seller completes transfer of NFT and receives payment
    public entry fun finalize_sale(seller: &signer, auction_addr: address) acquires DutchAuction {
        assert!(exists<DutchAuction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global<DutchAuction>(auction_addr);
        let seller_addr = signer::address_of(seller);
        assert!(auction.seller == seller_addr, E_NOT_SELLER);
        assert!(auction.sold && auction.buyer != @0x0, E_ALREADY_SOLD);
        object::transfer(seller, auction.nft, auction.buyer);
        coin::transfer<CedraCoin>(seller, seller_addr, auction.final_price);
    }

    /// Seller cancels auction if not sold
    public entry fun cancel_auction(seller: &signer, auction_addr: address) acquires DutchAuction {
        assert!(exists<DutchAuction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global_mut<DutchAuction>(auction_addr);
        let seller_addr = signer::address_of(seller);
        assert!(auction.seller == seller_addr, E_NOT_SELLER);
        assert!(!auction.sold, E_ALREADY_SOLD);
        object::transfer(seller, auction.nft, seller_addr);
        auction.sold = true;
        event::emit(AuctionCancelled { auction_addr });
    }

    #[view]
    /// Returns auction details
    public fun get_auction(auction_addr: address): (address, u64, u64, u64, u64, bool, address, u64) acquires DutchAuction {
        assert!(exists<DutchAuction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global<DutchAuction>(auction_addr);
        (auction.seller, auction.start_price, auction.end_price, auction.start_time, auction.duration, auction.sold, auction.buyer, auction.final_price)
    }
}
