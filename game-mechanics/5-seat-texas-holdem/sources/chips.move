/// Poker Chips - Fungible Asset Token
/// 
/// A fungible asset representing poker chips for the Texas Hold'em game.
/// Players buy chips with CEDRA, play the game, and cash out winnings.
module holdemgame::chips {
    use std::string;
    use std::signer;
    use std::option;
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::fungible_asset::{
        Self, Metadata, MintRef, TransferRef, BurnRef
    };
    use cedra_framework::primary_fungible_store;
    use cedra_framework::cedra_coin;
    use cedra_framework::coin;

    // Friend modules that can access internal chip functions
    friend holdemgame::texas_holdem;

    // ============================================
    // ERROR CODES
    // ============================================
    
    /// Module already initialized
    const E_ALREADY_INITIALIZED: u64 = 1;
    /// Module not initialized
    const E_NOT_INITIALIZED: u64 = 2;
    /// Caller is not the admin
    const E_NOT_ADMIN: u64 = 3;
    /// Insufficient CEDRA balance for purchase
    const E_INSUFFICIENT_CEDRA: u64 = 4;
    /// Insufficient chip balance for cash out
    const E_INSUFFICIENT_CHIPS: u64 = 5;
    /// Amount must be greater than zero
    const E_ZERO_AMOUNT: u64 = 6;
    /// Treasury doesn't have enough CEDRA for cashout
    const E_TREASURY_INSUFFICIENT: u64 = 7;

    // ============================================
    // CONSTANTS
    // ============================================
    
    /// Chips per CEDRA (1 CEDRA = 100_000_000 Octas = 1000 chips)
    const CHIPS_PER_CEDRA: u64 = 1000;
    /// Octas per CEDRA
    const OCTAS_PER_CEDRA: u64 = 100_000_000;
    /// Chip decimals (for display)
    const CHIP_DECIMALS: u8 = 0;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /// The chip manager resource stored at module address
    struct ChipManager has key {
        /// Reference to mint new chips
        mint_ref: MintRef,
        /// Reference to burn chips
        burn_ref: BurnRef,
        /// Reference to transfer chips (bypassing frozen)
        transfer_ref: TransferRef,
        /// Object extension reference for managing the FA object
        extend_ref: ExtendRef,
        /// The metadata object for the chip FA
        metadata: Object<Metadata>,
        /// Admin who can update settings
        admin: address,
        /// Total CEDRA held in treasury (for cashouts)
        treasury_balance: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /// Initialize the chip system
    /// Creates the fungible asset metadata and ChipManager resource
    fun init_module(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        // Create the FA metadata object
        let constructor_ref = object::create_named_object(deployer, b"POKER_CHIPS");
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none(), // No max supply
            string::utf8(b"Poker Chips"),
            string::utf8(b"CHIP"),
            CHIP_DECIMALS,
            string::utf8(b"https://example.com/chip.png"), // Icon URL
            string::utf8(b"https://example.com"), // Project URL
        );
        
        let metadata = object::object_from_constructor_ref<Metadata>(&constructor_ref);
        
        // Generate capability references
        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        
        // Store the ChipManager
        move_to(deployer, ChipManager {
            mint_ref,
            burn_ref,
            transfer_ref,
            extend_ref,
            metadata,
            admin: deployer_addr,
            treasury_balance: 0,
        });
    }

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    /// Buy chips with CEDRA
    /// 
    /// Exchange rate: 1 CEDRA = 1000 chips
    /// The CEDRA is held in treasury for future cashouts.
    /// 
    /// # Arguments
    /// * `player` - The buyer's signer
    /// * `cedra_amount` - Amount of CEDRA (in Octas) to exchange
    public entry fun buy_chips(player: &signer, cedra_amount: u64) acquires ChipManager {
        assert!(cedra_amount > 0, E_ZERO_AMOUNT);
        assert!(exists<ChipManager>(@holdemgame), E_NOT_INITIALIZED);
        
        let manager = borrow_global_mut<ChipManager>(@holdemgame);
        
        // Calculate chip amount (1 CEDRA = 1000 chips)
        // cedra_amount is in Octas, so: chips = (octas * CHIPS_PER_CEDRA) / OCTAS_PER_CEDRA
        let chip_amount = (cedra_amount * CHIPS_PER_CEDRA) / OCTAS_PER_CEDRA;
        assert!(chip_amount > 0, E_ZERO_AMOUNT);
        
        // Transfer CEDRA from player to module (treasury)
        // Use coin::transfer for CedraCoin
        coin::transfer<cedra_coin::CedraCoin>(player, @holdemgame, cedra_amount);
        manager.treasury_balance = manager.treasury_balance + cedra_amount;
        
        // Mint chips to player
        let chips = fungible_asset::mint(&manager.mint_ref, chip_amount);
        primary_fungible_store::deposit(signer::address_of(player), chips);
    }

    /// Cash out chips for CEDRA
    /// 
    /// Exchange chips back to CEDRA at the same rate.
    /// 
    /// # Arguments
    /// * `player` - The player cashing out
    /// * `chip_amount` - Number of chips to exchange
    public entry fun cash_out(player: &signer, chip_amount: u64) acquires ChipManager {
        assert!(chip_amount > 0, E_ZERO_AMOUNT);
        assert!(exists<ChipManager>(@holdemgame), E_NOT_INITIALIZED);
        
        let player_addr = signer::address_of(player);
        let manager = borrow_global_mut<ChipManager>(@holdemgame);
        
        // Check player has enough chips
        let player_balance = primary_fungible_store::balance(player_addr, manager.metadata);
        assert!(player_balance >= chip_amount, E_INSUFFICIENT_CHIPS);
        
        // Calculate CEDRA amount
        let cedra_amount = (chip_amount * OCTAS_PER_CEDRA) / CHIPS_PER_CEDRA;
        assert!(manager.treasury_balance >= cedra_amount, E_TREASURY_INSUFFICIENT);
        
        // Burn the chips
        let chips = primary_fungible_store::withdraw(player, manager.metadata, chip_amount);
        fungible_asset::burn(&manager.burn_ref, chips);
        
        // Transfer CEDRA back to player
        manager.treasury_balance = manager.treasury_balance - cedra_amount;
        // Note: Need a signer for the module to transfer CEDRA out
        // We'll use the extend_ref to generate a signer
        let fa_signer = object::generate_signer_for_extending(&manager.extend_ref);
        coin::transfer<cedra_coin::CedraCoin>(&fa_signer, player_addr, cedra_amount);
    }

    // ============================================
    // GAME FUNCTIONS (called by texas_holdem module)
    // ============================================

    /// Transfer chips from one player to another (internal use)
    /// 
    /// Used by the game contract for pot payouts.
    /// This bypasses normal transfer restrictions.
    /// Restricted to friend modules only.
    public(friend) fun transfer_chips(
        from: address,
        to: address,
        amount: u64
    ) acquires ChipManager {
        assert!(exists<ChipManager>(@holdemgame), E_NOT_INITIALIZED);
        let manager = borrow_global<ChipManager>(@holdemgame);
        
        // Get the stores
        let from_store = primary_fungible_store::primary_store(from, manager.metadata);
        let to_store = primary_fungible_store::ensure_primary_store_exists(to, manager.metadata);
        
        // Use transfer_ref to bypass frozen checks
        fungible_asset::transfer_with_ref(
            &manager.transfer_ref,
            from_store,
            to_store,
            amount
        );
    }

    /// Deduct chips from a player (for betting)
    /// Returns the withdrawn chips as a FungibleAsset
    /// Restricted to friend modules only.
    public(friend) fun deduct_chips_for_bet(
        from: address,
        amount: u64
    ): fungible_asset::FungibleAsset acquires ChipManager {
        assert!(exists<ChipManager>(@holdemgame), E_NOT_INITIALIZED);
        let manager = borrow_global<ChipManager>(@holdemgame);
        
        let from_store = primary_fungible_store::primary_store(from, manager.metadata);
        fungible_asset::withdraw_with_ref(&manager.transfer_ref, from_store, amount)
    }

    /// Award chips to a player (pot payout)
    /// Takes FungibleAsset and deposits to player
    /// Restricted to friend modules only.
    public(friend) fun award_chips(
        to: address,
        chips: fungible_asset::FungibleAsset
    ) acquires ChipManager {
        assert!(exists<ChipManager>(@holdemgame), E_NOT_INITIALIZED);
        let manager = borrow_global<ChipManager>(@holdemgame);
        
        let to_store = primary_fungible_store::ensure_primary_store_exists(to, manager.metadata);
        fungible_asset::deposit_with_ref(&manager.transfer_ref, to_store, chips);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    /// Get a player's chip balance
    public fun balance(player: address): u64 acquires ChipManager {
        if (!exists<ChipManager>(@holdemgame)) { return 0 };
        let manager = borrow_global<ChipManager>(@holdemgame);
        primary_fungible_store::balance(player, manager.metadata)
    }

    #[view]
    /// Get the chip metadata object address
    public fun get_metadata(): Object<Metadata> acquires ChipManager {
        assert!(exists<ChipManager>(@holdemgame), E_NOT_INITIALIZED);
        borrow_global<ChipManager>(@holdemgame).metadata
    }

    #[view]
    /// Get treasury balance (total CEDRA held)
    public fun get_treasury_balance(): u64 acquires ChipManager {
        if (!exists<ChipManager>(@holdemgame)) { return 0 };
        borrow_global<ChipManager>(@holdemgame).treasury_balance
    }

    #[view]
    /// Get exchange rate (chips per CEDRA)
    public fun get_exchange_rate(): u64 {
        CHIPS_PER_CEDRA
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun init_for_test(deployer: &signer) {
        init_module(deployer);
    }

    #[test_only]
    public fun mint_test_chips(to: address, amount: u64) acquires ChipManager {
        let manager = borrow_global<ChipManager>(@holdemgame);
        let chips = fungible_asset::mint(&manager.mint_ref, amount);
        primary_fungible_store::deposit(to, chips);
    }
}
