// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { AccountInfo } from '../AccountInfo'
import { NetworkInfo, UserResponse } from '../misc'

/** Version of the feature. */
export type CedraConnectVersion = '1.0.0'
/** Name of the feature. */
export const CedraConnectNamespace = 'cedra:connect'

export type CedraConnectFeature = {
  /** Namespace for the feature. */
  [CedraConnectNamespace]: {
    /** Version of the feature API. */
    version: CedraConnectVersion
    connect: CedraConnectMethod
  }
}

export type CedraConnectMethod = (
  ...args: CedraConnectInput
) => Promise<UserResponse<CedraConnectOutput>>

export type CedraConnectInput = [silent?: boolean, networkInfo?: NetworkInfo]

export type CedraConnectOutput = AccountInfo
