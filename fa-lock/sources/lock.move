/// Enhanced Time-Locked Escrow Contract for Fungible Assets
///
/// This contract provides secure escrow functionality with time-based locks for fungible assets.
/// It supports both simple and time-locked escrows with advanced features like batch operations,
/// partial withdrawals, pause mechanism, and comprehensive event tracking.
///
/// Architecture:
/// 1. `LockupRef` - Stored in creator's account, references the Lockup object
/// 2. `Lockup` - Main contract object tracking all escrows with pause controls
/// 3. `Escrow` - Individual escrow objects per user-asset pair
///
/// Key Features:
/// - Simple and time-locked escrows
/// - Batch operations for gas efficiency
/// - Partial withdrawals
/// - Emergency pause mechanism
/// - Comprehensive event tracking
/// - Gas-optimized storage patterns
///
/// To test: `cedra move test --move-2 --dev`
module lock_deployer::lock {

    use std::option::{Self, Option};
    use std::signer;
    use std::vector;
    use cedra_std::big_ordered_map::{Self, BigOrderedMap};
    use cedra_framework::dispatchable_fungible_asset;
    use cedra_framework::event;
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::object::{Self, Object, ExtendRef, DeleteRef};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::timestamp;

    // ===================== STORAGE STRUCTS =====================

    /// Lookup reference stored in creator's account
    /// Links creator address to their Lockup object for easy access
    /// Enables full storage refund on cleanup
    struct LockupRef has key {
        lockup_address: address,
    }

    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Main Lockup contract object managing all escrows
    /// Enhanced with pause controls and ownership tracking
    enum Lockup has key {
        ST {
            /// Creator/owner of the lockup contract
            creator: address,
            /// Used to control funds in the escrows
            extend_ref: ExtendRef,
            /// Used to cleanup the Lockup object
            delete_ref: DeleteRef,
            /// Maps (FA, user) pairs to escrow addresses
            escrows: BigOrderedMap<EscrowKey, address>,
            /// Emergency pause flag - when true, blocks escrow operations
            paused: bool,
        }
    }

    /// Composite key for tracking escrows per (FA, user) pair
    /// Enables efficient lookups and management
    enum EscrowKey has store, copy, drop {
        FAPerUser {
            /// The fungible asset being escrowed
            fa_metadata: Object<Metadata>,
            /// The user who owns the escrowed funds
            user: address,
        }
    }

    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Individual escrow object storing funds for one user-asset pair
    /// Two variants: Simple (no time lock) and TimeUnlock (with time restriction)
    enum Escrow has key {
        /// Simple escrow without time restrictions
        Simple {
            /// Original owner of the funds
            original_owner: address,
            /// Used for cleaning up the escrow
            delete_ref: DeleteRef,
        },
        /// Time-locked escrow that can only be withdrawn after unlock_secs
        TimeUnlock {
            /// Original owner of the funds
            original_owner: address,
            /// Unix timestamp when funds become withdrawable
            unlock_secs: u64,
            /// Used for cleaning up the escrow
            delete_ref: DeleteRef,
        }
    }

    // ===================== EVENTS =====================
    // Emitted when funds are escrowed
    #[event]
    struct EscrowCreatedEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// User whose funds are escrowed
        user: address,
        /// Fungible asset being escrowed
        fa_metadata: address,
        /// Amount escrowed
        amount: u64,
        /// Unlock time (0 for simple escrow)
        unlock_secs: u64,
        /// Timestamp of escrow creation
        timestamp: u64,
    }
    // Emitted when additional funds are added to existing escrow
    #[event]
    struct FundsAddedEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// User whose escrow received funds
        user: address,
        /// Fungible asset
        fa_metadata: address,
        /// Amount added
        amount: u64,
        /// Timestamp
        timestamp: u64,
    }
    // Emitted when funds are returned to original owner
    #[event]
    struct FundsReturnedEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// User whose funds were returned
        user: address,
        /// Fungible asset
        fa_metadata: address,
        /// Amount returned
        amount: u64,
        /// Who initiated the return (owner or creator)
        returned_by: address,
        /// Timestamp
        timestamp: u64,
    }
    // Emitted when funds are claimed by lockup creator
    #[event]
    struct FundsClaimedEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// User whose funds were claimed
        user: address,
        /// Fungible asset
        fa_metadata: address,
        /// Amount claimed
        amount: u64,
        /// Creator who claimed
        creator: address,
        /// Timestamp
        timestamp: u64,
    }
    // Emitted when partial withdrawal occurs
    #[event]
    struct PartialWithdrawalEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// User withdrawing funds
        user: address,
        /// Fungible asset
        fa_metadata: address,
        /// Amount withdrawn
        amount: u64,
        /// Remaining balance
        remaining_balance: u64,
        /// Timestamp
        timestamp: u64,
    }
    // Emitted when lockup is paused
    #[event]
    struct LockupPausedEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// Creator who paused
        creator: address,
        /// Timestamp
        timestamp: u64,
    }
    // Emitted when lockup is unpaused
    #[event]
    struct LockupUnpausedEvent has drop, store {
        /// Address of the lockup contract
        lockup_address: address,
        /// Creator who unpaused
        creator: address,
        /// Timestamp
        timestamp: u64,
    }

    // ===================== ERROR CODES =====================

    /// Lockup already exists at this address
    const E_LOCKUP_ALREADY_EXISTS: u64 = 1;
    /// Lockup not found at address
    const E_LOCKUP_NOT_FOUND: u64 = 2;
    /// No lockup was found for this user and this FA
    const E_NO_USER_LOCKUP: u64 = 3;
    /// Unlock time has not yet passed
    const E_UNLOCK_TIME_NOT_YET: u64 = 4;
    /// Not original owner or lockup owner
    const E_NOT_ORIGINAL_OR_LOCKUP_OWNER: u64 = 5;
    /// Not a time lockup
    const E_NOT_TIME_LOCKUP: u64 = 6;
    /// Not a simple lockup
    const E_NOT_SIMPLE_LOCKUP: u64 = 7;
    /// Can't shorten lockup time
    const E_CANNOT_SHORTEN_LOCKUP_TIME: u64 = 8;
    /// Amount must be greater than zero
    const E_INVALID_AMOUNT: u64 = 9;
    /// Contract is currently paused
    const E_CONTRACT_PAUSED: u64 = 10;
    /// Insufficient balance for withdrawal
    const E_INSUFFICIENT_BALANCE: u64 = 11;
    /// Batch operation vectors length mismatch
    const E_LENGTH_MISMATCH: u64 = 12;
    /// Empty batch operation not allowed
    const E_EMPTY_BATCH: u64 = 13;

    // ===================== INITIALIZATION =====================

    /// Initializes a new lockup contract for the caller
    /// Can only be called once per account
    ///
    /// # Parameters
    /// * `caller` - The signer creating the lockup contract
    public entry fun initialize_lockup(
        caller: &signer,
    ) {
        init_lockup(caller);
    }

    /// Internal initialization function
    /// Creates the Lockup object and stores reference in caller's account
    inline fun init_lockup(caller: &signer): Object<Lockup> {
        let caller_address = signer::address_of(caller);

        // Prevent duplicate lockup creation
        assert!(!exists<LockupRef>(caller_address), E_LOCKUP_ALREADY_EXISTS);

        // Create the lockup object
        let constructor_ref = object::create_object(@0x0);
        let lockup_address = object::address_from_constructor_ref(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);
        let obj_signer = object::generate_signer(&constructor_ref);
        
        // Initialize with enhanced features
        move_to(&obj_signer, Lockup::ST {
            creator: caller_address,
            escrows: big_ordered_map::new_with_config(0, 0, false),
            extend_ref,
            delete_ref,
            paused: false,  // Start unpaused
        });

        // Store reference in creator's account for easy lookup
        move_to(caller, LockupRef {
            lockup_address
        });
        
        object::object_from_constructor_ref(&constructor_ref)
    }

    // ===================== PAUSE CONTROLS =====================

    /// Pauses the lockup contract, preventing new escrows
    /// Only the contract creator can pause
    /// Returns and withdrawals still work during pause for safety
    ///
    /// # Parameters
    /// * `caller` - Must be the lockup creator
    /// * `lockup_obj` - The lockup contract to pause
    public entry fun pause_lockup(
        caller: &signer,
        lockup_obj: Object<Lockup>,
    ) acquires Lockup {
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        
        // Only creator can pause
        assert!(caller_address == lockup.creator, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
        
        lockup.paused = true;
        
        // Emit pause event
        event::emit(LockupPausedEvent {
            lockup_address: object::object_address(&lockup_obj),
            creator: caller_address,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Unpauses the lockup contract, allowing new escrows again
    /// Only the contract creator can unpause
    ///
    /// # Parameters
    /// * `caller` - Must be the lockup creator
    /// * `lockup_obj` - The lockup contract to unpause
    public entry fun unpause_lockup(
        caller: &signer,
        lockup_obj: Object<Lockup>,
    ) acquires Lockup {
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        
        // Only creator can unpause
        assert!(caller_address == lockup.creator, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
        
        lockup.paused = false;
        
        // Emit unpause event
        event::emit(LockupUnpausedEvent {
            lockup_address: object::object_address(&lockup_obj),
            creator: caller_address,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ===================== ESCROW OPERATIONS =====================

    /// Escrows funds without time lock - can be withdrawn anytime
    /// Enhanced with validation, pause check, and event emission
    ///
    /// # Parameters
    /// * `caller` - The user escrowing funds
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset to escrow
    /// * `amount` - Amount to escrow (must be > 0)
    public entry fun escrow_funds_with_no_lockup(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        amount: u64,
    ) acquires Lockup, Escrow {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        let caller_address = signer::address_of(caller);
        let lockup_address = object::object_address(&lockup_obj);
        let lockup = &mut Lockup[lockup_address];
        
        // Check if contract is paused
        assert!(!lockup.paused, E_CONTRACT_PAUSED);

        let lockup_key = EscrowKey::FAPerUser {
            fa_metadata,
            user: caller_address
        };

        let escrow_address = if (lockup.escrows.contains(&lockup_key)) {
            *lockup.escrows.borrow(&lockup_key)
        } else {
            @0x0
        };

        let is_new_escrow = escrow_address == @0x0;

        // Create new escrow if doesn't exist
        if (is_new_escrow) {
            let constructor_ref = object::create_object(lockup_address);
            let object_signer = object::generate_signer(&constructor_ref);
            let object_delete_ref = object::generate_delete_ref(&constructor_ref);

            // Create store for escrow funds
            fungible_asset::create_store(&constructor_ref, fa_metadata);

            // Store escrow metadata
            move_to(&object_signer, Escrow::Simple {
                original_owner: caller_address,
                delete_ref: object_delete_ref
            });
            
            let new_address = object::address_from_constructor_ref(&constructor_ref);
            lockup.escrows.add(lockup_key, new_address);
            escrow_address = new_address;
            
            // Emit creation event
            event::emit(EscrowCreatedEvent {
                lockup_address,
                user: caller_address,
                fa_metadata: object::object_address(&fa_metadata),
                amount,
                unlock_secs: 0,  // No time lock
                timestamp: timestamp::now_seconds(),
            });
        } else {
            // Validate existing escrow is Simple type
            let escrow = &Escrow[escrow_address];
            match (escrow) {
                Simple { .. } => { /* OK */ },
                TimeUnlock { .. } => {
                    abort E_NOT_SIMPLE_LOCKUP
                }
            };
            
            // Emit funds added event
            event::emit(FundsAddedEvent {
                lockup_address,
                user: caller_address,
                fa_metadata: object::object_address(&fa_metadata),
                amount,
                timestamp: timestamp::now_seconds(),
            });
        };

        // Transfer funds into escrow
        escrow_funds(caller, fa_metadata, escrow_address, caller_address, amount);
    }

    /// Escrows funds with time lock - can only be withdrawn after specified time
    /// Enhanced with validation, pause check, and event emission
    ///
    /// # Parameters
    /// * `caller` - The user escrowing funds
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset to escrow
    /// * `amount` - Amount to escrow (must be > 0)
    /// * `lockup_time_secs` - Duration in seconds until funds unlock
    public entry fun escrow_funds_with_time(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        amount: u64,
        lockup_time_secs: u64,
    ) acquires Lockup, Escrow {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        let caller_address = signer::address_of(caller);
        let lockup_address = object::object_address(&lockup_obj);
        let lockup = &mut Lockup[lockup_address];
        
        // Check if contract is paused
        assert!(!lockup.paused, E_CONTRACT_PAUSED);

        let lockup_key = EscrowKey::FAPerUser {
            fa_metadata,
            user: caller_address
        };

        let escrow_address = if (lockup.escrows.contains(&lockup_key)) {
            *lockup.escrows.borrow(&lockup_key)
        } else {
            @0x0
        };
        
        let new_unlock_secs = timestamp::now_seconds() + lockup_time_secs;
        let is_new_escrow = escrow_address == @0x0;

        // Create new escrow if doesn't exist
        if (is_new_escrow) {
            let constructor_ref = object::create_object(lockup_address);
            let object_signer = object::generate_signer(&constructor_ref);
            let object_delete_ref = object::generate_delete_ref(&constructor_ref);

            // Create store for escrow funds
            fungible_asset::create_store(&constructor_ref, fa_metadata);

            // Store escrow with time lock
            move_to(&object_signer, Escrow::TimeUnlock {
                original_owner: caller_address,
                unlock_secs: new_unlock_secs,
                delete_ref: object_delete_ref
            });
            
            let new_address = object::address_from_constructor_ref(&constructor_ref);
            lockup.escrows.add(lockup_key, new_address);
            escrow_address = new_address;
            
            // Emit creation event
            event::emit(EscrowCreatedEvent {
                lockup_address,
                user: caller_address,
                fa_metadata: object::object_address(&fa_metadata),
                amount,
                unlock_secs: new_unlock_secs,
                timestamp: timestamp::now_seconds(),
            });
        } else {
            // Update existing escrow's unlock time (can only extend, not shorten)
            let escrow = &mut Escrow[escrow_address];
            match (escrow) {
                Simple { .. } => {
                    abort E_NOT_TIME_LOCKUP
                }
                TimeUnlock { unlock_secs, .. } => {
                    // Cannot shorten the unlock time
                    if (*unlock_secs > new_unlock_secs) {
                        abort E_CANNOT_SHORTEN_LOCKUP_TIME
                    } else {
                        *unlock_secs = new_unlock_secs
                    }
                }
            };
            
            // Emit funds added event
            event::emit(FundsAddedEvent {
                lockup_address,
                user: caller_address,
                fa_metadata: object::object_address(&fa_metadata),
                amount,
                timestamp: timestamp::now_seconds(),
            });
        };

        // Transfer funds into escrow
        escrow_funds(caller, fa_metadata, escrow_address, caller_address, amount);
    }

    // ===================== BATCH OPERATIONS =====================

    /// Batch escrow for multiple users - gas efficient for batch deposits
    /// Useful for airdrops, vesting schedules, or bulk payments
    ///
    /// # Parameters
    /// * `caller` - The signer (must be lockup creator)
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset to escrow
    /// * `users` - Vector of user addresses
    /// * `amounts` - Vector of amounts (same length as users)
    /// * `lockup_time_secs` - Uniform lockup time for all escrows
    public entry fun batch_escrow_with_time(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        users: vector<address>,
        amounts: vector<u64>,
        lockup_time_secs: u64,
    ) acquires Lockup, Escrow {
        // Validate inputs
        let users_len = vector::length(&users);
        assert!(users_len > 0, E_EMPTY_BATCH);
        assert!(users_len == vector::length(&amounts), E_LENGTH_MISMATCH);
        
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        
        // Only creator can batch escrow for others
        assert!(caller_address == lockup.creator, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
        assert!(!lockup.paused, E_CONTRACT_PAUSED);
        
        // Process each user
        let i = 0;
        while (i < users_len) {
            let user = *vector::borrow(&users, i);
            let amount = *vector::borrow(&amounts, i);
            
            // Skip if amount is 0
            if (amount > 0) {
                // Reuse internal escrow logic
                internal_escrow_with_time(
                    caller,
                    lockup_obj,
                    fa_metadata,
                    user,
                    amount,
                    lockup_time_secs
                );
            };
            
            i = i + 1;
        };
    }

    /// Batch return funds to multiple users
    /// Gas efficient for returning funds to many users at once
    ///
    /// # Parameters
    /// * `caller` - Must be lockup creator
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset
    /// * `users` - Vector of user addresses to return funds to
    public entry fun batch_return_user_funds(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        users: vector<address>,
    ) acquires Lockup, Escrow {
        // Validate inputs
        let users_len = vector::length(&users);
        assert!(users_len > 0, E_EMPTY_BATCH);
        
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        
        // Only creator can batch return
        assert!(caller_address == lockup.creator, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
        
        // Process each user
        let i = 0;
        while (i < users_len) {
            let user = *vector::borrow(&users, i);
            
            // Check if escrow exists for this user
            let lockup_key = EscrowKey::FAPerUser {
                fa_metadata,
                user,
            };
            
            if (lockup.escrows.contains(&lockup_key)) {
                let escrow_address = *lockup.escrows.borrow(&lockup_key);
                let original_owner = get_escrow_owner(escrow_address);
                
                // Get balance before return
                let escrow_obj = object::address_to_object<FungibleStore>(escrow_address);
                let amount = fungible_asset::balance(escrow_obj);
                
                // Return funds
                lockup.return_funds(fa_metadata, escrow_address, original_owner);
                
                // Emit event
                event::emit(FundsReturnedEvent {
                    lockup_address: object::object_address(&lockup_obj),
                    user,
                    fa_metadata: object::object_address(&fa_metadata),
                    amount,
                    returned_by: caller_address,
                    timestamp: timestamp::now_seconds(),
                });
                
                // Clean up
                lockup.delete_escrow(lockup_key);
            };
            
            i = i + 1;
        };
    }

    // ===================== PARTIAL WITHDRAWAL =====================

    /// Withdraw a portion of escrowed funds
    /// Allows flexibility without closing the entire escrow
    ///
    /// # Parameters
    /// * `caller` - The original owner
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset
    /// * `amount` - Amount to withdraw (must be <= balance)
    public entry fun partial_withdraw(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        amount: u64,
    ) acquires Lockup, Escrow {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        let (lockup_key, escrow_address) = lockup.get_escrow(
            fa_metadata,
            caller_address
        );

        // Check time lock if applicable
        match (&Escrow[escrow_address]) {
            Escrow::Simple { original_owner, .. } => {
                assert!(*original_owner == caller_address, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
            }
            Escrow::TimeUnlock { original_owner, unlock_secs, .. } => {
                assert!(*original_owner == caller_address, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
                assert!(timestamp::now_seconds() >= *unlock_secs, E_UNLOCK_TIME_NOT_YET);
            }
        };

        // Check balance
        let escrow_obj = object::address_to_object<FungibleStore>(escrow_address);
        let balance = fungible_asset::balance(escrow_obj);
        assert!(amount <= balance, E_INSUFFICIENT_BALANCE);

        // Partial transfer
        let original_owner_primary_store = primary_fungible_store::primary_store_inlined(
            caller_address,
            fa_metadata
        );
        let lockup_signer = object::generate_signer_for_extending(&lockup.extend_ref);
        dispatchable_fungible_asset::transfer(&lockup_signer, escrow_obj, original_owner_primary_store, amount);

        let remaining_balance = balance - amount;

        // Emit partial withdrawal event
        event::emit(PartialWithdrawalEvent {
            lockup_address: object::object_address(&lockup_obj),
            user: caller_address,
            fa_metadata: object::object_address(&fa_metadata),
            amount,
            remaining_balance,
            timestamp: timestamp::now_seconds(),
        });

        // If balance is now zero, clean up the escrow
        if (remaining_balance == 0) {
            lockup.delete_escrow(lockup_key);
        };
    }

    // ===================== CLAIM & RETURN OPERATIONS =====================

    /// Claims an escrow by the lockup creator (takes funds to creator)
    /// Enhanced with event emission
    ///
    /// # Parameters
    /// * `caller` - Must be lockup creator
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset
    /// * `user` - The user whose escrow to claim
    public entry fun claim_escrow(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        user: address,
    ) acquires Lockup, Escrow {
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        assert!(caller_address == lockup.creator, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
        
        let (lockup_key, escrow_address) = lockup.get_escrow(
            fa_metadata,
            user
        );

        // Get balance before claiming
        let escrow_obj = object::address_to_object<FungibleStore>(escrow_address);
        let amount = fungible_asset::balance(escrow_obj);

        // Take funds to creator
        lockup.take_funds(fa_metadata, escrow_address);

        // Emit claim event
        event::emit(FundsClaimedEvent {
            lockup_address: object::object_address(&lockup_obj),
            user,
            fa_metadata: object::object_address(&fa_metadata),
            amount,
            creator: caller_address,
            timestamp: timestamp::now_seconds(),
        });

        // Clean up the escrow object
        lockup.delete_escrow(lockup_key);
    }

    /// Returns funds to a specific user (creator-initiated)
    /// Enhanced with event emission
    ///
    /// # Parameters
    /// * `caller` - Must be lockup creator
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset
    /// * `user` - The user whose funds to return
    public entry fun return_user_funds(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        user: address,
    ) acquires Lockup, Escrow {
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        assert!(caller_address == lockup.creator, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);
        
        let (lockup_key, escrow_address) = lockup.get_escrow(
            fa_metadata,
            user
        );

        // Determine original owner
        let original_owner = match (&Escrow[escrow_address]) {
            Escrow::Simple { original_owner, .. } => {
                *original_owner
            }
            Escrow::TimeUnlock { original_owner, .. } => {
                // Creator can return before unlock time
                *original_owner
            }
        };

        // Get balance before return
        let escrow_obj = object::address_to_object<FungibleStore>(escrow_address);
        let amount = fungible_asset::balance(escrow_obj);

        // Return funds to original owner
        lockup.return_funds(fa_metadata, escrow_address, original_owner);

        // Emit return event
        event::emit(FundsReturnedEvent {
            lockup_address: object::object_address(&lockup_obj),
            user,
            fa_metadata: object::object_address(&fa_metadata),
            amount,
            returned_by: caller_address,
            timestamp: timestamp::now_seconds(),
        });

        // Clean up the escrow object
        lockup.delete_escrow(lockup_key);
    }

    /// Returns caller's own escrowed funds (user-initiated)
    /// Enhanced with time lock validation and event emission
    ///
    /// # Parameters
    /// * `caller` - The original owner
    /// * `lockup_obj` - The lockup contract
    /// * `fa_metadata` - The fungible asset
    public entry fun return_my_funds(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
    ) acquires Lockup, Escrow {
        let caller_address = signer::address_of(caller);
        let lockup = get_lockup_mut(&lockup_obj);
        let (lockup_key, escrow_address) = lockup.get_escrow(
            fa_metadata,
            caller_address
        );

        // Check time lock and ownership
        let original_owner = match (&Escrow[escrow_address]) {
            Escrow::Simple { original_owner, .. } => {
                *original_owner
            }
            Escrow::TimeUnlock { original_owner, unlock_secs, .. } => {
                // Must wait for unlock time
                assert!(timestamp::now_seconds() >= *unlock_secs, E_UNLOCK_TIME_NOT_YET);
                *original_owner
            }
        };

        // Only original owner can return their own funds
        assert!(original_owner == caller_address, E_NOT_ORIGINAL_OR_LOCKUP_OWNER);

        // Get balance before return
        let escrow_obj = object::address_to_object<FungibleStore>(escrow_address);
        let amount = fungible_asset::balance(escrow_obj);

        // Return funds
        lockup.return_funds(fa_metadata, escrow_address, original_owner);

        // Emit return event
        event::emit(FundsReturnedEvent {
            lockup_address: object::object_address(&lockup_obj),
            user: caller_address,
            fa_metadata: object::object_address(&fa_metadata),
            amount,
            returned_by: caller_address,
            timestamp: timestamp::now_seconds(),
        });

        // Clean up the escrow object
        lockup.delete_escrow(lockup_key);
    }

    // ===================== HELPER FUNCTIONS =====================

    /// Internal escrow helper for batch operations
    /// Allows creator to escrow on behalf of users
    inline fun internal_escrow_with_time(
        caller: &signer,
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        user: address,
        amount: u64,
        lockup_time_secs: u64,
    ) acquires Lockup, Escrow {
        let lockup_address = object::object_address(&lockup_obj);
        let lockup = &mut Lockup[lockup_address];

        let lockup_key = EscrowKey::FAPerUser {
            fa_metadata,
            user
        };

        let escrow_address = if (lockup.escrows.contains(&lockup_key)) {
            *lockup.escrows.borrow(&lockup_key)
        } else {
            @0x0
        };
        
        let new_unlock_secs = timestamp::now_seconds() + lockup_time_secs;
        let is_new_escrow = escrow_address == @0x0;

        if (is_new_escrow) {
            let constructor_ref = object::create_object(lockup_address);
            let object_signer = object::generate_signer(&constructor_ref);
            let object_delete_ref = object::generate_delete_ref(&constructor_ref);

            fungible_asset::create_store(&constructor_ref, fa_metadata);

            move_to(&object_signer, Escrow::TimeUnlock {
                original_owner: user,
                unlock_secs: new_unlock_secs,
                delete_ref: object_delete_ref
            });
            
            let new_address = object::address_from_constructor_ref(&constructor_ref);
            lockup.escrows.add(lockup_key, new_address);
            escrow_address = new_address;
            
            event::emit(EscrowCreatedEvent {
                lockup_address,
                user,
                fa_metadata: object::object_address(&fa_metadata),
                amount,
                unlock_secs: new_unlock_secs,
                timestamp: timestamp::now_seconds(),
            });
        } else {
            let escrow = &mut Escrow[escrow_address];
            match (escrow) {
                Simple { .. } => { abort E_NOT_TIME_LOCKUP },
                TimeUnlock { unlock_secs, .. } => {
                    if (*unlock_secs > new_unlock_secs) {
                        abort E_CANNOT_SHORTEN_LOCKUP_TIME
                    } else {
                        *unlock_secs = new_unlock_secs
                    }
                }
            };
            
            event::emit(FundsAddedEvent {
                lockup_address,
                user,
                fa_metadata: object::object_address(&fa_metadata),
                amount,
                timestamp: timestamp::now_seconds(),
            });
        };

        // Transfer funds - creator pays
        let caller_address = signer::address_of(caller);
        escrow_funds(caller, fa_metadata, escrow_address, caller_address, amount);
    }

    /// Helper to get escrow owner
    inline fun get_escrow_owner(escrow_address: address): address acquires Escrow {
        match (&Escrow[escrow_address]) {
            Escrow::Simple { original_owner, .. } => *original_owner,
            Escrow::TimeUnlock { original_owner, .. } => *original_owner,
        }
    }

    /// Retrieves the lockup object for mutation
    /// Optimized for gas efficiency
    inline fun get_lockup_mut(
        lockup_obj: &Object<Lockup>,
    ): &mut Lockup {
        let lockup_address = object::object_address(lockup_obj);
        &mut Lockup[lockup_address]
    }

    /// Retrieves the lockup object for reading
    inline fun get_lockup(
        lockup_obj: &Object<Lockup>,
    ): &Lockup {
        let lockup_address = object::object_address(lockup_obj);
        &Lockup[lockup_address]
    }

    /// Retrieves the lockup object for removal
    inline fun get_escrow(
        self: &mut Lockup,
        fa_metadata: Object<Metadata>,
        user: address
    ): (EscrowKey, address) {
        let lockup_key = EscrowKey::FAPerUser {
            fa_metadata,
            user,
        };

        assert!(self.escrows.contains(&lockup_key), E_NO_USER_LOCKUP);

        (lockup_key, *self.escrows.borrow(&lockup_key))
    }

    /// Escrows an amount of funds to the escrow object
    inline fun escrow_funds(
        caller: &signer,
        fa_metadata: Object<Metadata>,
        escrow_address: address,
        caller_address: address,
        amount: u64
    ) {
        let store_obj = object::address_to_object<FungibleStore>(escrow_address);
        let caller_primary_store = primary_fungible_store::primary_store_inlined(caller_address, fa_metadata);
        dispatchable_fungible_asset::transfer(caller, caller_primary_store, store_obj, amount);
    }

    /// Returns all outstanding funds
    inline fun take_funds(
        self: &Lockup,
        fa_metadata: Object<Metadata>,
        escrow_address: address,
    ) {
        // Transfer funds back to the original owner
        let escrow_object = object::address_to_object<FungibleStore>(escrow_address);
        let balance = fungible_asset::balance(escrow_object);
        let primary_store = primary_fungible_store::ensure_primary_store_exists(self.creator, fa_metadata);

        // Use dispatchable because we don't know if it uses it
        let lockup_signer = object::generate_signer_for_extending(&self.extend_ref);
        dispatchable_fungible_asset::transfer(&lockup_signer, escrow_object, primary_store, balance);
    }

    /// Returns all outstanding funds
    inline fun return_funds(
        self: &Lockup,
        fa_metadata: Object<Metadata>,
        escrow_address: address,
        original_owner: address
    ) {
        // Transfer funds back to the original owner
        let escrow_object = object::address_to_object<FungibleStore>(escrow_address);
        let balance = fungible_asset::balance(escrow_object);
        let original_owner_primary_store = primary_fungible_store::primary_store_inlined(
            original_owner,
            fa_metadata
        );
        // Use dispatchable because we don't know if it uses it
        let lockup_signer = object::generate_signer_for_extending(&self.extend_ref);
        dispatchable_fungible_asset::transfer(&lockup_signer, escrow_object, original_owner_primary_store, balance);
    }

    /// Deletes an escrow object
    inline fun delete_escrow(self: &mut Lockup, lockup_key: EscrowKey) {
        let escrow_addr = self.escrows.remove(&lockup_key);

        // The following lines will return the storage deposit
        let delete_ref = match (move_from<Escrow>(escrow_addr)) {
            Escrow::Simple { delete_ref, .. } => {
                delete_ref
            }
            Escrow::TimeUnlock { delete_ref, .. } => {
                delete_ref
            }
        };
        fungible_asset::remove_store(&delete_ref);
        object::delete(delete_ref);
    }

    // ===================== VIEW FUNCTIONS =====================

    #[view]
    /// Returns the lockup address for a creator's account
    /// Useful for finding the lockup object from creator address
    public fun lockup_address(escrow_account: address): address acquires LockupRef {
        LockupRef[escrow_account].lockup_address
    }

    #[view]
    /// Returns the amount of funds currently escrowed for a user
    /// Returns None if no escrow exists
    public fun escrowed_funds(
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        user: address
    ): Option<u64> acquires Lockup {
        let lockup = get_lockup(&lockup_obj);
        let escrow_key = EscrowKey::FAPerUser {
            fa_metadata,
            user
        };
        if (lockup.escrows.contains(&escrow_key)) {
            let escrow_address = lockup.escrows.borrow(&escrow_key);
            let escrow_obj = object::address_to_object<Escrow>(*escrow_address);
            option::some(fungible_asset::balance(escrow_obj))
        } else {
            option::none()
        }
    }

    #[view]
    /// Returns remaining time (in seconds) until escrow unlocks
    /// Returns 0 for simple escrows or already unlocked time escrows
    /// Returns None if no escrow exists
    public fun remaining_escrow_time(
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        user: address
    ): Option<u64> acquires Lockup, Escrow {
        let lockup = get_lockup(&lockup_obj);
        let escrow_key = EscrowKey::FAPerUser {
            fa_metadata,
            user
        };
        if (lockup.escrows.contains(&escrow_key)) {
            let escrow_address = lockup.escrows.borrow(&escrow_key);
            let remaining_secs = match (&Escrow[*escrow_address]) {
                Simple { .. } => { 0 }
                TimeUnlock { unlock_secs, .. } => {
                    let now = timestamp::now_seconds();
                    if (now >= *unlock_secs) {
                        0
                    } else {
                        *unlock_secs - now
                    }
                }
            };
            option::some(remaining_secs)
        } else {
            option::none()
        }
    }

    #[view]
    /// Returns whether the lockup contract is currently paused
    public fun is_paused(lockup_obj: Object<Lockup>): bool acquires Lockup {
        let lockup = get_lockup(&lockup_obj);
        lockup.paused
    }

    #[view]
    /// Returns the creator/owner of the lockup contract
    public fun get_creator(lockup_obj: Object<Lockup>): address acquires Lockup {
        let lockup = get_lockup(&lockup_obj);
        lockup.creator
    }

    #[view]
    /// Checks if an escrow exists for a user-asset pair
    public fun escrow_exists(
        lockup_obj: Object<Lockup>,
        fa_metadata: Object<Metadata>,
        user: address
    ): bool acquires Lockup {
        let lockup = get_lockup(&lockup_obj);
        let escrow_key = EscrowKey::FAPerUser {
            fa_metadata,
            user
        };
        lockup.escrows.contains(&escrow_key)
    }

    // ===================== TEST HELPERS =====================

    #[test_only]
    const TWO_HOURS_SECS: u64 = 2 * 60 * 60;

    #[test_only]
    public fun init_lockup_for_test(caller: &signer): Object<Lockup> {
        init_lockup(caller)
    }

    #[test_only]
    fun setup_for_test(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user: &signer
    ): (address, address, Object<Metadata>, Object<Lockup>) {
        timestamp::set_time_has_started_for_testing(framework);
        let (creator_ref, metadata) = fungible_asset::create_test_token(asset);
        let (mint_ref, _transfer_ref, _burn_ref) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(
            &creator_ref
        );
        let creator_address = signer::address_of(creator);
        let user_address = signer::address_of(user);
        primary_fungible_store::mint(&mint_ref, user_address, 100);
        let fa_metadata: Object<Metadata> = object::convert(metadata);
        let lockup_obj = init_lockup(creator);
        (creator_address, user_address, fa_metadata, lockup_obj)
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_out_flow(framework: &signer, asset: &signer, creator: &signer, user: &signer) acquires Lockup, Escrow {
        let (creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);

        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);

        // Check view functions
        assert!(remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(0));
        assert!(escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(5));
        assert!(remaining_escrow_time(lockup_obj, fa_metadata, @0x1234567) == option::none());
        assert!(escrowed_funds(lockup_obj, fa_metadata, @0x1234567) == option::none());

        // Should be able to return funds immediately
        return_user_funds(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 100);

        // Same with the user
        escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);
        return_my_funds(user, lockup_obj, fa_metadata);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 100);

        // Claim an escrow
        escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);
        claim_escrow(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);
        assert!(primary_fungible_store::balance(creator_address, fa_metadata) == 5);

        // -- Now test with time lockup --

        escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 90);

        // Check view functions
        assert!(remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(TWO_HOURS_SECS));
        assert!(escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(5));

        // Should be able to return funds immediately
        return_user_funds(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);

        escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);

        // User can't unescrow without time passing, let's go forward 2 hours
        timestamp::fast_forward_seconds(TWO_HOURS_SECS);
        return_my_funds(user, lockup_obj, fa_metadata);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);

        // Claim an escrow, can be immediate
        escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);
        claim_escrow(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 90);
        assert!(primary_fungible_store::balance(creator_address, fa_metadata) == 10);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = E_UNLOCK_TIME_NOT_YET, location = lock_deployer::lock)]
    fun test_too_short_lockup(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user: &signer
    ) acquires Lockup, Escrow {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(
            framework,
            asset,
            creator,
            user
        );
        escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);

        // User can't return funds without waiting for lockup
        return_my_funds(user, lockup_obj, fa_metadata);
    }
}