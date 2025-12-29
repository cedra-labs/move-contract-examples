# Publishing Modules on Cedra

Complete guide for publishing Move modules on the Cedra network.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Publishing](#step-by-step-publishing)
3. [Dependencies Management](#dependencies-management)
4. [Versioning Strategies](#versioning-strategies)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Cedra CLI**: Install from [Cedra Documentation](https://docs.cedra.network/getting-started/cli)
- **Cedra Account**: With sufficient CEDRA tokens for gas fees
- **Network**: Testnet (for testing) or mainnet (for production)

### Account Setup

```bash
cedra init
```

This creates/uses an account and prompts for network selection.

---

## Step-by-Step Publishing

### Step 1: Project Structure

Two common structures:

**Root-level:**
```
your-project/
├── Move.toml
└── sources/
    └── your_module.move
```

**With contract subdirectory:**
```
your-project/
├── contract/
│   ├── Move.toml
│   └── sources/
└── client/
```

### Step 2: Configure Move.toml

```toml
[package]
name = "your_module_name"
version = "1.0.0"

[addresses]
YourModuleName = "_"  # Replaced with account address during publish

[dev-addresses]
YourModuleName = "0xcafe"  # For local testing (can be empty)

[dependencies]
CedraFramework = { 
    git = "https://github.com/cedra-labs/cedra-framework.git", 
    subdir = "cedra-framework", 
    rev = "main" 
}
```

**Key Points:**
- Named address in `[addresses]` must match the **first part** of your module declaration
- Module declaration: `module YourModuleName::YourModule`
  - `YourModuleName` = named address (replaced with account address)
  - `YourModule` = actual module name (used in on-chain address: `<account>::YourModule`)

### Step 3: Fund Account

**Testnet:**
```bash
cedra account fund-with-faucet --account default
```
Or use: https://faucet.cedra.dev

**Mainnet:** Ensure sufficient CEDRA tokens.

### Step 4: Compile

```bash
cedra move compile --named-addresses YourModuleName=default
```

**Flags:**
- `--skip-fetch-latest-git-deps`: Skip dependency updates (faster)
- `--test`: Include test modules

### Step 5: Test (Recommended)

```bash
cedra move test --named-addresses YourModuleName=default
```

### Step 6: Publish

```bash
cedra move publish --named-addresses YourModuleName=default
```

**Non-interactive:**
```bash
cedra move publish --named-addresses YourModuleName=default --assume-yes
```

### Step 7: Verify

```bash
cedra account list --query modules --account default
```

Module accessible at: `<your_account_address>::<module_name>`

**Note:** `<module_name>` is the **second part** of module declaration (e.g., `CedraCollectionV2` from `module CedraNFTV2::CedraCollectionV2`).

### Step 8: Module Initialization

#### Automatic: `init_module`

The `init_module` function is **automatically called** when the module is published:

```move
module YourModuleName::YourModule {
    fun init_module(admin: &signer) {
        // Initialize state, create objects, etc.
    }
}
```

#### Manual Initialization (if required)

```bash
cedra move run \
  --function-id 'default::your_module::initialize' \
  --args u64:1000
```

---

## Dependencies Management

### Declaration Syntax

**Inline table (compact):**
```toml
[dependencies]
CedraFramework = { 
    git = "https://github.com/cedra-labs/cedra-framework.git", 
    subdir = "cedra-framework", 
    rev = "main" 
}
```

**Separate section:**
```toml
[dependencies.CedraFramework]
git = "https://github.com/cedra-labs/cedra-framework.git"
rev = "main"
subdir = "cedra-framework"
```

### Common Dependencies

**CedraFramework:**
```toml
CedraFramework = { 
    git = "https://github.com/cedra-labs/cedra-framework.git", 
    subdir = "cedra-framework", 
    rev = "main" 
}
```

**CedraTokenObjects (for NFTs/tokens):**
```toml
CedraTokenObjects = { 
    git = "https://github.com/cedra-labs/cedra-framework.git", 
    subdir = "cedra-token-objects", 
    rev = "main" 
}
```

### Version Pinning

For production, pin to specific tags or commits:

```toml
rev = "v1.2.3"  # Tag
# or
rev = "abc123def456..."  # Commit hash
```

### Best Practices

1. Pin versions for production
2. Use `rev = "main"` for development
3. Minimize dependencies
4. Update regularly for security patches

---

## Versioning Strategies

### Semantic Versioning

Follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

```toml
[package]
version = "1.0.0"
```

### Module Immutability

**Once published, modules are immutable.** You cannot update an existing module at the same address.

### Publishing New Versions

**Option 1: New Account Address**
```bash
cedra account create --account v2
cedra move publish --named-addresses YourModuleName=v2 --account v2
```

**Option 2: Different Module Name**
```toml
[package]
name = "your_module_v2"
```

```bash
cedra move publish --named-addresses YourModuleV2=default
```

**Option 3: Version Suffix in Module**
```move
module default::your_module_v2 {
    // Module code
}
```

### Versioning Workflow

```bash
# 1. Update version in Move.toml
# 2. Test
cedra move test --named-addresses YourModuleName=default
# 3. Publish
cedra move publish --named-addresses YourModuleName=default
# 4. Verify
cedra account list --query modules --account default
```

---

## Troubleshooting

### Common Errors

#### Insufficient Balance
```bash
cedra account fund-with-faucet --account default
cedra account list --account default
```

#### Compilation Errors
- Check syntax and types
- Verify dependencies: `cedra move compile --named-addresses YourModuleName=default`
- Check `Move.toml` configuration

#### Dependency Resolution Errors
- Verify dependency URLs
- Check network connectivity
- Verify `rev` exists
- Remove `--skip-fetch-latest-git-deps` flag

#### Named Address Mismatch
- Ensure `[addresses]` in `Move.toml` matches `--named-addresses` flag
- Named address must match first part of module declaration

#### Module Already Exists
- Modules are immutable - cannot overwrite
- Use different account address or module name

#### Network Connection Issues
- Check internet connection
- Verify network selection (testnet/mainnet)
- RPC endpoints:
  - Testnet: `https://testnet.cedra.dev/v1`
  - Mainnet: `https://mainnet.cedra.dev/v1`

### Debugging Steps

1. **Verify Configuration:**
   ```bash
   cat Move.toml  # or cat contract/Move.toml
   cedra account list
   ```

2. **Test Compilation:**
   ```bash
   cedra move compile --named-addresses YourModuleName=default
   ```

3. **Run Tests:**
   ```bash
   cedra move test --named-addresses YourModuleName=default
   ```

### Common Gotchas

1. **Module Immutability**: Cannot update published modules
2. **Module Name**: On-chain name is the **second part** of module declaration
3. **Working Directory**: Ensure correct directory (root or `contract/`)
4. **init_module**: Called automatically - don't call manually
5. **Empty dev-addresses**: Valid to have empty `[dev-addresses]` section

---

## Real-World Examples

### NFT Collection (nft-example)
```bash
cd move-contract-examples/nft-example/contract
cedra move compile --named-addresses CedraNFTV2=default
cedra move publish --named-addresses CedraNFTV2=default
```
Module: `module CedraNFTV2::CedraCollectionV2` → Address: `<account>::CedraCollectionV2`

### DEX (dex)
```bash
cd move-contract-examples/dex
cedra move compile --named-addresses simple_dex=default
cedra move publish --named-addresses simple_dex=default
```

### Voting System (voting-basic)
```bash
cd move-contract-examples/voting-basic/contract
cedra move compile --named-addresses VotingBasic=default
cedra move publish --named-addresses VotingBasic=default
```

### Referral System (referral)
```bash
cd move-contract-examples/referral/contract
cedra move publish --named-addresses referral_example=default --assume-yes
cedra move run --function-id 'default::referral_system::initialize' --args u64:500
```

---

## Pre-Publishing Checklist

- [ ] Module compiles without errors
- [ ] All tests pass
- [ ] Dependencies configured
- [ ] Named address matches module declaration
- [ ] `init_module` implemented (if needed)
- [ ] Account has sufficient balance
- [ ] Network selection correct (testnet for testing)
- [ ] Working directory correct

---

## Additional Resources

- [Cedra Documentation](https://docs.cedra.network)
- [Move Language Documentation](https://move-language.github.io/move/)
- [Cedra Framework GitHub](https://github.com/cedra-labs/cedra-framework)

---

## Summary

1. **Setup**: Configure `Move.toml` and fund account
2. **Compile**: `cedra move compile --named-addresses YourModuleName=default`
3. **Test**: `cedra move test --named-addresses YourModuleName=default`
4. **Publish**: `cedra move publish --named-addresses YourModuleName=default`
5. **Verify**: `cedra account list --query modules`

**Remember:**
- Modules are immutable once published
- Test on testnet first
- Module name = second part of declaration
- `init_module` is called automatically

Happy publishing! 🚀
