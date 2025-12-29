# Deployment Guide - 5-Seat Texas Hold'em

## Latest Deployment

**Version:** 9.0.0 (Per-Street Privacy Card)  
**Date:** 2025-12-29  
**Network:** Cedra Testnet

### Contract Address
```
0x4d97eb2810ce8182e922f909a2989409d7973fcde2567eb7e22afa02b94e19f2
```

### Fee Configuration
- **Fee Rate:** 0.5% (50 basis points)
- **Fee Collector:** Configure via `init_fee_config` after deployment
- **Fee Admin:** `0x4d97eb2810ce8182e922f909a2989409d7973fcde2567eb7e22afa02b94e19f2`

### Transaction
- **Deploy Hash:** `0x89a2d9623966209f1f5d8b6bca0ee2ef932146231de63b70ed5f46ad9bf04117`
- **Explorer:** [View on Cedrascan](https://cedrascan.com/txn/0x89a2d9623966209f1f5d8b6bca0ee2ef932146231de63b70ed5f46ad9bf04117?network=testnet)
- **Status:** ✅ Executed successfully
- **Gas Used:** 30,128 units

### Deployed Modules
- `chips` - Chip token system (FA-based) with exact multiple validation
- `hand_eval` - Hand evaluation logic
- `pot_manager` - Pot & side pot management
- `poker_events` - 25 event types
- `texas_holdem` - Core game logic with Move Object escrow + encrypted cards

### Profile
- **Name:** `holdem_deployer_v9`
- **Network:** Testnet

### Changes in v9.0.0 (Per-Street Privacy Card)

- Per-street privacy card implementation
- Resolved merge conflict in chips.move (project URL)
- 89 tests passing

### Changes in v8.0.0 (Game Audit Remediation)

All 4 findings from the game rules audit have been addressed:

| Finding | Severity | Fix |
|---------|----------|-----|
| **Heads-up postflop order** | High | Non-dealer now acts first postflop (dealer acts last) |
| **Short all-in re-raise** | Medium | Players who already acted cannot re-raise after short all-in |
| **Missed blinds penalty** | Low | Missed blinds added to pot as dead money (per standard rules) |
| **No burn cards** | Low | Burn card added before dealing community cards |

- **89 tests** now passing (+3 new tests for dead money)
- **New view function:** `get_dead_money()` - Check accumulated dead money for pot

---

## Contract Workflow Diagram

```mermaid
flowchart TB
    subgraph Setup["🎰 Table Setup"]
        A[Deploy Contract] --> B[init_fee_config]
        B --> C[create_table]
        C -->|Creates Move Object| D[Table Object Created]
        D --> E[join_table]
    end
    
    subgraph HandFlow["🃏 Hand Lifecycle"]
        F[start_hand] --> G[COMMIT Phase]
        G -->|submit_commit| H{All Committed?}
        H -->|No| G
        H -->|Yes| I[REVEAL Phase]
        I -->|reveal_secret| J{All Revealed?}
        J -->|No| I
        J -->|Yes| K[Deal Encrypted Cards]
    end
    
    subgraph Betting["💰 Betting Rounds"]
        K --> L[PREFLOP]
        L -->|fold/check/call/raise| M{Round Complete?}
        M -->|No| L
        M -->|Yes| N{One Player Left?}
        N -->|Yes| R[Fold Win]
        N -->|No| O[FLOP]
        O --> P[TURN]
        P --> Q[RIVER]
        Q --> S[SHOWDOWN]
    end
    
    subgraph Resolution["🏆 Resolution"]
        S --> T[Decrypt & Evaluate Hands]
        R --> U[Calculate Fee]
        T --> U
        U --> V[Distribute Pot from Table Object]
        V --> W[Next Hand]
        W --> F
    end
    
    Setup --> HandFlow
```

---

## Quick Start

```bash
# Set contract address
export ADDR=0x4d97eb2810ce8182e922f909a2989409d7973fcde2567eb7e22afa02b94e19f2

# Buy chips (0.1 CEDRA = 100 chips) - must be exact multiple!
cedra move run --function-id $ADDR::chips::buy_chips \
  --args u64:100000000 --profile holdem_deployer_v9

# Create table (5/10 blinds, 100-10000 buy-in, no ante, straddle enabled)
cedra move run --function-id $ADDR::texas_holdem::create_table \
  --args u64:5 u64:10 u64:100 u64:10000 u64:0 bool:true \
  --profile holdem_deployer_v9

# Get table object address (required for joining)
cedra move view --function-id $ADDR::texas_holdem::get_table_address \
  --args address:<ADMIN_ADDR> --profile holdem_deployer_v9

# Join table at seat 0 with 500 chips (use TABLE_OBJECT_ADDRESS from above)
cedra move run --function-id $ADDR::texas_holdem::join_table \
  --args address:<TABLE_OBJECT_ADDRESS> u64:0 u64:500 --profile holdem_deployer_v9
```

---

## Post-Deployment Fee Setup

After deploying, initialize the fee collector (run once):

```bash
cedra move run \
  --function-id $ADDR::texas_holdem::init_fee_config \
  --args address:<FEE_COLLECTOR_ADDRESS> \
  --profile holdem_deployer_v6
```

To update the fee collector later:

```bash
cedra move run \
  --function-id $ADDR::texas_holdem::update_fee_collector \
  --args address:<NEW_FEE_COLLECTOR_ADDRESS> \
  --profile holdem_deployer_v6
```

---

## Previous Deployments

| Version | Date | Address | Profile | Notes |
|---------|------|---------|---------|-------|
| 1.0.0 | 2025-12-21 | `0x736ddb...557b` | holdem_testnet | Initial edge-case fixes |
| 2.0.0 | 2025-12-21 | `0x88d4e4...665f` | holdem_v2 | Frontend integration |
| 3.0.0 | 2025-12-22 | `0xb45d81...574b` | holdem_deployer_V1 | Bug fixes + Admin controls |
| 4.0.0 | 2025-12-23 | `0xfab3ac...1fd3` | holdem_deployer_v2 | Hole cards display |
| 4.1.0 | 2025-12-25 | `0x6ff41e...9aa3` | holdem_deployer_v3 | Service fees (per-table) |
| 5.0.0 | 2025-12-25 | `0x238498...2d5a` | holdem_deployer_v4 | Global fee collector |
| 6.0.0 | 2025-12-26 | `0x4d5a5f...dbf5` | holdem_deployer_v5 | Fractional fee accumulator |
| 7.0.0 | 2025-12-27 | `0xda25a2...f8ea` | holdem_deployer_v6 | Second audit remediation |
| 7.0.1 | 2025-12-27 | `0xa24365...fcfa` | holdem_deployer_v7 | close_table fix |
| 8.0.0 | 2025-12-28 | `0x3372cf...8109` | holdem_deployer_v8 | Game Audit Remediation |

---

## Redeployment

```bash
# Create new profile
cedra init --profile <name> --network testnet

# Deploy with named address (may need --override-size-check for large packages)
cedra move publish --profile <name> \
  --named-addresses holdemgame=<PROFILE_ADDRESS> \
  --assume-yes --override-size-check

# Initialize fee collector (required!)
cedra move run --function-id <ADDR>::texas_holdem::init_fee_config \
  --args address:<FEE_COLLECTOR_ADDRESS> --profile <name>
```

---

## Frontend Configuration

Update `packages/frontend/.env`:
```
VITE_CONTRACT_ADDRESS=0x4d97eb2810ce8182e922f909a2989409d7973fcde2567eb7e22afa02b94e19f2
```

Or update `packages/frontend/src/config/contracts.ts`:
```typescript
export const CONTRACT_ADDRESS = "0x4d97eb2810ce8182e922f909a2989409d7973fcde2567eb7e22afa02b94e19f2";
```

---

## Security Notes (v7.0.0)

### Non-Custodial Table Funds
Tables are now Move Objects. Player funds are held at the table's object address, not the admin's address. The module controls fund transfers via `ExtendRef`.

### Encrypted Hole Cards
Cards are XOR-encrypted using keys derived from each player's commit secret. Only the player who knows their secret can decrypt their cards.

### Randomness
Deck shuffling uses block height plus fixed commit/reveal deadlines, eliminating timestamp manipulation attacks.

