/// # Simple Lottery Contract
/// A fair lottery system using timestamp-based randomness for winner selection
module module_addr::lottery {
    use std::signer;
    use std::vector;
    use std::error;
    use cedra_std::table::{Self, Table};
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::primary_fungible_store;

    // ========== Error Codes ==========
    
    const E_NOT_INITIALIZED: u64 = 1;
    const E_LOTTERY_NOT_FOUND: u64 = 2;
    const E_LOTTERY_ALREADY_DRAWN: u64 = 3;
    const E_NOT_ORGANIZER: u64 = 4;
    const E_INVALID_TICKET_PRICE: u64 = 5;
    const E_LOTTERY_NOT_ENDED: u64 = 6;
    const E_NO_PARTICIPANTS: u64 = 7;
    const E_LOTTERY_ENDED: u64 = 8;
    const E_INSUFFICIENT_PAYMENT: u64 = 9;

    // ========== Data Structures ==========
    
    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Lottery round information stored as an object
    struct LotteryObject has key {
        lottery_id: u64,
        organizer: address,
        ticket_price: u64,
        end_time: u64,
        participants: vector<address>,
        winner: address,
        is_drawn: bool,
        payment_token: Object<Metadata>,
        prize_store: Object<FungibleStore>,
        extend_ref: ExtendRef,
    }

    /// Global state tracking all lotteries
    struct LotteryState has key {
        next_lottery_id: u64,
        lottery_objects: Table<u64, address>,
    }

    // ========== Events ==========
    
    #[event]
    struct LotteryCreated has drop, store {
        lottery_id: u64,
        lottery_obj_addr: address,
        organizer: address,
        ticket_price: u64,
        end_time: u64,
    }

    #[event]
    struct TicketPurchased has drop, store {
        lottery_id: u64,
        participant: address,
        ticket_price: u64,
        total_participants: u64,
    }

    #[event]
    struct WinnerDrawn has drop, store {
        lottery_id: u64,
        winner: address,
        prize_amount: u64,
        total_participants: u64,
        random_seed: u64,
    }

    // ========== Initialization ==========
    
    fun init_module(admin: &signer) {
        move_to(admin, LotteryState {
            next_lottery_id: 1,
            lottery_objects: table::new(),
        });
    }

    // ========== Public Entry Functions ==========
    
    /// Create a new lottery
    public entry fun create_lottery(
        organizer: &signer,
        ticket_price: u64,
        duration: u64,
        payment_token: Object<Metadata>,
    ) acquires LotteryState {
        assert!(exists<LotteryState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(ticket_price > 0, error::invalid_argument(E_INVALID_TICKET_PRICE));

        let organizer_addr = signer::address_of(organizer);
        let state = borrow_global_mut<LotteryState>(@module_addr);
        let lottery_id = state.next_lottery_id;
        let end_time = timestamp::now_seconds() + duration;

        // Create object to hold lottery data
        let lottery_constructor_ref = object::create_object(@module_addr);
        let lottery_signer = object::generate_signer(&lottery_constructor_ref);
        let lottery_obj_addr = signer::address_of(&lottery_signer);
        let extend_ref = object::generate_extend_ref(&lottery_constructor_ref);
        
        // Create fungible store for holding prize pool
        let prize_store = fungible_asset::create_store(&lottery_constructor_ref, payment_token);

        let lottery_obj = LotteryObject {
            lottery_id,
            organizer: organizer_addr,
            ticket_price,
            end_time,
            participants: vector::empty(),
            winner: @0x0,
            is_drawn: false,
            payment_token,
            prize_store,
            extend_ref,
        };

        move_to(&lottery_signer, lottery_obj);
        
        // Store lottery object address for easy lookup
        table::add(&mut state.lottery_objects, lottery_id, lottery_obj_addr);
        state.next_lottery_id = lottery_id + 1;

        event::emit(LotteryCreated {
            lottery_id,
            lottery_obj_addr,
            organizer: organizer_addr,
            ticket_price,
            end_time,
        });
    }

    /// Purchase a lottery ticket
    public entry fun buy_ticket(
        participant: &signer,
        lottery_id: u64,
        lottery_obj_addr: address,
    ) acquires LotteryObject {
        assert!(exists<LotteryObject>(lottery_obj_addr), error::not_found(E_LOTTERY_NOT_FOUND));
        
        let lottery = borrow_global_mut<LotteryObject>(lottery_obj_addr);
        assert!(lottery.lottery_id == lottery_id, error::not_found(E_LOTTERY_NOT_FOUND));
        assert!(!lottery.is_drawn, error::invalid_state(E_LOTTERY_ALREADY_DRAWN));
        
        let now = timestamp::now_seconds();
        assert!(now < lottery.end_time, error::invalid_state(E_LOTTERY_ENDED));

        let participant_addr = signer::address_of(participant);
        
        // Transfer ticket price from participant to lottery's prize store
        let fa = primary_fungible_store::withdraw(participant, lottery.payment_token, lottery.ticket_price);
        fungible_asset::deposit(lottery.prize_store, fa);
        
        // Add participant to the lottery
        vector::push_back(&mut lottery.participants, participant_addr);

        event::emit(TicketPurchased {
            lottery_id,
            participant: participant_addr,
            ticket_price: lottery.ticket_price,
            total_participants: vector::length(&lottery.participants),
        });
    }

    /// Draw the winner using timestamp-based randomness
    public entry fun draw_winner(
        lottery_id: u64,
        lottery_obj_addr: address,
    ) acquires LotteryObject {
        assert!(exists<LotteryObject>(lottery_obj_addr), error::not_found(E_LOTTERY_NOT_FOUND));
        
        let lottery = borrow_global_mut<LotteryObject>(lottery_obj_addr);
        assert!(lottery.lottery_id == lottery_id, error::not_found(E_LOTTERY_NOT_FOUND));
        assert!(!lottery.is_drawn, error::invalid_state(E_LOTTERY_ALREADY_DRAWN));
        
        let now = timestamp::now_seconds();
        assert!(now >= lottery.end_time, error::invalid_state(E_LOTTERY_NOT_ENDED));
        assert!(vector::length(&lottery.participants) > 0, error::invalid_state(E_NO_PARTICIPANTS));

        // Generate random number using timestamp and lottery data
        // This creates a deterministic but unpredictable random seed
        let random_seed = generate_random_seed(lottery.lottery_id, now, vector::length(&lottery.participants));
        let winner_idx = random_seed % vector::length(&lottery.participants);
        let winner_addr = *vector::borrow(&lottery.participants, winner_idx);
        
        lottery.winner = winner_addr;
        lottery.is_drawn = true;

        // Transfer entire prize pool to winner
        let lottery_signer = object::generate_signer_for_extending(&lottery.extend_ref);
        let prize_amount = fungible_asset::balance(lottery.prize_store);
        let prize_fa = fungible_asset::withdraw(&lottery_signer, lottery.prize_store, prize_amount);
        primary_fungible_store::deposit(winner_addr, prize_fa);

        event::emit(WinnerDrawn {
            lottery_id: lottery.lottery_id,
            winner: winner_addr,
            prize_amount,
            total_participants: vector::length(&lottery.participants),
            random_seed,
        });
    }

    // ========== View Functions ==========
    
    #[view]
    /// Get lottery object address by ID
    public fun get_lottery_address(lottery_id: u64): address acquires LotteryState {
        assert!(exists<LotteryState>(@module_addr), error::not_found(E_NOT_INITIALIZED));
        let state = borrow_global<LotteryState>(@module_addr);
        assert!(table::contains(&state.lottery_objects, lottery_id), error::not_found(E_LOTTERY_NOT_FOUND));
        *table::borrow(&state.lottery_objects, lottery_id)
    }
    
    #[view]
    /// Check if lottery exists
    public fun lottery_exists(lottery_obj_addr: address): bool {
        exists<LotteryObject>(lottery_obj_addr)
    }

    #[view]
    /// Get lottery information
    public fun get_lottery_info(lottery_obj_addr: address): (u64, address, u64, u64, u64, u64, address, bool) 
    acquires LotteryObject {
        assert!(exists<LotteryObject>(lottery_obj_addr), error::not_found(E_LOTTERY_NOT_FOUND));
        
        let lottery = borrow_global<LotteryObject>(lottery_obj_addr);
        let prize_amount = fungible_asset::balance(lottery.prize_store);
        
        (
            lottery.lottery_id,
            lottery.organizer,
            lottery.ticket_price,
            lottery.end_time,
            vector::length(&lottery.participants),
            prize_amount,
            lottery.winner,
            lottery.is_drawn,
        )
    }

    #[view]
    /// Get participant at index
    public fun get_participant(lottery_obj_addr: address, index: u64): address acquires LotteryObject {
        assert!(exists<LotteryObject>(lottery_obj_addr), error::not_found(E_LOTTERY_NOT_FOUND));
        
        let lottery = borrow_global<LotteryObject>(lottery_obj_addr);
        *vector::borrow(&lottery.participants, index)
    }

    // ========== Helper Functions ==========
    
    /// Generate a pseudo-random seed based on lottery data and timestamp
    /// This is deterministic but unpredictable before the draw time
    fun generate_random_seed(lottery_id: u64, timestamp: u64, participant_count: u64): u64 {
        // Combine multiple sources of entropy with modulo to prevent overflow
        let seed = lottery_id;
        seed = (seed * 31 + timestamp) % 0xFFFFFFFF;
        seed = (seed * 31 + participant_count) % 0xFFFFFFFF;
        
        // Additional mixing to improve distribution using safe operations
        seed = seed ^ (seed >> 16);
        seed = (seed * 1103515245 + 12345) % 0xFFFFFFFF;
        seed = seed ^ (seed >> 13);
        seed = (seed * 1664525 + 1013904223) % 0xFFFFFFFF;
        seed = seed ^ (seed >> 16);
        
        seed
    }

    // ========== Test-only Functions ==========
    
    #[test_only]
    public fun init_for_test(admin: &signer) {
        if (!exists<LotteryState>(signer::address_of(admin))) {
            move_to(admin, LotteryState {
                next_lottery_id: 1,
                lottery_objects: table::new(),
            });
        };
    }
}


