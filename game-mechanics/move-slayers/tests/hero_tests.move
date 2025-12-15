/// Comprehensive test suite for Move Slayers game
#[test_only]
module move_slayers::hero_tests {
    use std::signer;
    use std::string;
    use std::option;
    use move_slayers::hero;
    use move_slayers::enemies;

    // Test account address
    const PLAYER_ADDR: address = @0x1;

    // ==================== Test Helpers ====================

    /// Create a test signer
    fun create_test_signer(): signer {
        cedra_framework::account::create_account_for_test(PLAYER_ADDR)
    }

    // ==================== Player Initialization Tests ====================

    #[test]
    fun test_hero_creation() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Verify player was created successfully
        assert!(hero::player_exists(PLAYER_ADDR), 1);
        assert!(hero::get_level(PLAYER_ADDR) == 1, 2);
        assert!(hero::get_health(PLAYER_ADDR) == 100, 3);
        assert!(hero::get_mana(PLAYER_ADDR) == 50, 4);
        assert!(hero::get_exp(PLAYER_ADDR) == 0, 5);
    }

    #[test]
    #[expected_failure(abort_code = 1, location = move_slayers::hero)]
    fun test_hero_creation_duplicate() {
        let player = create_test_signer();
        hero::init_player(&player);
        hero::init_player(&player); // Should fail
    }

    #[test]
    fun test_player_is_alive() {
        let player = create_test_signer();
        hero::init_player(&player);
        assert!(hero::is_alive(PLAYER_ADDR), 1);
    }

    // ==================== Inventory Tests ====================

    #[test]
    fun test_add_item_to_inventory() {
        let player = create_test_signer();
        hero::init_player(&player);

        let sword = hero::make_item(1, string::utf8(b"Iron Sword"), hero::type_sword(), 10);
        hero::add_item(&player, sword);

        // Player still exists and is functional
        assert!(hero::player_exists(PLAYER_ADDR), 1);
    }

    #[test]
    fun test_add_multiple_items() {
        let player = create_test_signer();
        hero::init_player(&player);

        let sword = hero::make_item(1, string::utf8(b"Iron Sword"), hero::type_sword(), 10);
        let shield = hero::make_item(2, string::utf8(b"Wooden Shield"), hero::type_shield(), 5);
        let potion = hero::make_item(3, string::utf8(b"Health Potion"), hero::type_potion(), 50);

        hero::add_item(&player, sword);
        hero::add_item(&player, shield);
        hero::add_item(&player, potion);

        assert!(hero::player_exists(PLAYER_ADDR), 1);
    }

    // ==================== Equipment Tests ====================

    #[test]
    fun test_equip_sword() {
        let player = create_test_signer();
        hero::init_player(&player);

        let sword = hero::make_item(1, string::utf8(b"Iron Sword"), hero::type_sword(), 10);
        hero::add_item(&player, sword);

        let equipped = hero::equip_sword(&player, 1);
        assert!(equipped == true, 1);
    }

    #[test]
    fun test_equip_shield() {
        let player = create_test_signer();
        hero::init_player(&player);

        let shield = hero::make_item(2, string::utf8(b"Wooden Shield"), hero::type_shield(), 5);
        hero::add_item(&player, shield);

        let equipped = hero::equip_shield(&player, 2);
        assert!(equipped == true, 1);
    }

    #[test]
    fun test_equip_armor() {
        let player = create_test_signer();
        hero::init_player(&player);

        let armor = hero::make_item(3, string::utf8(b"Leather Armor"), hero::type_armor(), 8);
        hero::add_item(&player, armor);

        let equipped = hero::equip_armor(&player, 3);
        assert!(equipped == true, 1);
    }

    #[test]
    fun test_equip_wrong_item_type() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Try to equip a shield in the sword slot
        let shield = hero::make_item(2, string::utf8(b"Wooden Shield"), hero::type_shield(), 5);
        hero::add_item(&player, shield);

        let equipped = hero::equip_sword(&player, 2);
        assert!(equipped == false, 1);
    }

    #[test]
    fun test_equip_nonexistent_item() {
        let player = create_test_signer();
        hero::init_player(&player);

        let equipped = hero::equip_sword(&player, 999);
        assert!(equipped == false, 1);
    }

    #[test]
    fun test_swap_equipment() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Add two swords
        let sword1 = hero::make_item(1, string::utf8(b"Iron Sword"), hero::type_sword(), 10);
        let sword2 = hero::make_item(2, string::utf8(b"Steel Sword"), hero::type_sword(), 15);
        hero::add_item(&player, sword1);
        hero::add_item(&player, sword2);

        // Equip first sword
        let equipped1 = hero::equip_sword(&player, 1);
        assert!(equipped1 == true, 1);

        // Equip second sword (should unequip first)
        let equipped2 = hero::equip_sword(&player, 2);
        assert!(equipped2 == true, 2);
    }

    // ==================== Potion Usage Tests ====================

    #[test]
    fun test_use_potion() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Damage player first
        let initial_health = hero::get_health(PLAYER_ADDR);
        let weak_enemy = enemies::spawn_boar();
        hero::attack_enemy(&player, &mut weak_enemy);

        let damaged_health = hero::get_health(PLAYER_ADDR);
        assert!(damaged_health < initial_health, 1);

        // Use potion
        let potion = hero::make_item(10, string::utf8(b"Health Potion"), hero::type_potion(), 50);
        hero::add_item(&player, potion);
        let used = hero::use_potion(&player, 10);

        assert!(used == true, 2);
        assert!(hero::get_health(PLAYER_ADDR) > damaged_health, 3);
    }

    #[test]
    fun test_use_potion_max_health_cap() {
        let player = create_test_signer();
        hero::init_player(&player);

        let max_health = hero::get_max_health(PLAYER_ADDR);

        // Use potion at full health
        let potion = hero::make_item(10, string::utf8(b"Mega Potion"), hero::type_potion(), 200);
        hero::add_item(&player, potion);
        hero::use_potion(&player, 10);

        // Health should not exceed max
        assert!(hero::get_health(PLAYER_ADDR) == max_health, 1);
    }

    // ==================== Combat Tests ====================

    #[test]
    fun test_attack_weak_enemy() {
        let player = create_test_signer();
        hero::init_player(&player);

        let boar = enemies::spawn_boar();
        let initial_enemy_health = enemies::get_health(&boar);

        // Attack should damage enemy
        hero::attack_enemy(&player, &mut boar);
        assert!(enemies::get_health(&boar) < initial_enemy_health, 1);
    }

    #[test]
    fun test_kill_enemy_gains_exp() {
        let player = create_test_signer();
        hero::init_player(&player);

        let initial_exp = hero::get_exp(PLAYER_ADDR);
        let boar = enemies::spawn_boar();

        // Attack until enemy dies
        while (enemies::is_alive(&boar)) {
            hero::attack_enemy(&player, &mut boar);
        };

        // Should gain experience
        assert!(hero::get_exp(PLAYER_ADDR) > initial_exp, 1);
    }

    #[test]
    fun test_equipped_sword_increases_damage() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Attack without sword
        let boar1 = enemies::spawn_boar();
        let initial_health1 = enemies::get_health(&boar1);
        hero::attack_enemy(&player, &mut boar1);
        let damage_without_sword = initial_health1 - enemies::get_health(&boar1);

        // Equip sword and attack
        let sword = hero::make_item(1, string::utf8(b"Iron Sword"), hero::type_sword(), 10);
        hero::add_item(&player, sword);
        hero::equip_sword(&player, 1);

        let boar2 = enemies::spawn_boar();
        let initial_health2 = enemies::get_health(&boar2);
        hero::attack_enemy(&player, &mut boar2);
        let damage_with_sword = initial_health2 - enemies::get_health(&boar2);

        // Sword should increase damage
        assert!(damage_with_sword > damage_without_sword, 1);
    }

    #[test]
    fun test_defense_reduces_damage() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Get hit without armor
        let orc1 = enemies::spawn_orc();
        let initial_health1 = hero::get_health(PLAYER_ADDR);
        hero::attack_enemy(&player, &mut orc1);
        let damage_without_armor = initial_health1 - hero::get_health(PLAYER_ADDR);

        // Rest to full health
        hero::rest(&player);

        // Equip armor and shield
        let armor = hero::make_item(10, string::utf8(b"Iron Armor"), hero::type_armor(), 5);
        let shield = hero::make_item(11, string::utf8(b"Iron Shield"), hero::type_shield(), 3);
        hero::add_item(&player, armor);
        hero::add_item(&player, shield);
        hero::equip_armor(&player, 10);
        hero::equip_shield(&player, 11);

        // Get hit with armor
        let orc2 = enemies::spawn_orc();
        let initial_health2 = hero::get_health(PLAYER_ADDR);
        hero::attack_enemy(&player, &mut orc2);
        let damage_with_armor = initial_health2 - hero::get_health(PLAYER_ADDR);

        // Armor should reduce damage
        assert!(damage_with_armor < damage_without_armor, 1);
    }

    #[test]
    #[expected_failure(abort_code = 3, location = move_slayers::hero)]
    fun test_dead_player_cannot_attack() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Create a very strong enemy that will kill the player
        let dragon = enemies::spawn_dragon();

        // Attack until player dies
        while (hero::get_health(PLAYER_ADDR) > 0) {
            hero::attack_enemy(&player, &mut dragon);
        };

        // This should fail because player is dead
        hero::attack_enemy(&player, &mut dragon);
    }

    // ==================== Leveling Tests ====================

    #[test]
    fun test_level_up() {
        let player = create_test_signer();
        hero::init_player(&player);

        let initial_level = hero::get_level(PLAYER_ADDR);
        let initial_max_health = hero::get_max_health(PLAYER_ADDR);

        // Kill enough enemies to level up
        let i = 0;
        while (i < 3) {
            let boar = enemies::spawn_boar();
            while (enemies::is_alive(&boar)) {
                hero::attack_enemy(&player, &mut boar);
            };
            i = i + 1;
        };

        // Should level up
        assert!(hero::get_level(PLAYER_ADDR) > initial_level, 1);
        assert!(hero::get_max_health(PLAYER_ADDR) > initial_max_health, 2);
    }

    #[test]
    fun test_level_up_heals() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Equip strong weapon to kill enemies faster and take less counterattack damage
        let sword = hero::make_item(100, string::utf8(b"Strong Sword"), hero::type_sword(), 30);
        hero::add_item(&player, sword);
        hero::equip_sword(&player, 100);

        // Take some damage
        let boar = enemies::spawn_boar();
        hero::attack_enemy(&player, &mut boar);

        let damaged_health = hero::get_health(PLAYER_ADDR);
        let max_health_before = hero::get_max_health(PLAYER_ADDR);

        // Level up by killing multiple enemies
        let i = 0;
        while (i < 5) {
            let boar2 = enemies::spawn_boar();
            while (enemies::is_alive(&boar2)) {
                hero::attack_enemy(&player, &mut boar2);
            };
            i = i + 1;
        };

        // Should have leveled up and be fully healed
        let new_level = hero::get_level(PLAYER_ADDR);
        let new_max_health = hero::get_max_health(PLAYER_ADDR);
        assert!(new_level > 1, 1);
        assert!(hero::get_health(PLAYER_ADDR) == new_max_health, 2);
        assert!(new_max_health > max_health_before, 3);
    }

    // ==================== Rest Tests ====================

    #[test]
    fun test_rest_restores_health() {
        let player = create_test_signer();
        hero::init_player(&player);

        // Take damage
        let wolf = enemies::spawn_wolf();
        hero::attack_enemy(&player, &mut wolf);

        let damaged_health = hero::get_health(PLAYER_ADDR);
        let max_health = hero::get_max_health(PLAYER_ADDR);
        assert!(damaged_health < max_health, 1);

        // Rest
        hero::rest(&player);

        // Should be fully restored
        assert!(hero::get_health(PLAYER_ADDR) == max_health, 2);
        assert!(hero::get_mana(PLAYER_ADDR) == hero::get_max_mana(PLAYER_ADDR), 3);
    }

    // ==================== Enemy Tests ====================

    #[test]
    fun test_enemy_spawn_boar() {
        let boar = enemies::spawn_boar();
        assert!(enemies::get_health(&boar) == 30, 1);
        assert!(enemies::get_attack(&boar) == 5, 2);
        assert!(enemies::get_exp_reward(&boar) == 50, 3);
    }

    #[test]
    fun test_enemy_spawn_dragon() {
        let dragon = enemies::spawn_dragon();
        assert!(enemies::get_health(&dragon) == 300, 1);
        assert!(enemies::get_attack(&dragon) == 50, 2);
        assert!(enemies::get_exp_reward(&dragon) == 1000, 3);
    }

    #[test]
    fun test_enemy_take_damage() {
        let orc = enemies::spawn_orc();
        let initial_health = enemies::get_health(&orc);

        let killed = enemies::take_damage(&mut orc, 20);

        assert!(killed == false, 1);
        assert!(enemies::get_health(&orc) == initial_health - 20, 2);
    }

    #[test]
    fun test_enemy_killed() {
        let boar = enemies::spawn_boar();

        let killed = enemies::take_damage(&mut boar, 100);

        assert!(killed == true, 1);
        assert!(enemies::get_health(&boar) == 0, 2);
        assert!(enemies::is_alive(&boar) == false, 3);
    }
}
