# How to Estimate Gas Before Transactions

Quick guide for estimating gas costs before submitting transactions on Cedra.

## Understanding Gas

Gas cost = **Gas Units Used × Gas Unit Price**

- Gas units: computational work (~100-500 for transfers, ~500-5,000 for contract calls)
- Gas price: set by network (can be customized)

## Basic Gas Estimation

Use `transaction.simulate.simple()` to estimate gas before submission:

```typescript
import { Account, Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";

async function estimateGasCost(
  client: Cedra,
  account: Account,
  transaction: any
) {
  const [simulationResult] = await client.transaction.simulate.simple({
    signerPublicKey: account.publicKey,
    transaction,
  });

  const gasUsed = parseInt(simulationResult.gas_used);
  const gasUnitPrice = parseInt(simulationResult.gas_unit_price);
  const totalCost = gasUsed * gasUnitPrice;

  // Always check if transaction will succeed
  if (!simulationResult.success) {
    throw new Error(`Transaction will fail: ${simulationResult.vm_status}`);
  }

  return {
    gasUsed,
    gasUnitPrice,
    totalCost,
    willSucceed: simulationResult.success,
  };
}
```

### Complete Example

```typescript
// Build transaction
const transaction = await client.transaction.build.simple({
  sender: account.accountAddress,
  data: {
    function: "0x1::cedra_account::transfer",
    functionArguments: [recipient, amount],
  },
});

// Estimate gas
const estimate = await estimateGasCost(client, account, transaction);

// Check balance before submitting
const balance = await client.getAccountCoinAmount({
  accountAddress: account.accountAddress,
  coinType: "0x1::cedra_coin::CedraCoin",
});

if (balance < estimate.totalCost) {
  throw new Error("Insufficient balance for gas");
}
```

## Common Pitfalls

### 1. Not Checking Success Flag

```typescript
// ❌ BAD: Not checking success
const [result] = await client.transaction.simulate.simple({...});
const gasCost = parseInt(result.gas_used) * parseInt(result.gas_unit_price);

// ✅ GOOD: Always check success
const [result] = await client.transaction.simulate.simple({...});
if (!result.success) {
  throw new Error(`Transaction will fail: ${result.vm_status}`);
}
```

### 2. Not Accounting for Transaction Amount

```typescript
// ❌ BAD: Only checking gas
if (balance < estimate.totalCost) {
  throw new Error("Insufficient balance");
}

// ✅ GOOD: Check total (gas + transaction amount)
const totalRequired = estimate.totalCost + transferAmount;
if (balance < totalRequired) {
  throw new Error(`Insufficient balance. Need ${totalRequired}, have ${balance}`);
}
```

### 3. Using Stale Estimates

Gas prices change. Re-estimate if significant time has passed:

```typescript
let estimate = await estimateGasCost(client, account, transaction);
const estimateTime = Date.now();

// Before submission, refresh if > 1 minute old
if (Date.now() - estimateTime > 60000) {
  estimate = await estimateGasCost(client, account, transaction);
}
```

### 4. Not Handling Simulation Errors

```typescript
// ❌ BAD: Assuming simulation failure = transaction failure
try {
  const estimate = await estimateGasCost(client, account, transaction);
} catch (error) {
  throw new Error("Transaction will fail"); // Might be network error!
}

// ✅ GOOD: Distinguish errors
try {
  const [result] = await client.transaction.simulate.simple({...});
  if (!result.success) {
    return { willSucceed: false, reason: result.vm_status };
  }
} catch (error: any) {
  if (error.message.includes("network") || error.message.includes("timeout")) {
    throw new Error("Unable to estimate due to network issues");
  }
  throw error;
}
```

## Best Practices

1. **Always estimate** before submitting
2. **Check success status** to avoid failing transactions
3. **Verify balances** including both gas and transaction amounts
4. **Add 10-15% buffer** for network fluctuations
5. **Re-estimate** if estimate is > 1 minute old

---

## Additional Resources

- [Cedra Documentation](https://docs.cedra.network)
- [Cedra TypeScript SDK](https://github.com/cedra-labs/ts-sdk)
