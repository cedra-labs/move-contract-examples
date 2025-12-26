// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { NetworkInfo } from '../misc'

/** Version of the feature. */
export type CedraOnNetworkChangeVersion = '1.0.0'
/** Name of the feature. */
export const CedraOnNetworkChangeNamespace = 'cedra:onNetworkChange'

export type CedraOnNetworkChangeFeature = {
  /** Namespace for the feature. */
  [CedraOnNetworkChangeNamespace]: {
    /** Version of the feature API. */
    version: CedraOnNetworkChangeVersion
    onNetworkChange: CedraOnNetworkChangeMethod
  }
}

export type CedraOnNetworkChangeMethod = (input: CedraOnNetworkChangeInput) => Promise<void>

export type CedraOnNetworkChangeInput = (newNetwork: NetworkInfo) => void
