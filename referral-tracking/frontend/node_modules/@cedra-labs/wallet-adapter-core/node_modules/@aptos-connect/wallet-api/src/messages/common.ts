// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

export type TypedMessage<MessageType extends string = string> = { __messageType: MessageType };
export type TypedMessageConstructor<TMessage extends TypedMessage<MessageType>, MessageType extends string> = {
  TYPE: MessageType;
  new (...args: any[]): TMessage;
};

export function isTypedMessage<TMessage extends TypedMessage<MessageType>, MessageType extends string>(
  messageCls: TypedMessageConstructor<TMessage, MessageType>,
  message: any,
): message is TMessage {
  return message?.__messageType === messageCls.TYPE;
}
