// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { AccountInfo } from '../AccountInfo'

/** Version of the feature. */
export type CedraGetAccountVersion = '1.0.0'
/** Name of the feature. */
export const CedraGetAccountNamespace = 'cedra:account'

export type CedraGetAccountFeature = {
  /** Namespace for the feature. */
  [CedraGetAccountNamespace]: {
    /** Version of the feature API. */
    version: CedraGetAccountVersion
    account: CedraGetAccountMethod
  }
}

export type CedraGetAccountMethod = () => Promise<AptoGetsAccountOutput>

export type AptoGetsAccountOutput = AccountInfo
