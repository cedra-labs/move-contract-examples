# Deploy Referral Contract on Cedra

## Prerequisites
1. Cedra CLI installed
2. Account with CEDRA tokens for gas fees
3. Network selection (testnet/mainnet)

## Step 1: Initialize Cedra Account (if not already done)
```bash
cedra init
```
This will:
- Create a new account or use existing
- Ask for network (choose testnet or mainnet)
- Generate configuration

## Step 2: Fund Your Account (testnet only)
```bash
cedra account fund-with-faucet --account default
```
Or use the Cedra faucet at: https://faucet.cedra.dev

## Step 3: Compile the Contract
```bash
cedra move compile --named-addresses referral_example=default
```

## Step 4: Run Tests
```bash
cedra move test --named-addresses referral_example=default
```

## Step 5: Publish the Contract
```bash
cedra move publish --named-addresses referral_example=default --assume-yes
```

## Step 6: Initialize the Contract
After publishing, you need to call the initialize function:

```bash
cedra move run \
  --function-id 'default::referral_system::initialize' \
  --args u64:500
```

The `500` means 5% referral reward (500/10000).

## Step 7: Get Your Contract Address
After publishing, your contract address will be your account address:
```bash
cedra account list --account default
```

## Update Environment File
Once published, update `/Users/yaroslav/Documents/move-contract-examples/referral/nextjs-app/.env.local`:
```
NEXT_PUBLIC_MODULE_ADDRESS=0x_your_account_address_here
NEXT_PUBLIC_CEDRA_NETWORK=testnet
```

## Example Addresses
- Testnet RPC: https://testnet.cedra.dev/v1
- Mainnet RPC: https://mainnet.cedra.dev/v1