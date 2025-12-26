// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { NetworkInfo } from '../misc'

/** Version of the feature. */
export type CedraGetNetworkVersion = '1.0.0'
/** Name of the feature. */
export const CedraGetNetworkNamespace = 'cedra:network'

export type CedraGetNetworkFeature = {
  /** Namespace for the feature. */
  [CedraGetNetworkNamespace]: {
    /** Version of the feature API. */
    version: CedraGetNetworkVersion
    network: CedraGetNetworkMethod
  }
}

export type CedraGetNetworkMethod = () => Promise<CedraGetNetworkOutput>

export type CedraGetNetworkOutput = NetworkInfo
