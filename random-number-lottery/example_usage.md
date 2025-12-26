# Lottery Contract - Example Usage

This guide demonstrates how to interact with the lottery contract using the Cedra CLI.

## Prerequisites

- [Cedra CLI installed](https://docs.cedra.network/getting-started/cli)
- An account with some test tokens
- The lottery contract deployed

## Step 1: Deploy the Contract

```bash
# Navigate to the lottery directory
cd "Random Number Lottery"

# Publish the contract
cedra move publish --named-addresses module_addr=default

# Note the deployed module address from the output
```

## Step 2: Create a Lottery

As the organizer, create a new lottery:

```bash
# Parameters:
# - ticket_price: 1000000 (1 token with 6 decimals)
# - duration: 3600 (1 hour in seconds)
# - payment_token: Object address of your fungible asset

cedra move run \
  --function-id 'default::lottery::create_lottery' \
  --args u64:1000000 \
  --args u64:3600 \
  --args object:0xYOUR_TOKEN_OBJECT_ADDRESS
```

**Output**: An event will be emitted containing the `lottery_id` and `lottery_obj_addr`. Note these values for subsequent operations.

Example event:
```json
{
  "lottery_id": 1,
  "lottery_obj_addr": "0xLOTTERY_OBJECT_ADDRESS",
  "organizer": "0xYOUR_ADDRESS",
  "ticket_price": 1000000,
  "end_time": 1734567890
}
```

## Step 3: Check Lottery Information

View the lottery details:

```bash
cedra move view \
  --function-id 'default::lottery::get_lottery_info' \
  --args address:0xLOTTERY_OBJECT_ADDRESS
```

**Output**:
```
(
  lottery_id: 1,
  organizer: 0x...,
  ticket_price: 1000000,
  end_time: 1734567890,
  num_participants: 0,
  prize_pool: 0,
  winner: 0x0,
  is_drawn: false
)
```

## Step 4: Buy Lottery Tickets

Participants can buy tickets:

```bash
# Alice buys a ticket
cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY_OBJECT_ADDRESS \
  --profile alice

# Bob buys a ticket
cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY_OBJECT_ADDRESS \
  --profile bob

# Charlie buys 2 tickets
cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY_OBJECT_ADDRESS \
  --profile charlie

cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY_OBJECT_ADDRESS \
  --profile charlie
```

**Odds**:
- Alice: 1/4 (25%)
- Bob: 1/4 (25%)
- Charlie: 2/4 (50%)

## Step 5: Check Participants

View who bought tickets:

```bash
# Get total number of participants
cedra move view \
  --function-id 'default::lottery::get_lottery_info' \
  --args address:0xLOTTERY_OBJECT_ADDRESS

# Get specific participant by index (0-based)
cedra move view \
  --function-id 'default::lottery::get_participant' \
  --args address:0xLOTTERY_OBJECT_ADDRESS \
  --args u64:0  # First participant

cedra move view \
  --function-id 'default::lottery::get_participant' \
  --args address:0xLOTTERY_OBJECT_ADDRESS \
  --args u64:1  # Second participant
```

## Step 6: Wait for Lottery to End

```bash
# Check current time
cedra account show

# Wait until current_time > end_time
# In production: wait for the duration to pass
# In testing: use timestamp::fast_forward_seconds
```

## Step 7: Draw the Winner

After the lottery end time, anyone can draw the winner:

```bash
cedra move run \
  --function-id 'default::lottery::draw_winner' \
  --args u64:1 \
  --args address:0xLOTTERY_OBJECT_ADDRESS
```

**Output**: An event will be emitted showing:
```json
{
  "lottery_id": 1,
  "winner": "0xWINNER_ADDRESS",
  "prize_amount": 4000000,
  "total_participants": 4,
  "random_seed": 123456789
}
```

## Step 8: Verify the Winner

Check the final lottery state:

```bash
cedra move view \
  --function-id 'default::lottery::get_lottery_info' \
  --args address:0xLOTTERY_OBJECT_ADDRESS
```

**Output**:
```
(
  lottery_id: 1,
  organizer: 0x...,
  ticket_price: 1000000,
  end_time: 1734567890,
  num_participants: 4,
  prize_pool: 0,  # Prize has been transferred to winner
  winner: 0xWINNER_ADDRESS,
  is_drawn: true
)
```

Check the winner's balance:

```bash
cedra account show --profile <winner_profile>
```

The winner should have received the full prize pool (4 tokens in this example).

## Complete Example: Running a Raffle

Here's a complete example for a community raffle:

```bash
# 1. Organizer creates the raffle (100 token prize, 24 hours)
cedra move run \
  --function-id 'default::lottery::create_lottery' \
  --args u64:100000000 \
  --args u64:86400 \
  --args object:0xTOKEN \
  --profile organizer

# Get the lottery address from the event
# Let's say it's 0xLOTTERY123

# 2. Participants buy tickets over the next 24 hours
# Ticket costs 100 tokens (100000000 with 6 decimals)

cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY123 \
  --profile participant1

cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY123 \
  --profile participant2

# ... more participants ...

# 3. After 24 hours, anyone draws the winner
cedra move run \
  --function-id 'default::lottery::draw_winner' \
  --args u64:1 \
  --args address:0xLOTTERY123

# 4. Winner automatically receives the entire prize pool!
```

## Error Scenarios

### Ticket Purchase After End Time

```bash
# This will fail with E_LOTTERY_ENDED
cedra move run \
  --function-id 'default::lottery::buy_ticket' \
  --args u64:1 \
  --args address:0xLOTTERY123
```

**Error**: `LOTTERY_ENDED (0x030008)`

### Drawing Before End Time

```bash
# This will fail with E_LOTTERY_NOT_ENDED
cedra move run \
  --function-id 'default::lottery::draw_winner' \
  --args u64:1 \
  --args address:0xLOTTERY123
```

**Error**: `LOTTERY_NOT_ENDED (0x030006)`

### Drawing Without Participants

```bash
# This will fail with E_NO_PARTICIPANTS
cedra move run \
  --function-id 'default::lottery::draw_winner' \
  --args u64:1 \
  --args address:0xLOTTERY123_NO_TICKETS
```

**Error**: `NO_PARTICIPANTS (0x030007)`

### Drawing Twice

```bash
# Second draw attempt will fail with E_LOTTERY_ALREADY_DRAWN
cedra move run \
  --function-id 'default::lottery::draw_winner' \
  --args u64:1 \
  --args address:0xLOTTERY123
```

**Error**: `LOTTERY_ALREADY_DRAWN (0x030003)`

## Tips for Organizers

1. **Set Fair Ticket Prices**: Consider the prize value and target participant count
2. **Choose Appropriate Durations**: 
   - Short (1 hour): Quick raffles
   - Medium (24 hours): Community events
   - Long (1 week): Large campaigns
3. **Promote Your Lottery**: Share the lottery details and how to participate
4. **Monitor Progress**: Check participant count and prize pool growth
5. **Draw Promptly**: Draw the winner soon after the end time
6. **Verify Results**: Check the winner and confirm prize transfer

## Advanced Usage

### Multiple Lotteries

You can run multiple concurrent lotteries:

```bash
# Create lottery 1 (quick raffle)
cedra move run --function-id 'default::lottery::create_lottery' --args u64:1000000 --args u64:3600 --args object:0xTOKEN

# Create lottery 2 (week-long event)
cedra move run --function-id 'default::lottery::create_lottery' --args u64:5000000 --args u64:604800 --args object:0xTOKEN

# Get addresses using get_lottery_address view function
cedra move view --function-id 'default::lottery::get_lottery_address' --args u64:1
cedra move view --function-id 'default::lottery::get_lottery_address' --args u64:2
```

### Querying Lottery State

```bash
# Check if lottery exists
cedra move view \
  --function-id 'default::lottery::lottery_exists' \
  --args address:0xLOTTERY_ADDRESS

# Get full lottery info
cedra move view \
  --function-id 'default::lottery::get_lottery_info' \
  --args address:0xLOTTERY_ADDRESS
```

## Integration with dApps

For frontend integration, listen to these events:

- **`LotteryCreated`**: New lottery started
- **`TicketPurchased`**: Someone bought a ticket
- **`WinnerDrawn`**: Lottery concluded, winner selected

Use the Cedra TypeScript SDK to interact programmatically:

```typescript
import { Cedra, CedraConfig } from "@cedra-labs/ts-sdk";

const cedra = new Cedra(new CedraConfig({ network: "devnet" }));

// Create a lottery
await cedra.transaction.build.simple({
  sender: organizer.accountAddress,
  data: {
    function: `${moduleAddress}::lottery::create_lottery`,
    functionArguments: [ticketPrice, duration, paymentToken],
  },
});

// Buy a ticket
await cedra.transaction.build.simple({
  sender: participant.accountAddress,
  data: {
    function: `${moduleAddress}::lottery::buy_ticket`,
    functionArguments: [lotteryId, lotteryObjectAddress],
  },
});
```

## Support

For questions or issues:
- Review the [README](../README.md)
- Check the [Fairness Documentation](../FAIRNESS.md)
- Consult the [Cedra Documentation](https://docs.cedra.network/)

