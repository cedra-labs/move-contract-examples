// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { AccountInfo, AptosSignInOutput } from '@aptos-labs/wallet-standard';
import { deserializeSignature, serializeSignature } from './Signature';
import { serializeAccountInfo, deserializeAccountInfo } from './AccountInfo';

export function serializeAptosSignInOutput(serializer: Serializer, value: AptosSignInOutput) {
  serializeAccountInfo(serializer, value.account);
  serializer.serializeStr(JSON.stringify(value.input));
  serializer.serializeStr(value.plainText);
  serializeSignature(serializer, value.signature);
  serializer.serializeBytes(value.signingMessage);
  serializer.serializeStr(value.type);
}

export function deserializeAptosSignInOutput(deserializer: Deserializer): AptosSignInOutput {
  return {
    account: new AccountInfo(deserializeAccountInfo(deserializer)),
    input: JSON.parse(deserializer.deserializeStr()),
    plainText: deserializer.deserializeStr(),
    signature: deserializeSignature(deserializer),
    signingMessage: deserializer.deserializeBytes(),
    type: deserializer.deserializeStr(),
  };
}
