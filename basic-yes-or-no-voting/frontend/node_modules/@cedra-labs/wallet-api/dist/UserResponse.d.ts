import { DeserializeFn, SerializeFn } from './helpers';
export interface UserApproval<TApprovalArgs> {
    args: TApprovalArgs;
    status: 'approved';
}
export interface UserDismissal {
    status: 'dismissed';
}
export type UserResponse<TApprovalArgs> = UserApproval<TApprovalArgs> | UserDismissal;
export declare function makeUserApproval<TApprovalArgs>(args: TApprovalArgs): UserApproval<TApprovalArgs>;
export declare function makeUserResponseSerializeFn<TArgs>(serializeArgs: SerializeFn<TArgs>): SerializeFn<UserResponse<TArgs>>;
export declare function makeUserResponseDeserializeFn<TArgs>(deserializeArgs: DeserializeFn<TArgs>): DeserializeFn<UserResponse<TArgs>>;
//# sourceMappingURL=UserResponse.d.ts.map