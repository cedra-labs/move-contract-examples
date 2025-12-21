// ============================================
// Chips Module Tests
// ============================================
// Tests for chip buy-in, cash-out, and access control

#[test_only]
module holdemgame::chips_tests {
    use std::signer;
    use holdemgame::chips;

    #[test(deployer = @holdemgame)]
    fun test_init_and_balance(deployer: &signer) {
        chips::init_for_test(deployer);
        
        // Initial balance should be 0
        let balance = chips::balance(signer::address_of(deployer));
        assert!(balance == 0, 1);
    }

    #[test(deployer = @holdemgame)]
    fun test_exchange_rate(deployer: &signer) {
        chips::init_for_test(deployer);
        
        // 1 CEDRA = 1000 chips
        assert!(chips::get_exchange_rate() == 1000, 1);
    }

    #[test(deployer = @holdemgame)]
    fun test_treasury_starts_empty(deployer: &signer) {
        chips::init_for_test(deployer);
        
        assert!(chips::get_treasury_balance() == 0, 1);
    }

    #[test(deployer = @holdemgame)]
    fun test_mint_test_chips(deployer: &signer) {
        chips::init_for_test(deployer);
        let deployer_addr = signer::address_of(deployer);
        
        // Mint 1000 test chips
        chips::mint_test_chips(deployer_addr, 1000);
        
        assert!(chips::balance(deployer_addr) == 1000, 1);
    }

    // Note: We cannot directly test that public(friend) functions fail
    // when called from non-friend modules because Move's type system
    // prevents compilation of such calls. The friend restriction is
    // enforced at compile time, not runtime.
    //
    // The fact that this test module can call mint_test_chips (which is
    // test_only) but cannot call transfer_chips (public(friend)) 
    // demonstrates the access control is working.
}
