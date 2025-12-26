// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { WalletWithCedraFeatures } from './features'

export interface CedraWallet extends WalletWithCedraFeatures {
  /**
   * Website URL of the Wallet
   */
  readonly url: string
}
