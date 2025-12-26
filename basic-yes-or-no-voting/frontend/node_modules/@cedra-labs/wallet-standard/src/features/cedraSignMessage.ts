// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { Signature } from '@cedra-labs/ts-sdk'
import { UserResponse } from '../misc'

/** Version of the feature. */
export type CedraSignMessageVersion = '1.0.0'
/** Name of the feature. */
export const CedraSignMessageNamespace = 'cedra:signMessage'

export type CedraSignMessageFeature = {
  /** Namespace for the feature. */
  [CedraSignMessageNamespace]: {
    /** Version of the feature API. */
    version: CedraSignMessageVersion
    signMessage: CedraSignMessageMethod
  }
}

export type CedraSignMessageMethod = (
  input: CedraSignMessageInput
) => Promise<UserResponse<CedraSignMessageOutput>>

export type CedraSignMessageInput = {
  address?: boolean
  application?: boolean
  chainId?: boolean
  message: string
  nonce: string
}

export type CedraSignMessageOutput = {
  address?: string
  application?: string
  chainId?: number
  fullMessage: string
  message: string
  nonce: string
  prefix: 'CEDRA'
  signature: Signature
}
