# Move Slayers - On-Chain RPG Game

An engaging on-chain role-playing game (RPG) built with Move on Cedra. Battle enemies, collect loot, level up your character, and master the art of combat in this fully decentralized game.

## Features

### Core Gameplay
- **Character System**: Initialize your hero with customizable stats
- **Inventory Management**: Collect and manage items (swords, shields, armor, potions)
- **Equipment System**: Equip weapons and armor for combat bonuses
- **Combat Mechanics**: Turn-based combat with damage calculation and counterattacks
- **Progression System**: Gain experience and level up with exponential scaling
- **Multiple Enemy Types**: 6 different enemy types with varying difficulty

### Anti-Cheat Considerations
- **On-Chain State**: All game state stored immutably on-chain
- **Deterministic Combat**: Combat outcomes calculated deterministically
- **Resource Safety**: Move's type system prevents item duplication
- **Access Control**: Only account owner can modify their player
- **Stat Validation**: All stat changes validated by contract logic

### Gas Efficiency
- **Optimized Storage**: Efficient struct packing for minimal storage costs
- **Batch Operations**: Equipment changes handled in single transactions
- **Simple Math**: Integer arithmetic for fast computation
- **No Loops in Storage**: Vector operations optimized for gas

## Project Structure

```
move-slayers/
├── sources/
│   ├── hero.move       # Player logic, inventory, combat, progression
│   └── enemies.move    # Enemy definitions and spawning
├── tests/
│   └── hero_tests.move # Comprehensive test suite (25 tests)
├── Move.toml           # Project configuration
└── README.md           # This file
```

## Installation

### Prerequisites
- [Cedra CLI](https://docs.cedra.network) installed
- Cedra account configured

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd game-mechanics/move-slayers
```

2. Compile the contract:
```bash
cedra move compile --dev
```

3. Run tests:
```bash
cedra move test --dev
```

## Usage Guide

### 1. Initialize Your Hero

Create your player character:

```bash
cedra move run --function-id default::hero::init_player
```

Your hero starts at:
- **Level**: 1
- **Health**: 100 / 100
- **Mana**: 50 / 50
- **Equipment**: None
- **Inventory**: Empty

### 2. View Player Stats

Check your character's current stats:

```bash
# Check level
cedra move view --function-id default::hero::get_level --args address:default

# Check health
cedra move view --function-id default::hero::get_health --args address:default

# Check if player is alive
cedra move view --function-id default::hero::is_alive --args address:default
```

### 3. Combat System

The combat system is designed to be called from a frontend or game client. Here's how it works:

```move
// In your game logic (pseudocode)
let mut enemy = enemies::spawn_boar();
let killed = hero::attack_enemy(&player, &mut enemy);

if (killed) {
    // Enemy defeated - player gains EXP
} else {
    // Enemy survived and counterattacked
    // Player may have taken damage
}
```

### 4. Inventory & Equipment

```move
// Add item to inventory
let sword = hero::make_item(1, b"Iron Sword", hero::type_sword(), 10);
hero::add_item(&player, sword);

// Equip items
hero::equip_sword(&player, 1);
hero::equip_shield(&player, 2);
hero::equip_armor(&player, 3);

// Use healing potion
hero::use_potion(&player, 4);
```

### 5. Rest & Recovery

Restore health and mana to maximum:

```bash
cedra move run --function-id default::hero::rest
```

## Game Mechanics

### Character Stats

| Stat | Starting Value | Growth per Level |
|------|---------------|------------------|
| Level | 1 | +1 |
| Max Health | 100 | +20 |
| Max Mana | 50 | +10 |
| Base Attack | 5 | - |

### Experience System

Experience required for level N → N+1:
```
EXP Required = 100 × 2^(N-1)
```

Examples:
- Level 1→2: 100 EXP
- Level 2→3: 200 EXP
- Level 3→4: 400 EXP
- Level 4→5: 800 EXP

### Enemy Types

| Enemy | HP | Attack | EXP Reward | Difficulty |
|-------|----|----|-----------|------------|
| Boar | 30 | 5 | 50 | Easy |
| Wolf | 50 | 10 | 100 | Medium |
| Orc | 80 | 15 | 200 | Hard |
| Troll | 120 | 20 | 350 | Very Hard |
| Drake | 180 | 30 | 600 | Elite |
| Dragon | 300 | 50 | 1000 | Boss |

### Combat Formula

**Player Damage:**
```
Damage = Base Attack (5) + Equipped Sword Power
```

**Damage Taken:**
```
Actual Damage = max(1, Enemy Attack - (Armor Power + Shield Power))
```

### Item Types

1. **Swords** (TYPE_SWORD = 0): Increase attack damage
2. **Shields** (TYPE_SHIELD = 1): Reduce incoming damage
3. **Armor** (TYPE_ARMOR = 2): Reduce incoming damage
4. **Potions** (TYPE_POTION = 3): Restore health (consumed on use)

## Testing

The project includes 25 comprehensive unit tests covering:

- ✅ Player initialization
- ✅ Inventory management
- ✅ Equipment system
- ✅ Combat mechanics
- ✅ Leveling system
- ✅ Item usage
- ✅ Edge cases (death, underflow protection, etc.)

Run all tests:
```bash
cedra move test --dev
```

Expected output:
```
Test result: OK. Total tests: 25; passed: 25; failed: 0
```

## Example Game Flow

```typescript
// 1. Initialize player
hero::init_player(&player);

// 2. Add starter equipment
let sword = hero::make_item(1, "Rusty Sword", TYPE_SWORD, 5);
let potion = hero::make_item(2, "Health Potion", TYPE_POTION, 30);
hero::add_item(&player, sword);
hero::add_item(&player, potion);

// 3. Equip sword
hero::equip_sword(&player, 1);

// 4. Spawn enemy
let mut boar = enemies::spawn_boar();

// 5. Battle!
while (enemies::is_alive(&boar) && hero::is_alive(player_addr)) {
    let killed = hero::attack_enemy(&player, &mut boar);
    if (killed) {
        // Victory! Player gained EXP
        break;
    }
}

// 6. Heal with potion if needed
if (hero::get_health(player_addr) < 50) {
    hero::use_potion(&player, 2);
}

// 7. Rest to full recovery
hero::rest(&player);
```

## Deployment

### Testnet Deployment

1. Update `Move.toml` with your account address:
```toml
[addresses]
move_slayers = "YOUR_ADDRESS_HERE"
```

2. Publish to Cedra testnet:
```bash
cedra move publish --network testnet
```

### Mainnet Deployment

Follow the same steps but use mainnet configuration:
```bash
cedra move publish --network mainnet
```

## Architecture Highlights

### Modular Design
- **Separation of Concerns**: Hero logic separate from enemy logic
- **Reusable Components**: Item system, combat system can be extended
- **Clear Interfaces**: Public functions well-documented

### Security Features
- **Resource Safety**: Player struct has `key` ability - can't be copied or dropped
- **Access Control**: Only signer can modify their own player
- **Input Validation**: All functions validate inputs and state
- **Error Handling**: Clear error codes for debugging

### Gas Optimization
- **Struct Packing**: Efficient use of u8, u64 types
- **Minimal Storage**: Only essential data stored on-chain
- **Single-Pass Algorithms**: Equipment search uses single loop
- **No Redundant Checks**: Optimized conditional logic

## Future Enhancements

Potential extensions to the game:

1. **Spell System**: Mana-based abilities and magic attacks
2. **Quest System**: On-chain quests with objectives and rewards
3. **Crafting**: Combine items to create better equipment
4. **PvP Arena**: Player vs player combat
5. **NFT Integration**: Unique items as NFTs
6. **Guilds**: Team-based gameplay
7. **Dungeons**: Multi-stage PvE encounters
8. **Leaderboards**: Global ranking system
9. **Events**: Time-limited challenges
10. **Item Marketplace**: Trade equipment with other players

## Technical Specifications

### Functions

#### Hero Module
- `init_player(account: &signer)` - Initialize new player
- `add_item(account: &signer, item: Item)` - Add item to inventory
- `equip_sword/shield/armor(account: &signer, item_id: u64)` - Equip equipment
- `use_potion(account: &signer, item_id: u64)` - Consume healing potion
- `attack_enemy(account: &signer, enemy: &mut Enemy)` - Attack enemy
- `rest(account: &signer)` - Restore health and mana
- `get_*` - Various view functions for stats

#### Enemies Module
- `spawn_boar/wolf/orc/troll/drake/dragon()` - Spawn enemy types
- `take_damage(enemy: &mut Enemy, amount: u64)` - Apply damage
- `get_*` - Various view functions for enemy stats

## Contributing

Contributions welcome! Areas for improvement:
- Additional enemy types
- New item categories
- Balance adjustments
- Frontend integration examples
- Performance optimizations

## License

MIT License

## Credits

Built for Cedra Builders Forge Season 1

Part of the game-mechanics examples for the Cedra ecosystem.

---

**Forge fast, Move Smart.** 🎮⚔️
