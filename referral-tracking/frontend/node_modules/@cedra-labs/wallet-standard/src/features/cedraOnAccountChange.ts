// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { AccountInfo } from '../AccountInfo'

/** Version of the feature. */
export type CedraOnAccountChangeVersion = '1.0.0'
/** Name of the feature. */
export const CedraOnAccountChangeNamespace = 'cedra:onAccountChange'

export type CedraOnAccountChangeFeature = {
  /** Namespace for the feature. */
  [CedraOnAccountChangeNamespace]: {
    /** Version of the feature API. */
    version: CedraOnAccountChangeVersion
    onAccountChange: CedraOnAccountChangeMethod
  }
}

export type CedraOnAccountChangeMethod = (input: CedraOnAccountChangeInput) => Promise<void>

export type CedraOnAccountChangeInput = (newAccount: AccountInfo) => void
