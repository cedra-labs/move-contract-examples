# Referral Basic - Implementation

## 📋 What Was Built

A basic referral tracking system built on Cedra Move that allows users to register referral codes, track referrals, and claim rewards with comprehensive anti-gaming measures. The system includes:

- ✅ **Smart Contract**: Complete Move contract with referral code registration, tracking, and reward claiming
- ✅ **TypeScript Client**: Full client implementation demonstrating all functionality
- ✅ **Anti-Gaming Measures**: Multiple layers of protection against system abuse
- ✅ **Documentation**: Complete README with setup, usage, and anti-gaming documentation

### Key Features
- Register unique referral codes (3-20 characters)
- Track referrals when users sign up
- Claim accumulated rewards
- Prevent self-referrals
- Prevent duplicate codes and referrals
- Comprehensive view functions for querying state

## 🔗 Task Issue

[Add your issue/PR link here]
<!-- Example: Closes #XX or Related to #XX -->

## 🧪 Testing Instructions

### Run Move Unit Tests

```bash
cd referral-basic/contract
cedra move test --named-addresses ReferralBasic=0xcafe
```

**Expected Result**: All tests pass ✅
- Basic functionality (register, track, claim)
- Anti-gaming measures (self-referral, duplicate prevention)
- Edge cases (invalid codes, non-existent codes)

### Run TypeScript Client

```bash
cd referral-basic/client
pnpm install
pnpm run start
```

**Prerequisites**: Set `MODULE_ADDRESS` and `ADMIN_PRIVATE_KEY` in `src/index.ts`

## 📦 Dependencies & Setup

### Required Tools
- **Cedra CLI** (v1.0.0+): https://docs.cedra.network/getting-started/cli
- **Node.js** (v16.x+): https://nodejs.org/
- **pnpm** (v6.x+): `npm install -g pnpm`

### Contract Dependencies
- **CedraFramework**: Auto-resolved via `Move.toml` from GitHub

### Setup Steps

**Contract:**
```bash
cd referral-basic/contract
cedra init                    # First time only
cedra move compile --named-addresses ReferralBasic=default
cedra move publish --named-addresses ReferralBasic=default
```

**Client:**
```bash
cd referral-basic/client
pnpm install
# Update MODULE_ADDRESS and ADMIN_PRIVATE_KEY in src/index.ts
pnpm run start
```

### Environment Variables
```bash
export ADMIN_PRIVATE_KEY="your_private_key_here"  # Linux/Mac
$env:ADMIN_PRIVATE_KEY="your_private_key_here"     # Windows PowerShell
```

## 🛡️ Anti-Gaming Measures

The contract implements the following anti-gaming measures:

1. **Self-Referral Prevention**: Users cannot refer themselves
2. **Duplicate Code Prevention**: Each code must be unique
3. **Duplicate Referral Prevention**: Each address can only be referred once
4. **Code Format Validation**: Codes must be 3-20 characters
5. **Single Code Per User**: Each user can only have one referral code

## ✅ Quality Checklist

- [x] All anti-gaming measures implemented
- [x] No hardcoded private keys
- [x] Comprehensive error handling
- [x] Full documentation
- [x] Production-ready code
- [x] Follows Move conventions
- [x] Security best practices

## 📝 Deliverables

- ✅ Register referral codes
- ✅ Track referral rewards
- ✅ Claim rewards function
- ✅ Anti-gaming measures

