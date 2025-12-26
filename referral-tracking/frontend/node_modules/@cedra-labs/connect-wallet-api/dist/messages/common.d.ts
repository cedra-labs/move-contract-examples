export type TypedMessage<MessageType extends string = string> = {
    __messageType: MessageType;
};
export type TypedMessageConstructor<TMessage extends TypedMessage<MessageType>, MessageType extends string> = {
    TYPE: MessageType;
    new (...args: any[]): TMessage;
};
export declare function isTypedMessage<TMessage extends TypedMessage<MessageType>, MessageType extends string>(messageCls: TypedMessageConstructor<TMessage, MessageType>, message: any): message is TMessage;
//# sourceMappingURL=common.d.ts.map