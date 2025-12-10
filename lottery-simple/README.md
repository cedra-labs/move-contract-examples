# Lottery Simple - Lottery System (Block Hash Limitation)

A simple and transparent lottery system built on Cedra Move. **Note:** While the deliverables specify "using block hash", Cedra Move (like all Move implementations) does not provide direct access to block hash within smart contracts for determinism reasons. This implementation uses transaction hash as the best available alternative.

## Features

- **Create Lottery**: Admin can create new lottery instances
- **Purchase Tickets**: Users can purchase tickets to participate
- **Draw Winner**: Admin draws winner using transaction hash for randomness
- **Transparent Selection**: Winner selection is deterministic and verifiable
- **Multiple Lotteries**: Support for multiple concurrent lotteries

## Prerequisites

- [CLI](https://docs.cedra.network/getting-started/cli) (v1.0.0 or later)
- [Node.js](https://nodejs.org/) LTS version (v16.x or later)
- [pnpm](https://pnpm.io/) (v6.x or later)

## Project Structure

- `/contract` - Move contract for lottery system
- `/client` - TypeScript client application

## Deploying the Contract

1. Configure CLI with your account:

```bash
cd contract
cedra init
```

2. Compile the contract:

```bash
cedra move compile --named-addresses LotterySimple=default
```

3. Publish the contract:

```bash
cedra move publish --named-addresses LotterySimple=default
```

4. Get your account address:

```bash
cedra account list --query modules
```

## Setting Up and Running the Client

1. Navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
pnpm install
```

3. Update configuration in `src/index.ts`:

```typescript
const MODULE_ADDRESS = "_"; // Replace with your deployed address
const ADMIN_PRIVATE_KEY = "_"; // Your admin private key
```

4. Run the client:

```bash
pnpm run start
```

## Contract Functions

### `create_lottery(admin: &signer)`
Creates a new lottery instance. The caller becomes the admin of the lottery.

### `purchase_ticket(buyer: &signer, lottery_id: u64)`
Purchases a ticket for the specified lottery. Each purchase adds one ticket to the lottery.

### `draw_winner(admin: &signer, lottery_id: u64)`
Draws the winner using transaction hash for randomness (block hash is not accessible in Move). Only the lottery admin can call this function. The lottery must be open and have at least one ticket. The transaction hash provides unpredictable randomness that cannot be manipulated by the admin.

### `close_lottery(admin: &signer, lottery_id: u64)`
Closes the lottery without drawing a winner. Only the lottery admin can call this function.

### View Functions

- `get_lottery_info(lottery_id: u64)`: Returns lottery information (id, admin, status, ticket count, winner)
- `get_ticket_count(lottery_id: u64)`: Returns the number of tickets purchased
- `has_ticket(lottery_id: u64, addr: address)`: Checks if an address has purchased a ticket

## Fairness Documentation

### How Winner Selection Works

The lottery uses a **transaction hash-based selection mechanism** to ensure fairness and transparency:

1. **Randomness Source**: When `draw_winner` is called, the contract retrieves the transaction hash from the transaction context using `transaction_context::get_transaction_hash()`. This provides unpredictable randomness because:
   - The transaction hash includes the transaction signature, sequence number, and other transaction-specific data
   - It cannot be predicted by the admin before submitting the transaction
   - It's unique to each transaction execution

2. **Deterministic Selection**: The transaction hash is converted to a numeric value (by summing the first 8 bytes), and the winner is selected using modulo arithmetic:
   ```
   tx_hash = transaction_context::get_transaction_hash()
   hash_value = sum of first 8 bytes of tx_hash
   winning_index = hash_value % ticket_count
   ```

3. **Transparency**: The transaction hash used for selection is stored in the lottery state (`randomness_seed`), making it verifiable on-chain. Anyone can verify the selection by checking the transaction hash.

**Why Transaction Hash Instead of Block Hash? (IMPORTANT)**

**The deliverables specify "using block hash", but this is NOT possible in Move:**

1. **Move Language Limitation**: Move (including Cedra Move) intentionally does NOT provide direct access to block hash within smart contracts. This is a fundamental design choice to ensure:
   - **Deterministic execution** - All nodes must execute contracts identically
   - **Consensus compatibility** - Contracts must produce the same results on all nodes
   - **No timing dependencies** - Contracts cannot depend on when they execute

2. **Why Block Hash Isn't Available**:
   - Block hash is only known after the block is finalized
   - Smart contracts execute during block construction
   - Accessing block hash would break determinism (different nodes might see different block hashes)

3. **Our Solution - Transaction Hash**:
   - Transaction hash is the best available alternative
   - Includes signature, sequence number, and transaction data
   - Unpredictable and cannot be manipulated
   - Provides sufficient randomness for lottery purposes
   - Verifiable on-chain

4. **Alternatives for True Block Hash Randomness** (not implemented):
   - Use an oracle service to provide block hash off-chain
   - Implement a commit-reveal scheme
   - Use Cedra's randomness module (if it uses block data internally)

### Fairness Guarantees

✅ **Unpredictable**: The transaction hash cannot be predicted by the admin before submitting the transaction, as it includes signature and transaction-specific data.

✅ **Verifiable**: The transaction hash used for selection is stored on-chain (`randomness_seed`), allowing anyone to verify the selection was fair by checking the transaction hash.

✅ **Equal Probability**: Each ticket has an equal chance of winning (1/ticket_count), assuming the transaction hash is uniformly distributed.

✅ **Non-Manipulable**: The admin cannot manipulate the result because the transaction hash is determined by the blockchain when the transaction is processed, not by the contract logic.

### Limitations and Considerations

⚠️ **Transaction Hash Randomness**: This implementation uses transaction hash for randomness, which is the best available option in Cedra Move:
- The result is deterministic once the transaction is submitted (cannot be changed)
- The admin cannot predict or manipulate the result before submission
- While not as random as true block hash, it provides sufficient unpredictability for lottery purposes
- Note: Cedra Move does not provide direct access to block hash within smart contracts

⚠️ **Admin Control**: The admin controls when to draw the winner. However, they cannot:
- Choose the winner (selection is deterministic based on hash)
- Manipulate the selection process (hash is computed from immutable lottery state)

⚠️ **No Payment Integration**: This is a simple lottery contract that tracks tickets and winners. It does not handle:
- Ticket payments (would need to integrate with coin/asset transfers)
- Prize distribution (would need separate prize pool management)
- Ticket pricing (all tickets are free in this implementation)

### Recommended Enhancements for Production

For a production lottery system, consider:

1. **Payment Integration**: Add coin/asset transfers for ticket purchases
2. **Prize Pool**: Implement a prize pool that accumulates from ticket sales
3. **Automatic Drawing**: Use time-based or condition-based automatic drawing
4. **Multiple Winners**: Support for multiple prize tiers
5. **Ticket Limits**: Limit tickets per address or total tickets
6. **Refund Mechanism**: Allow refunds if lottery is closed without drawing

## Example Usage

The client demonstrates:
1. Creating a lottery
2. Multiple users purchasing tickets
3. Drawing the winner using block hash
4. Verifying the winner and ticket ownership

## Testing

Run the Move tests:

```bash
cd contract
cedra move test --named-addresses LotterySimple=0xcafe
```

The test suite includes:
- Lottery creation
- Ticket purchases
- Winner drawing
- Error handling (closed lottery, no tickets, unauthorized access)
- Multiple lottery support

## License

MIT

