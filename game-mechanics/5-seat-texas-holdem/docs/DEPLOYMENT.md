# Deployment - 5-Seat Texas Hold'em

## Testnet Deployment

**Date:** December 21, 2025  
**Network:** Cedra Testnet  
**Version:** 1.0.0 (with enhancements)

### Contract Address
```
0x736ddbfe79a688617f26c712f987d7e2127f6b5f537687d8ecef91be36aa557b
```

### Transaction Details
| Field | Value |
|-------|-------|
| Transaction Hash | [`0xc598a85215b0baad7ec85cd0e39712dec9cb120c9d53acfc823af9ef17c79f56`](https://cedrascan.com/txn/0xc598a85215b0baad7ec85cd0e39712dec9cb120c9d53acfc823af9ef17c79f56?network=testnet) |
| Sender | `0x736ddbfe79a688617f26c712f987d7e2127f6b5f537687d8ecef91be36aa557b` |
| Gas Used | 19,414 |
| Package Size | 38,823 bytes |
| Status | ✅ Executed successfully |

---

## Deployed Modules

| Module | Description |
|--------|-------------|
| `texas_holdem` | Core game logic |
| `pot_manager` | Pot tracking & distribution |
| `hand_eval` | Hand evaluation engine |
| `chips` | Fungible chip token |

---

## Profile

```bash
# Profile name
holdem_testnet

# To use this deployment
cedra move run --profile holdem_testnet --function-id 0x736ddbfe79a688617f26c712f987d7e2127f6b5f537687d8ecef91be36aa557b::texas_holdem::<function>
```

---

## Features in This Deployment

- ✅ **Odd chip fix** – Remainder goes to first-to-act winner
- ✅ **Ante support** – Optional ante via `create_table`
- ✅ **Straddle support** – UTG can post 2x BB blind
- ✅ **Dead button tracking** – Fair blind rotation
- ✅ **Timeout penalty** – 10% stake penalty for timeouts
- ✅ **Service fees** – 0.3% (30 basis points)

---

## Quick Start

```bash
# Set address
export ADDR=0x736ddbfe79a688617f26c712f987d7e2127f6b5f537687d8ecef91be36aa557b

# Buy chips (0.1 CEDRA)
cedra move run --profile holdem_testnet \
  --function-id $ADDR::chips::buy_chips \
  --args u64:10000000

# Create table (5/10 blinds, no ante, straddle enabled)
cedra move run --profile holdem_testnet \
  --function-id $ADDR::texas_holdem::create_table \
  --args u64:5 u64:10 u64:100 u64:10000 address:$ADDR u64:0 bool:true

# View your chip balance
cedra move view --function-id $ADDR::chips::balance \
  --args address:$(cedra account lookup-address --profile holdem_testnet)
```

---

## Redeployment

To redeploy with changes:

```bash
cedra move publish --profile holdem_testnet --assume-yes
```

> **Note:** The `upgrade_policy` is set to `compatible`, meaning only backwards-compatible changes are allowed.
