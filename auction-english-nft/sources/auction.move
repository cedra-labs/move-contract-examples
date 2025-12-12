module AuctionAddr::EnglishAuction {
    use cedra_framework::object::{Self, Object};
    use cedra_framework::timestamp;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_framework::event;
    use cedra_token_objects::token::Token;
    use std::signer;

    const E_AUCTION_NOT_FOUND: u64 = 1;
    const E_BID_TOO_LOW: u64 = 2;
    const E_AUCTION_NOT_ENDED: u64 = 3;
    const E_AUCTION_ENDED: u64 = 4;
    const E_NOT_SELLER: u64 = 5;
    const E_BIDS_EXIST: u64 = 6;
    const E_NO_BIDS: u64 = 7;
    const E_NOT_HIGHEST_BIDDER: u64 = 8;
    const E_ALREADY_FINALIZED: u64 = 9;
    const EXTENSION_TIME: u64 = 300; // 5 minutes

    struct Auction has key {
        nft: Object<Token>,
        seller: address,
        starting_price: u64,
        current_bid: u64,
        highest_bidder: address,
        end_time: u64,
        finalized: bool,
    }

    #[event]
    struct AuctionCreated has drop, store {
        auction_addr: address,
        seller: address,
        starting_price: u64,
        end_time: u64,
    }

    #[event]
    struct BidPlaced has drop, store {
        auction_addr: address,
        bidder: address,
        amount: u64,
        new_end_time: u64,
    }

    #[event]
    struct AuctionFinalized has drop, store {
        auction_addr: address,
        winner: address,
        final_price: u64,
    }

    #[event]
    struct AuctionCancelled has drop, store {
        auction_addr: address,
    }

    /// Creates a new auction for an NFT
    public entry fun create_auction(
        seller: &signer,
        nft: Object<Token>,
        starting_price: u64,
        duration: u64,
    ) {
        let seller_addr = signer::address_of(seller);
        let end_time = timestamp::now_seconds() + duration;
        object::transfer(seller, nft, seller_addr);
        move_to(seller, Auction {
            nft, seller: seller_addr, starting_price, current_bid: 0,
            highest_bidder: @0x0, end_time, finalized: false,
        });
        event::emit(AuctionCreated {
            auction_addr: seller_addr, seller: seller_addr, starting_price, end_time,
        });
    }

    /// Places a bid on an auction with automatic refunds and anti-sniping
    public entry fun place_bid(
        bidder: &signer,
        auction_addr: address,
        amount: u64,
    ) acquires Auction {
        assert!(exists<Auction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global_mut<Auction>(auction_addr);
        assert!(!auction.finalized, E_ALREADY_FINALIZED);
        assert!(timestamp::now_seconds() < auction.end_time, E_AUCTION_ENDED);
        let min_bid = if (auction.current_bid == 0) { auction.starting_price } else { auction.current_bid + 1 };
        assert!(amount >= min_bid, E_BID_TOO_LOW);
        let bidder_addr = signer::address_of(bidder);
        // Refund previous highest bidder
        if (auction.highest_bidder != @0x0) {
            coin::transfer<CedraCoin>(bidder, auction.highest_bidder, auction.current_bid);
        };
        coin::transfer<CedraCoin>(bidder, auction_addr, amount);
        // Anti-sniping: extend if bid in last 5 minutes
        let time_remaining = auction.end_time - timestamp::now_seconds();
        if (time_remaining < EXTENSION_TIME) {
            auction.end_time = timestamp::now_seconds() + EXTENSION_TIME;
        };
        auction.current_bid = amount;
        auction.highest_bidder = bidder_addr;
        event::emit(BidPlaced {
            auction_addr, bidder: bidder_addr, amount, new_end_time: auction.end_time,
        });
    }

    /// Finalizes auction and transfers NFT to winner
    public entry fun finalize_auction(
        caller: &signer,
        auction_addr: address,
    ) acquires Auction {
        assert!(exists<Auction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global_mut<Auction>(auction_addr);
        assert!(!auction.finalized, E_ALREADY_FINALIZED);
        assert!(timestamp::now_seconds() >= auction.end_time, E_AUCTION_NOT_ENDED);
        assert!(auction.highest_bidder != @0x0, E_NO_BIDS);
        object::transfer(caller, auction.nft, auction.highest_bidder);
        coin::transfer<CedraCoin>(caller, auction.seller, auction.current_bid);
        auction.finalized = true;
        event::emit(AuctionFinalized {
            auction_addr, winner: auction.highest_bidder, final_price: auction.current_bid,
        });
    }

    /// Cancels auction if no bids placed
    public entry fun cancel_auction(
        seller: &signer,
        auction_addr: address,
    ) acquires Auction {
        assert!(exists<Auction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global_mut<Auction>(auction_addr);
        let seller_addr = signer::address_of(seller);
        assert!(auction.seller == seller_addr, E_NOT_SELLER);
        assert!(auction.highest_bidder == @0x0, E_BIDS_EXIST);
        assert!(!auction.finalized, E_ALREADY_FINALIZED);
        object::transfer(seller, auction.nft, seller_addr);
        auction.finalized = true;
        event::emit(AuctionCancelled { auction_addr });
    }

    /// Allows losing bidders to claim refunds (automatic in this implementation)
    public entry fun claim_refund(
        bidder: &signer,
        auction_addr: address,
    ) acquires Auction {
        assert!(exists<Auction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global<Auction>(auction_addr);
        let bidder_addr = signer::address_of(bidder);
        assert!(auction.finalized, E_AUCTION_NOT_ENDED);
        assert!(bidder_addr != auction.highest_bidder, E_NOT_HIGHEST_BIDDER);
        // Refunds are automatic in place_bid, this function exists for API completeness
    }

    #[view]
    /// Gets auction details
    public fun get_auction(auction_addr: address): (address, u64, address, u64, bool) acquires Auction {
        assert!(exists<Auction>(auction_addr), E_AUCTION_NOT_FOUND);
        let auction = borrow_global<Auction>(auction_addr);
        (auction.seller, auction.current_bid, auction.highest_bidder, auction.end_time, auction.finalized)
    }
}
