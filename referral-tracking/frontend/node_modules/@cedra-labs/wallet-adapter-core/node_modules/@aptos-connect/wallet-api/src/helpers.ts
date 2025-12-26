// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Network, NetworkToChainId, Serializer } from '@aptos-labs/ts-sdk';

export type SerializeFn<T> = (serializer: Serializer, value: T) => void;
export type DeserializeFn<T> = (deserializer: Deserializer) => T;

export function chainIdToNetwork(chainId: number): Network {
  switch (chainId) {
    case NetworkToChainId.mainnet:
      return Network.MAINNET;
    case NetworkToChainId.testnet:
      return Network.TESTNET;
    default:
      // TODO: fetch Devnet's chain id and compare, otherwise throw error
      return Network.DEVNET;
  }
}

export function isSupportedNetwork(network: string): network is Network {
  return [Network.MAINNET, Network.TESTNET, Network.DEVNET].includes(network as Network);
}
