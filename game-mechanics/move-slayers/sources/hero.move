/// Hero module - Manages player characters, inventory, equipment, and progression
module move_slayers::hero {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use move_slayers::enemies::{Self, Enemy};

    // ==================== Constants ====================

    /// Item type constants
    const TYPE_SWORD: u8 = 0;
    const TYPE_SHIELD: u8 = 1;
    const TYPE_ARMOR: u8 = 2;
    const TYPE_POTION: u8 = 3;

    /// Error codes
    const E_PLAYER_ALREADY_EXISTS: u64 = 1;
    const E_PLAYER_NOT_EXISTS: u64 = 2;
    const E_PLAYER_DEAD: u64 = 3;
    const E_INVALID_ITEM_TYPE: u64 = 4;

    // ==================== Structs ====================

    /// Represents an in-game item (weapon, armor, or consumable)
    struct Item has copy, drop, store {
        id: u64,
        name: String,
        item_type: u8,
        power: u64,
    }

    /// Represents a player character with stats, inventory, and equipment
    struct Player has key {
        level: u8,
        exp: u64,
        health: u64,
        mana: u64,
        max_health: u64,
        max_mana: u64,
        inventory: vector<Item>,
        equipped_sword: Option<Item>,
        equipped_shield: Option<Item>,
        equipped_armor: Option<Item>,
    }

    // ==================== Player Management ====================

    /// Initialize a new player with base stats and empty inventory
    /// Only one player per account allowed
    public entry fun init_player(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(!exists<Player>(account_addr), E_PLAYER_ALREADY_EXISTS);

        move_to(account, Player {
            level: 1,
            exp: 0,
            health: 100,
            mana: 50,
            max_health: 100,
            max_mana: 50,
            inventory: vector::empty<Item>(),
            equipped_sword: option::none<Item>(),
            equipped_shield: option::none<Item>(),
            equipped_armor: option::none<Item>(),
        });
    }

    // ==================== Inventory Management ====================

    /// Add an item to the player's inventory
    public fun add_item(account: &signer, item: Item) acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        vector::push_back(&mut player.inventory, item);
    }

    // ==================== Equipment System ====================

    /// Equip a sword from inventory by item ID
    public fun equip_sword(account: &signer, item_id: u64): bool acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        equip_specific(&mut player.inventory, item_id, TYPE_SWORD, &mut player.equipped_sword)
    }

    /// Equip a shield from inventory by item ID
    public fun equip_shield(account: &signer, item_id: u64): bool acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        equip_specific(&mut player.inventory, item_id, TYPE_SHIELD, &mut player.equipped_shield)
    }

    /// Equip armor from inventory by item ID
    public fun equip_armor(account: &signer, item_id: u64): bool acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        equip_specific(&mut player.inventory, item_id, TYPE_ARMOR, &mut player.equipped_armor)
    }

    /// Helper function to equip an item of a specific type
    /// Returns the previously equipped item to inventory if one exists
    fun equip_specific(
        inventory: &mut vector<Item>,
        item_id: u64,
        required_type: u8,
        equip_slot: &mut Option<Item>
    ): bool {
        let i = 0;
        let len = vector::length(inventory);

        while (i < len) {
            let item_ref = vector::borrow(inventory, i);
            if (item_ref.id == item_id && item_ref.item_type == required_type) {
                // Remove item from inventory
                let item = vector::remove(inventory, i);

                // If there's already an equipped item, return it to inventory
                if (option::is_some(equip_slot)) {
                    let old_item = option::extract(equip_slot);
                    vector::push_back(inventory, old_item);
                };

                // Equip the new item
                *equip_slot = option::some(item);
                return true
            };
            i = i + 1;
        };
        false
    }

    // ==================== Item Usage ====================

    /// Use a potion to restore health
    /// Returns true if potion was found and used
    public fun use_potion(account: &signer, item_id: u64): bool acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        let i = 0;
        let len = vector::length(&player.inventory);

        while (i < len) {
            let item_ref = vector::borrow(&player.inventory, i);
            if (item_ref.id == item_id && item_ref.item_type == TYPE_POTION) {
                let potion = vector::remove(&mut player.inventory, i);
                player.health = min(player.health + potion.power, player.max_health);
                return true
            };
            i = i + 1;
        };
        false
    }

    // ==================== Combat System ====================

    /// Player attacks an enemy. If enemy survives, it counterattacks.
    /// Returns true if enemy was killed, false otherwise
    public fun attack_enemy(account: &signer, enemy: &mut Enemy): bool acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        assert!(player.health > 0, E_PLAYER_DEAD);

        // Calculate player damage (base 5 + sword power)
        let damage = if (option::is_some(&player.equipped_sword)) {
            let sword_ref = option::borrow(&player.equipped_sword);
            5 + sword_ref.power
        } else {
            5 // base unarmed attack
        };

        // Attack enemy
        let killed = enemies::take_damage(enemy, damage);

        if (killed) {
            // Enemy died - award experience
            let exp_reward = enemies::get_exp_reward(enemy);
            gain_exp(player, exp_reward);
            true
        } else {
            // Enemy survived - it counterattacks
            let enemy_attack = enemies::get_attack(enemy);

            // Calculate defense (armor + shield)
            let defense = 0;
            if (option::is_some(&player.equipped_armor)) {
                let armor_ref = option::borrow(&player.equipped_armor);
                defense = defense + armor_ref.power;
            };
            if (option::is_some(&player.equipped_shield)) {
                let shield_ref = option::borrow(&player.equipped_shield);
                defense = defense + shield_ref.power;
            };

            // Apply damage with defense reduction (min 1 damage)
            let actual_damage = if (enemy_attack > defense) {
                enemy_attack - defense
            } else {
                1
            };

            if (player.health <= actual_damage) {
                player.health = 0; // Player dies
            } else {
                player.health = player.health - actual_damage;
            };

            false
        }
    }

    // ==================== Progression System ====================

    /// Award experience and handle leveling up
    fun gain_exp(player: &mut Player, exp_reward: u64) {
        player.exp = player.exp + exp_reward;

        let required_exp = exp_required(player.level);

        // Handle multiple level-ups if enough EXP gained
        while (player.exp >= required_exp) {
            player.exp = player.exp - required_exp;
            player.level = player.level + 1;

            // Level up bonuses
            player.max_health = player.max_health + 20;
            player.max_mana = player.max_mana + 10;

            // Full heal on level up
            player.health = player.max_health;
            player.mana = player.max_mana;

            required_exp = exp_required(player.level);
        };
    }

    /// Calculate EXP required for next level (exponential scaling)
    fun exp_required(level: u8): u64 {
        100 * (1u64 << (level - 1))
    }

    // ==================== Healing ====================

    /// Rest to restore health and mana
    public fun rest(account: &signer) acquires Player {
        let account_addr = signer::address_of(account);
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);

        let player = borrow_global_mut<Player>(account_addr);
        player.health = player.max_health;
        player.mana = player.max_mana;
    }

    // ==================== Utility Functions ====================

    /// Return minimum of two values
    fun min(a: u64, b: u64): u64 {
        if (a < b) a else b
    }

    // ==================== Item Factory (for testing) ====================

    /// Create a new item (public for testing and item rewards)
    public fun make_item(id: u64, name: String, item_type: u8, power: u64): Item {
        assert!(item_type <= TYPE_POTION, E_INVALID_ITEM_TYPE);
        Item { id, name, item_type, power }
    }

    // ==================== View Functions ====================

    #[view]
    /// Get player level
    public fun get_level(account_addr: address): u8 acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).level
    }

    #[view]
    /// Get player experience
    public fun get_exp(account_addr: address): u64 acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).exp
    }

    #[view]
    /// Get player current health
    public fun get_health(account_addr: address): u64 acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).health
    }

    #[view]
    /// Get player current mana
    public fun get_mana(account_addr: address): u64 acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).mana
    }

    #[view]
    /// Get player max health
    public fun get_max_health(account_addr: address): u64 acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).max_health
    }

    #[view]
    /// Get player max mana
    public fun get_max_mana(account_addr: address): u64 acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).max_mana
    }

    #[view]
    /// Check if player exists
    public fun player_exists(account_addr: address): bool {
        exists<Player>(account_addr)
    }

    #[view]
    /// Check if player is alive
    public fun is_alive(account_addr: address): bool acquires Player {
        assert!(exists<Player>(account_addr), E_PLAYER_NOT_EXISTS);
        borrow_global<Player>(account_addr).health > 0
    }

    // ==================== Public Getters for Item Type Constants ====================

    public fun type_sword(): u8 { TYPE_SWORD }
    public fun type_shield(): u8 { TYPE_SHIELD }
    public fun type_armor(): u8 { TYPE_ARMOR }
    public fun type_potion(): u8 { TYPE_POTION }
}
