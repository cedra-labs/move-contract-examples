// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import { DappInfo } from '../../shared';
import { ConnectRequest } from './request';

const mockDappInfo: DappInfo = {
  domain: 'test-dapp.com',
  name: 'Test Dapp',
};

describe('ConnectRequest', () => {
  describe('v4 - claimOptions', () => {
    const claimSecretKey = Ed25519PrivateKey.generate();

    test('no claimOptions', () => {
      const serializedRequest = ConnectRequest.serialize(mockDappInfo, {});
      const deserializedRequest = ConnectRequest.deserialize(serializedRequest);

      expect(deserializedRequest.version).toBe(4);
      expect(deserializedRequest.args.claimOptions).toBeUndefined();
    });

    test('with default asset', () => {
      const serializedRequest = ConnectRequest.serialize(mockDappInfo, {
        claimOptions: {
          network: Network.TESTNET,
          secretKey: claimSecretKey,
        },
      });
      const deserializedRequest = ConnectRequest.deserialize(serializedRequest);

      expect(deserializedRequest.version).toBe(4);
      expect(deserializedRequest.args.claimOptions).toBeDefined();
      expect(deserializedRequest.args.claimOptions?.secretKey.toString()).toEqual(claimSecretKey.toString());
      expect(deserializedRequest.args.claimOptions?.network).toEqual(Network.TESTNET);
      expect(deserializedRequest.args.claimOptions?.asset).toBeUndefined();
    });

    test('with specific asset', () => {
      const serializedRequest = ConnectRequest.serialize(mockDappInfo, {
        claimOptions: {
          asset: '0xdeadbeef',
          network: Network.TESTNET,
          secretKey: claimSecretKey,
        },
      });
      const deserializedRequest = ConnectRequest.deserialize(serializedRequest);

      expect(deserializedRequest.version).toBe(4);
      expect(deserializedRequest.args.claimOptions).toBeDefined();
      expect(deserializedRequest.args.claimOptions?.secretKey.toString()).toEqual(claimSecretKey.toString());
      expect(deserializedRequest.args.claimOptions?.network).toEqual(Network.TESTNET);
      expect(deserializedRequest.args.claimOptions?.asset).toBe('0xdeadbeef');
    });
  });
});
