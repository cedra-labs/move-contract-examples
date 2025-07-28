# Simple DEX Tutorial

## Introduction

This is a simple Decentralized Exchange (DEX) implementation built on the Move/Cedra blockchain framework. The DEX demonstrates core concepts of Automated Market Making (AMM) with a clean, educational implementation.

### Key Features
- **Automated Market Maker (AMM)** using the constant product formula (x*y=k)
- **Slippage Protection** with configurable tolerance levels
- **Price Impact Calculations** aligned with industry standards
- **Multi-hop Routing** for optimal trade execution through intermediate tokens
- **0.3% Trading Fee** applied to all swaps

## Architecture Overview

The DEX is organized into four main modules, each serving a specific purpose:

```
sources/
├── 1-math-amm.move     # Core AMM mathematics and formulas
├── 2-swap.move         # Trading pair management and swap execution
├── 3-slippage.move     # Price protection and safety mechanisms
└── 4-multihop.move     # Multi-step routing for complex trades
```

### Key Concepts

1. **Constant Product Formula**: The DEX uses the x*y=k formula where:
   - x = reserve of token A
   - y = reserve of token B
   - k = constant product that must be maintained

2. **Trading Fee**: A 0.3% fee is applied to all trades, benefiting liquidity providers

3. **Price Impact vs Slippage**:
   - **Price Impact**: Difference between execution price and spot price
   - **Slippage**: Difference between expected and actual output

4. **Liquidity Provider (LP) Tokens**: Minted to represent share of liquidity pool

## Module Documentation

### 3.1 AMM Math Module (`1-math-amm.move`)

The foundation of the DEX, implementing core mathematical functions for the Automated Market Maker.

#### Key Functions

##### `get_amount_out(amount_in: u64, reserve_in: u64, reserve_out: u64): u64`
Calculates the output amount for a given input, applying the 0.3% trading fee.

**Formula**: 
```
amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)
```

**Example**:
- Input: 1000 tokens
- Reserves: 1,000,000 each
- Output: ~997 tokens (after 0.3% fee)

##### `get_amount_in(amount_out: u64, reserve_in: u64, reserve_out: u64): u64`
Calculates the required input to receive a desired output amount.

**Formula**:
```
amount_in = (reserve_in * amount_out * 1000) / ((reserve_out - amount_out) * 997) + 1
```

##### `quote(amount_a: u64, reserve_a: u64, reserve_b: u64): u64`
Calculates proportional amounts for adding liquidity, maintaining the pool ratio.

**Formula**:
```
amount_b = (amount_a * reserve_b) / reserve_a
```

#### Error Codes
- `ERROR_ZERO_LIQUIDITY` (1): Pool has no liquidity
- `ERROR_INSUFFICIENT_INPUT` (2): Input amount is zero or insufficient

### 3.2 Swap Module (`2-swap.move`)

Manages trading pairs, liquidity provision, and token swaps.

#### Data Structure
```move
struct TradingPair has key {
    reserve_x: Object<FungibleStore>,
    reserve_y: Object<FungibleStore>,
    lp_metadata: Object<Metadata>,
    reserve_x_ref: ExtendRef,
    reserve_y_ref: ExtendRef
}
```

#### Key Functions

##### `create_pair(lp_creator: &signer, x_metadata: Object<Metadata>, y_metadata: Object<Metadata>): Object<Metadata>`
Creates a new trading pair and returns the LP token metadata.

**Usage**:
```move
let lp_metadata = swap::create_pair(admin, eth_metadata, btc_metadata);
```

##### `add_liquidity(...)`
Adds liquidity to an existing pair, minting LP tokens proportionally.

**Parameters**:
- `amount_x_desired`, `amount_y_desired`: Desired amounts to add
- `amount_x_min`, `amount_y_min`: Minimum acceptable amounts (slippage protection)

##### `swap_exact_input(...)`
Executes a token swap with exact input amount.

**Parameters**:
- `amount_in`: Exact amount of input tokens
- `min_amount_out`: Minimum acceptable output (slippage protection)

##### `reserves(lp_metadata: Object<Metadata>): (u64, u64)`
Returns current reserves of the trading pair.

#### Error Codes
- `ERROR_PAIR_NOT_EXISTS` (1): Trading pair doesn't exist
- `ERROR_INSUFFICIENT_OUTPUT` (2): Output less than minimum required
- `ERROR_ZERO_AMOUNT` (3): Zero amount provided

### 3.3 Slippage Module (`3-slippage.move`)

Provides price protection mechanisms to safeguard users from adverse price movements.

#### Key Functions

##### `calculate_price_impact(amount_in: u64, reserve_in: u64, reserve_out: u64): u64`
Calculates the price impact of a trade in basis points.

**Formula**:
```
spot_price = reserve_out / reserve_in
execution_price = amount_in / amount_out
price_impact = (execution_price - spot_price) / spot_price
```

**Example**: For a 10% trade with 0.3% fee, price impact ≈ 10.3%

##### `validate_slippage(expected_output: u64, actual_output: u64, max_slippage_bps: u64)`
Validates that actual output meets slippage tolerance.

##### `safe_swap(...)`
Executes a swap with built-in price impact and slippage protection.

**Protection Levels**:
- Maximum price impact: 3% (300 basis points)
- Configurable slippage tolerance

#### Constants
- `MAX_SLIPPAGE_BPS`: 500 (5% maximum slippage)
- `MAX_PRICE_IMPACT_BPS`: 300 (3% maximum price impact)

#### Error Codes
- `ERROR_SLIPPAGE_TOO_HIGH` (1): Slippage exceeds tolerance
- `ERROR_PRICE_IMPACT_TOO_HIGH` (2): Price impact exceeds maximum

### 3.4 Multi-hop Module (`4-multihop.move`)

Enables complex trades through intermediate tokens when direct pairs don't exist.

#### Key Function

##### `swap_exact_input_multihop(...)`
Executes a multi-step swap through intermediate liquidity pools.

**Parameters**:
- `hop_metadata`: Intermediate token for routing
- `x_metadata`: Input token
- `z_metadata`: Final output token
- `amount_in`: Input amount
- `min_amount_out`: Minimum final output

**Use Case**: 
Trade ETH → USDC when only ETH→BTC and BTC→USDC pairs exist:
```
ETH → BTC → USDC
```

**Protection**: Validates minimum output across all hops to prevent excessive slippage.

#### Error Codes
- `ERROR_INSUFFICIENT_OUTPUT` (1): Final output less than minimum

## Usage Guide

### Basic Flow

1. **Deploy Contracts**
   ```bash
   cedra move publish --named-addresses simple_dex=default
   ```

2. **Create Trading Pair**
   ```move
   let lp_metadata = swap::create_pair(admin, token_a_metadata, token_b_metadata);
   ```

3. **Add Initial Liquidity**
   ```move
   swap::add_liquidity(
       user,
       lp_metadata,
       token_a_metadata,
       token_b_metadata,
       1000000,  // amount A
       1000000,  // amount B
       0,        // min A (no slippage for initial)
       0         // min B
   );
   ```

4. **Execute Swap**
   ```move
   // Simple swap
   swap::swap_exact_input(
       user,
       lp_metadata,
       input_token_metadata,
       output_token_metadata,
       10000,    // input amount
       9900      // minimum output
   );
   
   // Protected swap
   slippage::safe_swap(
       user,
       lp_metadata,
       input_token_metadata,
       output_token_metadata,
       10000,    // input amount
       9900,     // minimum output
       100       // max slippage (1%)
   );
   ```

5. **Multi-hop Swap**
   ```move
   multihop::swap_exact_input_multihop(
       user,
       hop_lp_1,
       hop_lp_2,
       intermediate_token,
       input_token,
       output_token,
       10000,    // input amount
       9800      // minimum final output
   );
   ```

### Testing

The DEX includes a comprehensive test suite:
- AMM mathematics
- Trading pair creation and management
- Swap execution and validation
- Slippage protection
- Multi-hop routing
- Edge cases and error conditions

Run tests with:
```bash
cedra move test
```

For verbose output:
```bash
cedra move test -- --show-output
```