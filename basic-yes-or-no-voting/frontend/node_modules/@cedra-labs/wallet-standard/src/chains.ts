// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

export type ChainsId = `${string}:${string}` // e.g. 'cedra:devnet'
/** CEDRA Devnet */
export const CEDRA_DEVNET_CHAIN = 'cedra:devnet'

/** CEDRA Testnet */
export const CEDRA_TESTNET_CHAIN = 'cedra:testnet'

/** CEDRA Localnet */
export const CEDRA_LOCALNET_CHAIN = 'cedra:localnet'

/** CEDRA Mainnet */
export const CEDRA_MAINNET_CHAIN = 'cedra:mainnet'

export const CEDRA_CHAINS = [
  CEDRA_DEVNET_CHAIN,
  CEDRA_TESTNET_CHAIN,
  CEDRA_LOCALNET_CHAIN,
  CEDRA_MAINNET_CHAIN
] as const

export type CedraChain =
  | typeof CEDRA_DEVNET_CHAIN
  | typeof CEDRA_TESTNET_CHAIN
  | typeof CEDRA_LOCALNET_CHAIN
  | typeof CEDRA_MAINNET_CHAIN
