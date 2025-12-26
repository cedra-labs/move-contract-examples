// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { NetworkInfo, UserResponse } from '../misc'

/** Version of the feature. */
export type CedraChangeNetworkVersion = '1.0.0'
/** Name of the feature. */
export const CedraChangeNetworkNamespace = 'cedra:changeNetwork'

export type CedraChangeNetworkFeature = {
  /** Namespace for the feature. */
  [CedraChangeNetworkNamespace]: {
    /** Version of the feature API. */
    version: CedraChangeNetworkVersion
    changeNetwork: CedraChangeNetworkMethod
  }
}

export type CedraChangeNetworkMethod = (
  input: CedraChangeNetworkInput
) => Promise<UserResponse<CedraChangeNetworkOutput>>

export type CedraChangeNetworkInput = NetworkInfo

export interface CedraChangeNetworkOutput {
  success: boolean
  reason?: string
}
