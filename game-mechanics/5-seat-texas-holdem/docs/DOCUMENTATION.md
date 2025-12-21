# 5-Seat Texas Hold'em - Technical Documentation

## Overview

A fully on-chain casino-grade Texas Hold'em poker game for 5 players, built on the Cedra blockchain using the Move programming language.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        texas_holdem.move                     │
│              (Core Game Logic & Table Management)            │
├─────────────────────────────────────────────────────────────┤
│       chips.move        │        pot_manager.move           │
│    (Fungible Asset)     │      (Pot & Bet Tracking)         │
├─────────────────────────┼───────────────────────────────────┤
│                      hand_eval.move                          │
│                   (Hand Evaluation Engine)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Modules

### 1. `chips.move` - Chip Token System

Custom Fungible Asset (FA) token for in-game currency.

#### Exchange Rate
- **1 CEDRA = 1000 CHIP tokens**

#### Public Entry Functions

| Function | Description |
|----------|-------------|
| `buy_chips(player, cedra_amount)` | Exchange CEDRA for chips |
| `cash_out(player, chip_amount)` | Exchange chips back to CEDRA |

#### Friend-Only Functions (restricted to `texas_holdem`)

| Function | Description |
|----------|-------------|
| `transfer_chips(from, to, amount)` | Internal chip transfers |
| `deduct_chips_for_bet(from, amount)` | Withdraw chips for betting |
| `award_chips(to, chips)` | Deposit chips from pot payout |

#### View Functions

| Function | Returns |
|----------|---------|
| `balance(player)` | Player's chip balance |
| `get_metadata()` | FA metadata object |
| `get_treasury_balance()` | Total CEDRA in treasury |
| `get_exchange_rate()` | Chips per CEDRA (1000) |

---

### 2. `hand_eval.move` - Hand Evaluation Engine

Evaluates 7-card hands to determine the best 5-card poker hand.

#### Hand Rankings (0-9)

| Value | Hand | Tiebreaker Encoding |
|-------|------|---------------------|
| 0 | High Card | 5 kickers (4 bits each) |
| 1 | One Pair | Pair rank + 3 kickers |
| 2 | Two Pair | High pair + low pair + kicker |
| 3 | Three of a Kind | Trips rank + 2 kickers |
| 4 | Straight | High card rank |
| 5 | Flush | 5 card ranks |
| 6 | Full House | Trips rank + pair rank |
| 7 | Four of a Kind | Quads rank + kicker |
| 8 | Straight Flush | High card rank |
| 9 | Royal Flush | 0 (no tiebreaker needed) |

#### Core Functions

```move
public fun evaluate_hand(cards: vector<u8>): (u8, u64)
// Returns: (hand_type, tiebreaker)

public fun compare_hands(type1, tie1, type2, tie2): u8
// Returns: 1 = hand1 wins, 2 = hand2 wins, 0 = tie
```

#### Card Encoding
- Cards are `u8` values 0-51
- `card = suit * 13 + rank`
- Ranks: 0=2, 1=3, ..., 8=10, 9=J, 10=Q, 11=K, 12=A
- Suits: 0=clubs, 1=diamonds, 2=hearts, 3=spades

---

### 3. `pot_manager.move` - Pot Management

Handles betting, side pots, and chip distribution.

#### Data Structures

```move
struct PotState {
    pots: vector<Pot>,        // Main + side pots
    current_bets: vector<u64>, // Current round bets per player
    total_invested: vector<u64> // Total invested per player
}

struct Pot {
    amount: u64,              // Chips in pot
    eligible: vector<u64>     // Player indices eligible to win
}
```

#### Key Functions

| Function | Description |
|----------|-------------|
| `new(num_players)` | Create new pot state |
| `add_bet(state, player_idx, amount)` | Record a bet |
| `get_call_amount(state, player_idx)` | Amount needed to call |
| `collect_bets(state, non_folded)` | Consolidate bets into pots |
| `calculate_distribution(state, rankings, active)` | Determine payouts |

#### Side Pot Logic
- Created when a player goes all-in for less than max bet
- Each pot tracks which players are eligible
- Distribution iterates through pots, awarding to best hand among eligible

---

### 4. `texas_holdem.move` - Core Game Logic

Main game orchestration module.

#### Game Phases

| Phase | Value | Description |
|-------|-------|-------------|
| WAITING | 0 | No active hand |
| COMMIT | 1 | Collecting commit hashes |
| REVEAL | 2 | Collecting secret reveals |
| PREFLOP | 3 | First betting round |
| FLOP | 4 | After 3 community cards |
| TURN | 5 | After 4th community card |
| RIVER | 6 | After 5th community card |
| SHOWDOWN | 7 | Hand evaluation |

#### Player Status

| Status | Value | Description |
|--------|-------|-------------|
| WAITING | 0 | Not in hand |
| ACTIVE | 1 | Still playing |
| FOLDED | 2 | Folded |
| ALL_IN | 3 | All chips committed |

#### Entry Functions

**Table Management**
```move
create_table(admin, small_blind, big_blind, min_buy_in, max_buy_in)
join_table(player, table_addr, seat_idx, buy_in_chips)
leave_table(player, table_addr)
```

**Hand Lifecycle**
```move
start_hand(table_addr)           // Initiates COMMIT phase
submit_commit(player, table_addr, commit_hash)
reveal_secret(player, table_addr, secret)
```

**Player Actions**
```move
fold(player, table_addr)
check(player, table_addr)
call(player, table_addr)
raise_to(player, table_addr, total_bet)
all_in(player, table_addr)
```

**Timeout Handling**
```move
handle_timeout(table_addr)       // Enforce commit/reveal/action timeouts
```

#### View Functions

| Function | Returns |
|----------|---------|
| `get_table_config(addr)` | (small, big, min, max) |
| `get_seat_info(addr, idx)` | (player, chips, sitting_out) |
| `get_game_phase(addr)` | Current phase (0-7) |
| `get_pot_size(addr)` | Total pot chips |
| `get_community_cards(addr)` | Board cards |

---

## Randomness: Commit-Reveal Scheme

Fair card shuffling using cryptographic commitment:

1. **COMMIT Phase**: All players submit `SHA3_256(secret)` hashes
2. **REVEAL Phase**: Players reveal secrets, verified against commits
3. **Shuffle**: Combined secrets → SHA3_256 seed → Fisher-Yates shuffle

```
seed = SHA3_256(secret_1 || secret_2 || ... || secret_n)
```

Entropy improvement: Uses 8 bytes (u64) per shuffle swap instead of 1 byte.

---

## Timeout Enforcement

| Phase | Timeout | Penalty |
|-------|---------|---------|
| COMMIT | 120s | Mark as sitting out, abort hand |
| REVEAL | 120s | Mark as sitting out, abort hand |
| ACTION | 60s | Auto-fold |

---

## Security Features

1. **Chip Access Control**: Game functions are `public(friend)`, preventing arbitrary transfers
2. **Pot Eligibility**: All-in players remain eligible for pots they contributed to
3. **Raise Validation**: Underflow protection, short all-ins don't reopen betting
4. **Timeout Handling**: Prevents stalled games

---

## Betting Round Completion

A betting round is complete when:
1. All ACTIVE players have acted at least once this round
2. All ACTIVE players have matched the current bet

This ensures:
- **Check-around rounds**: Even when no bet is placed, all players must act before the round closes
- **Raise orbits**: When a raise occurs, all other active players' "acted" status resets, requiring another action

The min-raise resets to the big blind at the start of each new street (flop, turn, river).

---

## Heads-Up Play Rules

When only 2 players remain (heads-up):

| Position | Role | Pre-Flop Action |
|----------|------|-----------------|
| Dealer | Small Blind | Acts first |
| Non-Dealer | Big Blind | Acts second |

Post-flop follows standard rules: first active player after dealer acts first.

---

## All-In Runout

When all remaining players are all-in (no ACTIVE players):
1. Remaining community cards (up to 5) are dealt automatically
2. Showdown proceeds immediately

This prevents betting phases that have no participants.

---

## Service Fees

A 0.3% (30 basis points) service fee is deducted from pot winnings:

```move
FEE_BASIS_POINTS = 30  // 30/10000 = 0.3%
```

- Fee applies to all pot distributions (showdown and fold wins)
- Fee is sent to the `fee_recipient` address specified at table creation
- Total fees collected are tracked in `total_fees_collected`

---

## Deployment

```bash
cedra move compile
cedra move publish --profile <profile> --assume-yes
```

### Contract Address (Devnet)
```
0x9fb25fa02074be167f6133a9bba33811c17f651578f4f8fef58c8bb73b910261
```

---

## Usage Example

```bash
# Create table (5/10 blinds, 100-10000 buy-in)
cedra move run --function-id $ADDR::texas_holdem::create_table \
  --args u64:5 u64:10 u64:100 u64:10000

# Buy chips (0.1 CEDRA = 100 chips)
cedra move run --function-id $ADDR::chips::buy_chips \
  --args u64:10000000

# Join table at seat 0 with 500 chips
cedra move run --function-id $ADDR::texas_holdem::join_table \
  --args address:$TABLE u64:0 u64:500

# Start hand
cedra move run --function-id $ADDR::texas_holdem::start_hand \
  --args address:$TABLE
```
