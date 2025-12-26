import { AptosSignInOutput } from '@aptos-labs/wallet-standard';
import { UserResponse } from '../../UserResponse';
import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface SignInResponse extends WalletResponseWithArgs<SignInResponse.Args> {
}
export declare namespace SignInResponse {
    export const supportedVersions: readonly [1];
    export type SupportedVersions = (typeof supportedVersions)[number];
    export const currentVersion: 1;
    export type CurrentVersion = typeof currentVersion;
    export interface ApprovalArgs extends AptosSignInOutput {
    }
    export type Args = UserResponse<ApprovalArgs>;
    type _Response = SignInResponse;
    export function serialize(args: Args, _?: SupportedVersions): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map