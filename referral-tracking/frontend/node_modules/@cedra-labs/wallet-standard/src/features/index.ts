// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import type { IdentifierRecord, WalletWithFeatures } from '@wallet-standard/core'

import type { CedraSignAndSubmitTransactionFeature } from './cedraSignAndSubmitTransaction'
import { CedraSignMessageFeature } from './cedraSignMessage'
import { CedraGetAccountFeature } from './cedraGetAccount'
import { CedraConnectFeature } from './cedraConnect'
import { CedraGetNetworkFeature } from './cedraGetNetwork'
import { CedraOnAccountChangeFeature } from './cedraOnAccountChange'
import { CedraOnNetworkChangeFeature } from './cedraOnNetworkChange'
import { CedraSignTransactionFeature } from './cedraSignTransaction'
import { CedraDisconnectFeature } from './cedraDisconnect'
import { CedraOpenInMobileAppFeature } from './cedraOpenInMobileApp'
import { CedraChangeNetworkFeature } from './cedraChangeNetwork'
import { CedraSignInFeature } from './cedraSignIn'

/**
 * Wallet Standard features that are unique to Cedra, and that all Cedra wallets are expected to implement.
 */
export type CedraFeatures = CedraConnectFeature &
  CedraGetAccountFeature &
  CedraGetNetworkFeature &
  CedraOnAccountChangeFeature &
  CedraOnNetworkChangeFeature &
  CedraSignMessageFeature &
  CedraSignTransactionFeature &
  //CedraChangeNetworkFeature is optional
  Partial<CedraChangeNetworkFeature> &
  //CedraOpenInMobileAppFeature is optional
  Partial<CedraOpenInMobileAppFeature> &
  //CedraSignAndSubmitTransactionFeature is optional
  Partial<CedraSignAndSubmitTransactionFeature> &
  //CedraSignInFeature is optional
  Partial<CedraSignInFeature> &
  CedraDisconnectFeature
/**
 * Represents a wallet with all Cedra features.
 */
export type WalletWithCedraFeatures = WalletWithFeatures<CedraFeatures>
/**
 * Represents a wallet with the absolute minimum feature set required to function in the Cedra ecosystem.
 */
export type WalletWithRequiredFeatures = WalletWithFeatures<
  MinimallyRequiredFeatures & IdentifierRecord<unknown>
>
/**
 * Represents the absolute minimum feature set required to function in the Cedra ecosystem.
 */
export type MinimallyRequiredFeatures = CedraFeatures

export * from './cedraSignAndSubmitTransaction'
export * from './cedraSignMessage'
export * from './cedraGetAccount'
export * from './cedraConnect'
export * from './cedraGetNetwork'
export * from './cedraOnAccountChange'
export * from './cedraOnNetworkChange'
export * from './cedraChangeNetwork'
export * from './cedraDisconnect'
export * from './cedraSignTransaction'
export * from './cedraOpenInMobileApp'
export * from './cedraSignIn'
