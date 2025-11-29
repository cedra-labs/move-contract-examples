/// Simple lottery contract for Cedra blockchain
/// 
/// Features:
/// - Admin can initialize lottery with ticket price
/// - Users can buy tickets with CedraCoin
/// - Admin can pick random winner
/// - Winner receives entire pot
/// - Events are emitted for history tracking
module lottery_simple::lottery_simple {
    use std::signer;
    use std::vector;
    use std::hash;
    use std::bcs;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_framework::timestamp;
    use cedra_framework::account;
    use cedra_framework::event;

    /// Error codes for lottery contract
    /// Lottery not initialized yet
    const E_NOT_INITIALIZED: u64 = 1;
    /// Ticket purchase amount doesn't match ticket price
    const E_INVALID_AMOUNT: u64 = 2;
    /// No participants in lottery to pick winner from
    const E_NO_PARTICIPANTS: u64 = 3;
    /// Only admin can call this function
    const E_NOT_ADMIN: u64 = 4;

    /// Event emitted when a winner is selected
    /// 
    /// Contains information about the lottery round result
    /// for history tracking and transparency
    struct WinnerEvent has drop, store {
        /// Lottery round number
        round_id: u64,
        /// Address of the winner
        winner: address,
        /// Amount of prize won
        prize_amount: u64,
        /// Timestamp when winner was selected
        timestamp: u64
    }

    /// Main lottery data structure
    /// 
    /// Stores all information about the current lottery state
    /// including admin, players, prize pot, and event handling
    struct Lottery has key {
        /// Administrator address who can pick winners
        admin: address,
        /// Price per ticket in CedraCoin
        ticket_price: u64,
        /// List of player addresses who bought tickets
        players: vector<address>,
        /// Prize pool containing all ticket payments
        pot: coin::Coin<CedraCoin>,
        /// Current round number for tracking
        round_id: u64,
        /// Event handle for emitting winner events
        winner_events: event::EventHandle<WinnerEvent>,
    }

    /// Initialize a new lottery (Admin only)
    /// 
    /// Creates a new lottery with specified ticket price.
    /// Only one lottery can exist per admin address.
    /// 
    /// # Arguments
    /// * `admin` - The signer who will be the lottery administrator
    /// * `ticket_price` - Price per ticket in CedraCoin units
    /// 
    /// # Aborts
    /// * Does not abort - silently skips if lottery already exists
    public entry fun init_lottery(admin: &signer, ticket_price: u64) {
        let admin_addr = signer::address_of(admin);
        
        if (!exists<Lottery>(admin_addr)) {
            move_to(admin, Lottery {
                admin: admin_addr,
                ticket_price,
                players: vector::empty<address>(),
                pot: coin::zero<CedraCoin>(),
                // Start from round 1
                round_id: 1,
                // Initialize event handle for winner events
                winner_events: account::new_event_handle<WinnerEvent>(admin),
            });
        }
    }

    /// Purchase a lottery ticket
    /// 
    /// Allows a user to buy a ticket by paying the exact ticket price.
    /// The payment goes into the prize pot and the player is added to the participant list.
    /// 
    /// # Arguments
    /// * `buyer` - The signer purchasing the ticket
    /// * `amount` - Amount to pay (must equal ticket_price)
    /// * `lottery_owner` - Address of the lottery admin
    /// 
    /// # Aborts
    /// * `E_NOT_INITIALIZED` - If lottery doesn't exist
    /// * `E_INVALID_AMOUNT` - If amount doesn't match ticket price
    public entry fun buy_ticket(buyer: &signer, amount: u64, lottery_owner: address) acquires Lottery {
        assert!(exists<Lottery>(lottery_owner), E_NOT_INITIALIZED);
        let lottery = borrow_global_mut<Lottery>(lottery_owner);
        assert!(amount == lottery.ticket_price, E_INVALID_AMOUNT);
        let payment = coin::withdraw<CedraCoin>(buyer, amount);
        coin::merge(&mut lottery.pot, payment);
        vector::push_back(&mut lottery.players, signer::address_of(buyer));
    }

    /// Pick a random winner and distribute prize (Admin only)
    /// 
    /// Selects a random winner from all ticket holders using pseudo-randomness
    /// based on timestamp and lottery parameters. Winner receives the entire pot.
    /// Emits a WinnerEvent for history tracking and resets for the next round.
    /// 
    /// # Arguments
    /// * `admin` - Must be the lottery administrator
    /// * `lottery_owner` - Address of the lottery (should match admin)
    /// 
    /// # Aborts
    /// * `E_NOT_ADMIN` - If caller is not the lottery admin
    /// * `E_NO_PARTICIPANTS` - If no one has bought tickets yet
    public entry fun pick_winner(admin: &signer, lottery_owner: address) acquires Lottery {
        let lottery = borrow_global_mut<Lottery>(lottery_owner);
        assert!(signer::address_of(admin) == lottery.admin, E_NOT_ADMIN);
        
        let players_len = vector::length(&lottery.players);
        assert!(players_len > 0, E_NO_PARTICIPANTS);

        // Generate pseudo-random seed from multiple sources
        let time = timestamp::now_microseconds();
        let seed = bcs::to_bytes(&time);
        vector::append(&mut seed, bcs::to_bytes(&lottery_owner));
        // Add round_id to seed to ensure different randomness each round
        vector::append(&mut seed, bcs::to_bytes(&lottery.round_id)); 
        
        let hash_result = hash::sha3_256(seed);
        let random_val = vector_u8_to_u64(hash_result);
        let winner_index = random_val % players_len;
        
        // Payout to winner
        let winner_addr = *vector::borrow(&lottery.players, winner_index);
        let total_pot = coin::value(&lottery.pot);
        let prize = coin::extract(&mut lottery.pot, total_pot);
        coin::deposit(winner_addr, prize);

        // Emit winner event for permanent blockchain history
        // This event will be stored permanently in blockchain logs
        event::emit_event(&mut lottery.winner_events, WinnerEvent {
            round_id: lottery.round_id,
            winner: winner_addr,
            prize_amount: total_pot,
            timestamp: time,
        });

        // Reset lottery for next round
        lottery.players = vector::empty<address>();
        // Increment round number
        lottery.round_id = lottery.round_id + 1;
    }

    /// Convert first 8 bytes of a byte vector to u64
    /// 
    /// Helper function for random number generation.
    /// Converts the first 8 bytes of a hash result into a u64 value
    /// using big-endian byte ordering.
    /// 
    /// # Arguments
    /// * `bytes` - Byte vector (must have at least 8 bytes)
    /// 
    /// # Returns
    /// * `u64` - Converted number from first 8 bytes
    fun vector_u8_to_u64(bytes: vector<u8>): u64 {
        let value = 0u64;
        let i = 0;
        while (i < 8) {
            let byte = *vector::borrow(&bytes, i);
            value = value | ((byte as u64) << ((8 * (7 - i)) as u8));
            i = i + 1;
        };
        value
    }
}