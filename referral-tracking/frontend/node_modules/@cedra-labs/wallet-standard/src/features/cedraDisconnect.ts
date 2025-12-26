// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

/** Version of the feature. */
export type CedraDisconnectVersion = '1.0.0'
/** Name of the feature. */
export const CedraDisconnectNamespace = 'cedra:disconnect'

export type CedraDisconnectFeature = {
  /** Namespace for the feature. */
  [CedraDisconnectNamespace]: {
    /** Version of the feature API. */
    version: CedraDisconnectVersion
    disconnect: CedraDisconnectMethod
  }
}

export type CedraDisconnectMethod = () => Promise<void>
