// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

/** Version of the feature. */
export type CedraOpenInMobileAppVersion = '1.0.0'
/** Name of the feature. */
export const CedraOpenInMobileAppNamespace = 'cedra:openInMobileApp'

export type CedraOpenInMobileAppFeature = {
  /** Namespace for the feature. */
  [CedraOpenInMobileAppNamespace]: {
    /** Version of the feature API. */
    version: CedraOpenInMobileAppVersion
    openInMobileApp: CedraOpenInMobileAppMethod
  }
}

export type CedraOpenInMobileAppMethod = () => void
