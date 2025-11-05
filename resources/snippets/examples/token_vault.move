/// Example: Token Vault with Events
/// Built using: module, struct-key, coin-transfer, event-emit, vector-ops snippets
module examples::token_vault {
    use std::signer;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    /// Error codes
    const E_VAULT_EXISTS: u64 = 1;
    const E_VAULT_NOT_FOUND: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_VAULT_LOCKED: u64 = 4;
    const E_NOT_UNLOCKED_YET: u64 = 5;

    /// User's token vault
    /// Created with: struct-key snippet
    struct Vault has key {
        balance: u64,
        unlock_time: u64,
        deposit_history: vector<u64>,
    }

    /// Deposit event
    /// Created with: event-emit snippet
    #[event]
    struct DepositEvent has drop, store {
        user: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    /// Withdrawal event
    #[event]
    struct WithdrawalEvent has drop, store {
        user: address,
        amount: u64,
        remaining_balance: u64,
        timestamp: u64,
    }

    /// Initialize vault with time lock
    /// Created with: fun-entry snippet
    public entry fun initialize_vault(
        account: &signer,
        lock_duration_seconds: u64,
    ) {
        let addr = signer::address_of(account);
        // Used: assert snippet
        assert!(!exists<Vault>(addr), E_VAULT_EXISTS);

        // Used: timestamp snippet
        let current_time = timestamp::now_seconds();
        let unlock_time = current_time + lock_duration_seconds;

        // Used: vector-ops snippet
        let deposit_history = vector::empty<u64>();

        // Used: move-to snippet
        move_to(account, Vault {
            balance: 0,
            unlock_time,
            deposit_history,
        });
    }

    /// Deposit tokens into vault
    /// Created with: fun-entry snippet
    public entry fun deposit(
        account: &signer,
        amount: u64,
    ) acquires Vault {
        let addr = signer::address_of(account);
        assert!(exists<Vault>(addr), E_VAULT_NOT_FOUND);

        // Transfer coins to vault (this module)
        // Used: coin-transfer snippet (modified for receiving)
        coin::transfer<AptosCoin>(account, @examples, amount);

        // Used: borrow-global-mut snippet
        let vault = borrow_global_mut<Vault>(addr);
        vault.balance = vault.balance + amount;

        // Used: vector-ops snippet - record deposit
        vector::push_back(&mut vault.deposit_history, amount);

        // Used: event-emit snippet
        event::emit(DepositEvent {
            user: addr,
            amount,
            new_balance: vault.balance,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Withdraw tokens from vault (only after unlock time)
    /// Created with: fun-entry snippet
    public entry fun withdraw(
        account: &signer,
        amount: u64,
    ) acquires Vault {
        let addr = signer::address_of(account);
        let vault = borrow_global_mut<Vault>(addr);

        // Check unlock time
        let current_time = timestamp::now_seconds();
        assert!(current_time >= vault.unlock_time, E_VAULT_LOCKED);

        // Check balance
        assert!(vault.balance >= amount, E_INSUFFICIENT_BALANCE);

        // Update balance
        vault.balance = vault.balance - amount;

        // Transfer coins back to user
        coin::transfer<AptosCoin>(@examples, addr, amount);

        // Emit event
        event::emit(WithdrawalEvent {
            user: addr,
            amount,
            remaining_balance: vault.balance,
            timestamp: current_time,
        });
    }

    /// Get vault balance
    /// Created with: fun-acquires snippet
    public fun get_balance(addr: address): u64 acquires Vault {
        assert!(exists<Vault>(addr), E_VAULT_NOT_FOUND);
        borrow_global<Vault>(addr).balance
    }

    /// Get unlock time
    public fun get_unlock_time(addr: address): u64 acquires Vault {
        assert!(exists<Vault>(addr), E_VAULT_NOT_FOUND);
        borrow_global<Vault>(addr).unlock_time
    }

    /// Check if vault is unlocked
    public fun is_unlocked(addr: address): bool acquires Vault {
        assert!(exists<Vault>(addr), E_VAULT_NOT_FOUND);
        let vault = borrow_global<Vault>(addr);
        timestamp::now_seconds() >= vault.unlock_time
    }

    /// Get deposit count
    public fun get_deposit_count(addr: address): u64 acquires Vault {
        assert!(exists<Vault>(addr), E_VAULT_NOT_FOUND);
        let vault = borrow_global<Vault>(addr);
        // Used: vector-ops snippet
        vector::length(&vault.deposit_history)
    }

    #[test_only]
    use aptos_framework::account;

    #[test(framework = @0x1, admin = @examples, alice = @0x42)]
    fun test_vault_lifecycle(framework: &signer, admin: &signer, alice: &signer) acquires Vault {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        let (burn_cap, mint_cap) = aptos_framework::aptos_coin::initialize_for_test(framework);

        // Create accounts
        account::create_account_for_test(signer::address_of(alice));
        account::create_account_for_test(signer::address_of(admin));

        // Mint coins to alice
        let coins = coin::mint(1000, &mint_cap);
        coin::deposit(signer::address_of(alice), coins);

        // Initialize vault with 100 second lock
        initialize_vault(alice, 100);

        // Deposit 500 tokens
        deposit(alice, 500);
        assert!(get_balance(signer::address_of(alice)) == 500, 0);
        assert!(get_deposit_count(signer::address_of(alice)) == 1, 1);

        // Try to withdraw before unlock (should fail)
        // This would fail: withdraw(alice, 100);

        // Fast forward time
        timestamp::fast_forward_seconds(101);

        // Now withdrawal should work
        assert!(is_unlocked(signer::address_of(alice)), 2);
        withdraw(alice, 200);
        assert!(get_balance(signer::address_of(alice)) == 300, 3);

        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(framework = @0x1, alice = @0x42)]
    #[expected_failure(abort_code = E_VAULT_EXISTS)]
    fun test_duplicate_initialization(framework: &signer, alice: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        account::create_account_for_test(signer::address_of(alice));
        initialize_vault(alice, 100);
        initialize_vault(alice, 200); // Should fail
    }
}
