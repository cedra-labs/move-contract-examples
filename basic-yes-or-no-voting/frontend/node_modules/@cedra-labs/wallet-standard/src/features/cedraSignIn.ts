// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { Signature } from '@cedra-labs/ts-sdk'
import { UserResponse } from '../misc'
import { AccountInfo } from '../AccountInfo'

/**
 * NOTE: This feature is currently experimental and is subject to change.
 *
 * Documentation: [Sign in with Cedra](https://github.com/cedra-foundation/AIPs/pull/556)
 */

/** Version of the feature. */
export type CedraSignInVersion = '0.1.0'
/** Name of the feature. */
export const CedraSignInNamespace = 'cedra:signIn'

export type CedraSignInFeature = {
  /** Namespace for the feature. */
  [CedraSignInNamespace]: {
    /** Version of the feature API. */
    version: CedraSignInVersion
    signIn: CedraSignInMethod
  }
}

export type CedraSignInMethod = (
  input: CedraSignInInput
) => Promise<UserResponse<CedraSignInOutput>>

export type CedraSignInInput = {
  address?: string
  uri?: string
  version?: string
  statement?: string
  nonce: string
  chainId?: string
  issuedAt?: string
  expirationTime?: string
  notBefore?: string
  requestId?: string
  resources?: string[]
}

export type CedraSignInRequiredFields = {
  domain: string
  address: string
  uri: string
  version: string
  chainId: string
}

export type CedraSignInOutput = {
  account: AccountInfo
  input: CedraSignInInput & CedraSignInRequiredFields
  plainText: string
  signingMessage: Uint8Array
  signature: Signature
  /**
   * The type of signing scheme used to sign the message.
   *
   * @example 'ed25519' | 'multi_ed25519' | 'single_key' | 'multi_key'
   */
  type: string
}
