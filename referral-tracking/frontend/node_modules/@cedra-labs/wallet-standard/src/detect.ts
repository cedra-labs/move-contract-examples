// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  Wallet,
  WalletWithFeatures,
  WalletsEventsListeners,
  getWallets
} from '@wallet-standard/core'

import { MinimallyRequiredFeatures } from './features'
import { CedraWallet } from './wallet'

// These features are absolutely required for wallets to function in the Cedra ecosystem.
// Eventually, as wallets have more consistent support of features, we may want to extend this list.
const REQUIRED_FEATURES: (keyof MinimallyRequiredFeatures)[] = [
  'cedra:account',
  'cedra:connect',
  'cedra:disconnect',
  'cedra:network',
  'cedra:onAccountChange',
  'cedra:onNetworkChange',
  'cedra:signMessage',
  'cedra:signTransaction'
]

export function isWalletWithRequiredFeatureSet<AdditionalFeatures extends Wallet['features']>(
  wallet: Wallet,
  additionalFeatures: (keyof AdditionalFeatures)[] = []
): wallet is WalletWithFeatures<MinimallyRequiredFeatures & AdditionalFeatures> {
  return [...REQUIRED_FEATURES, ...additionalFeatures].every(
    (feature) => feature in wallet.features
  )
}

/**
 * Helper function to get only Cedra wallets
 * @returns Cedra compatible wallets and `on` event to listen to wallets register event
 */
export function getCedraWallets(): {
  cedraWallets: CedraWallet[]
  on: <E extends keyof WalletsEventsListeners>(
    event: E,
    listener: WalletsEventsListeners[E]
  ) => () => void
} {
  const { get, on } = getWallets()

  const wallets = get()

  const cedraWallets: Wallet[] = []

  wallets.map((wallet: Wallet) => {
    const isCedra = isWalletWithRequiredFeatureSet(wallet)

    if (isCedra) {
      cedraWallets.push(wallet)
    }
  })

  return { cedraWallets: cedraWallets as CedraWallet[], on }
}
