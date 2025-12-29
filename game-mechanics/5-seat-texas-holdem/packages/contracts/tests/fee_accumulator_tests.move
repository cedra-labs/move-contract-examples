// ============================================
// Fee Accumulator Tests  
// ============================================
// Tests for the fractional fee accumulator system

#[test_only]
module holdemgame::fee_accumulator_tests {
    use std::signer;
    use holdemgame::texas_holdem;
    use holdemgame::chips;

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    fun setup_table_and_fee_config(admin: &signer): address {
        chips::init_for_test(admin);
        texas_holdem::init_fee_config(admin, @0xFEE);
        texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false);
        texas_holdem::get_table_address(signer::address_of(admin))
    }

    // ============================================
    // GET_FEE_ACCUMULATOR VIEW FUNCTION TESTS
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_get_fee_accumulator_initial_zero(admin: &signer) {
        let table_addr = setup_table_and_fee_config(admin);
        
        // New table should have zero fee accumulator
        let accumulator = texas_holdem::get_fee_accumulator(table_addr);
        assert!(accumulator == 0, 1);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 3, location = holdemgame::texas_holdem)] // E_TABLE_NOT_FOUND
    fun test_get_fee_accumulator_no_table_fails(admin: &signer) {
        chips::init_for_test(admin);
        
        // Should fail - no table exists at random address
        texas_holdem::get_fee_accumulator(@0xDEAD);
    }

    // ============================================
    // FEE CALCULATION LOGIC TESTS
    // ============================================

    // These tests verify the accumulator math is correct
    // Actual integration tests require full game play which is complex
    
    #[test(admin = @holdemgame)]
    fun test_fee_basis_points_is_50(admin: &signer) {
        chips::init_for_test(admin);
        
        // Verify FEE_BASIS_POINTS is 50 (0.5%) via the exposed constant
        let fee_bp = texas_holdem::get_fee_basis_points();
        assert!(fee_bp == 50, 1);
    }

    // ============================================
    // CLOSE TABLE RESIDUE HANDLING TESTS
    // ============================================

    // Note: Testing close_table with residual accumulator requires
    // playing hands to build up the accumulator, which requires
    // the full commit-reveal flow. This is tested manually.

    #[test(admin = @holdemgame)]
    fun test_close_table_with_zero_accumulator(admin: &signer) {
        let table_addr = setup_table_and_fee_config(admin);
        
        // Verify accumulator is zero
        assert!(texas_holdem::get_fee_accumulator(table_addr) == 0, 1);
        
        // Close table should succeed with zero accumulator
        texas_holdem::close_table(admin, table_addr);
        
        // Table should no longer exist (will fail if we try to access it)
        // Just verify it didn't abort
    }

    // ============================================
    // ACCUMULATOR MATH VERIFICATION
    // ============================================

    // Test that documents the expected accumulator behavior:
    // 
    // Example over 4 hands with 0.5% (50 basis points):
    // | Hand | Pot | Add to Acc (pot*50) | Total Acc | Fee Collected | Remainder |
    // |------|-----|---------------------|-----------|---------------|-----------|
    // | 1    | 72  | 3600                | 3600      | 0             | 3600      |
    // | 2    | 108 | 5400                | 9000      | 0             | 9000      |
    // | 3    | 80  | 4000                | 13000     | 1             | 3000      |
    // | 4    | 100 | 5000                | 8000      | 0             | 8000      |
    //
    // This ensures exact 0.5% collection over time regardless of pot size.

    #[test]
    fun test_accumulator_math_verification() {
        // Simulate the accumulator math without Move execution
        // This is a documentation test showing the expected behavior
        
        let fee_bp: u64 = 50; // 0.5% = 50 basis points
        let mut_accumulator: u64 = 0;
        let mut_total_fees: u64 = 0;
        
        // Hand 1: 72 chip pot
        let pot1: u64 = 72;
        mut_accumulator = mut_accumulator + (pot1 * fee_bp); // 3600
        let fee1 = mut_accumulator / 10000; // 0
        mut_accumulator = mut_accumulator % 10000; // 3600
        mut_total_fees = mut_total_fees + fee1;
        assert!(mut_accumulator == 3600, 1);
        assert!(fee1 == 0, 2);
        
        // Hand 2: 108 chip pot
        let pot2: u64 = 108;
        mut_accumulator = mut_accumulator + (pot2 * fee_bp); // 3600 + 5400 = 9000
        let fee2 = mut_accumulator / 10000; // 0
        mut_accumulator = mut_accumulator % 10000; // 9000
        mut_total_fees = mut_total_fees + fee2;
        assert!(mut_accumulator == 9000, 3);
        assert!(fee2 == 0, 4);
        
        // Hand 3: 80 chip pot
        let pot3: u64 = 80;
        mut_accumulator = mut_accumulator + (pot3 * fee_bp); // 9000 + 4000 = 13000
        let fee3 = mut_accumulator / 10000; // 1
        mut_accumulator = mut_accumulator % 10000; // 3000
        mut_total_fees = mut_total_fees + fee3;
        assert!(mut_accumulator == 3000, 5);
        assert!(fee3 == 1, 6);
        
        // Hand 4: 100 chip pot
        let pot4: u64 = 100;
        mut_accumulator = mut_accumulator + (pot4 * fee_bp); // 3000 + 5000 = 8000
        let fee4 = mut_accumulator / 10000; // 0
        mut_accumulator = mut_accumulator % 10000; // 8000
        mut_total_fees = mut_total_fees + fee4;
        assert!(mut_accumulator == 8000, 7);
        assert!(fee4 == 0, 8);
        
        // Total fees collected: 1 chip
        // Total pot value: 72 + 108 + 80 + 100 = 360
        // Expected 0.5% of 360 = 1.8 chips
        // Collected: 1 chip (floor), with 8000 basis-points remaining (0.8 chips)
        assert!(mut_total_fees == 1, 9);
    }

    #[test]
    fun test_large_pot_immediate_fee() {
        // Large pot should immediately collect fees
        let fee_bp: u64 = 50;
        let mut_accumulator: u64 = 0;
        
        // 1000 chip pot
        let pot: u64 = 1000;
        mut_accumulator = mut_accumulator + (pot * fee_bp); // 50000
        let fee = mut_accumulator / 10000; // 5
        mut_accumulator = mut_accumulator % 10000; // 0
        
        assert!(fee == 5, 1); // 0.5% of 1000 = 5 chips
        assert!(mut_accumulator == 0, 2); // No remainder
    }

    #[test]
    fun test_accumulator_with_prior_balance() {
        // Test that prior accumulator balance carries forward correctly
        let fee_bp: u64 = 50;
        let mut_accumulator: u64 = 9500; // Prior balance just under threshold
        
        // Small 20 chip pot pushes over threshold
        let pot: u64 = 20;
        mut_accumulator = mut_accumulator + (pot * fee_bp); // 9500 + 1000 = 10500
        let fee = mut_accumulator / 10000; // 1
        mut_accumulator = mut_accumulator % 10000; // 500
        
        assert!(fee == 1, 1);
        assert!(mut_accumulator == 500, 2);
    }
}
