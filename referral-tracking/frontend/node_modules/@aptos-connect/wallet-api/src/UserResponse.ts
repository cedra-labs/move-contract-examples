// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { DeserializeFn, SerializeFn } from './helpers';

export interface UserApproval<TApprovalArgs> {
  args: TApprovalArgs;
  status: 'approved';
}

export interface UserDismissal {
  status: 'dismissed';
}

export type UserResponse<TApprovalArgs> = UserApproval<TApprovalArgs> | UserDismissal;

export function makeUserApproval<TApprovalArgs>(args: TApprovalArgs): UserApproval<TApprovalArgs> {
  return { args, status: 'approved' };
}

export function makeUserResponseSerializeFn<TArgs>(
  serializeArgs: SerializeFn<TArgs>,
): SerializeFn<UserResponse<TArgs>> {
  return (serializer: Serializer, value: UserResponse<TArgs>) => {
    serializer.serializeBool(value.status === 'approved');
    if (value.status === 'approved') {
      serializeArgs(serializer, value.args);
    }
  };
}

export function makeUserResponseDeserializeFn<TArgs>(
  deserializeArgs: DeserializeFn<TArgs>,
): DeserializeFn<UserResponse<TArgs>> {
  return (deserializer: Deserializer) => {
    const isApproved = deserializer.deserializeBool();
    return isApproved ? { args: deserializeArgs(deserializer), status: 'approved' } : { status: 'dismissed' };
  };
}
