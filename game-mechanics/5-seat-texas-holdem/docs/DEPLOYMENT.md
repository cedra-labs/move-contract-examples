# Deployment Guide - 5-Seat Texas Hold'em

## Latest Deployment

**Version:** 2.0.0 (Frontend Integration)  
**Date:** 2025-12-21  
**Network:** Cedra Testnet

### Contract Address
```
0x88d4e49b9fbcd8abd778f94eba6cefe74f1e63e16b9623a26cf3e4f0fcee665f
```

### Transaction
- **Hash:** `0x6dc27dfbeb1098a48395bc776bdbec427d788d61851c165f35c091ff56abef41`
- **Explorer:** [View on Cedrascan](https://cedrascan.com/txn/0x6dc27dfbeb1098a48395bc776bdbec427d788d61851c165f35c091ff56abef41?network=testnet)
- **Status:** ✅ Executed successfully
- **Gas Used:** 25,421 units

### Deployed Modules
- `chips` - Chip token system
- `hand_eval` - Hand evaluation
- `pot_manager` - Pot management
- `poker_events` - 25 event types
- `texas_holdem` - Core game logic

### Profile
- **Name:** `holdem_v2`
- **Network:** Testnet

---

## Quick Start

```bash
# Set contract address
export ADDR=0x88d4e49b9fbcd8abd778f94eba6cefe74f1e63e16b9623a26cf3e4f0fcee665f

# Buy chips (0.1 CEDRA = 100 chips)
cedra move run --function-id $ADDR::chips::buy_chips \
  --args u64:100000000 --profile holdem_v2

# Create table (5/10 blinds, 100-10000 buy-in, no ante, straddle enabled)
cedra move run --function-id $ADDR::texas_holdem::create_table \
  --args u64:5 u64:10 u64:100 u64:10000 address:$ADDR u64:0 bool:true \
  --profile holdem_v2

# Join table at seat 0 with 500 chips
cedra move run --function-id $ADDR::texas_holdem::join_table \
  --args address:$ADDR u64:0 u64:500 --profile holdem_v2

# Start hand
cedra move run --function-id $ADDR::texas_holdem::start_hand \
  --args address:$ADDR --profile holdem_v2
```

---

## Previous Deployments

| Version | Date | Address | Notes |
|---------|------|---------|-------|
| 1.0.0 | 2025-12-21 | `0x736ddb...557b` | Initial edge-case fixes |
| 2.0.0 | 2025-12-21 | `0x88d4e4...665f` | Frontend integration |

---

## Redeployment

```bash
# Create new profile
cedra init --profile <name> --network testnet --assume-yes

# Deploy
cedra move publish --profile <name> \
  --named-addresses holdemgame=<name> --assume-yes
```
