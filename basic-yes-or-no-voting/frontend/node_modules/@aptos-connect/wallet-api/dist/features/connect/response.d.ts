import { FinalizedPairingData, SerializedDate } from '@identity-connect/api';
import { type AccountInfo } from '../../shared';
import { UserResponse } from '../../UserResponse';
import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface ConnectResponse extends WalletResponseWithArgs<ConnectResponse.Args> {
}
export declare namespace ConnectResponse {
    export const supportedVersions: readonly [1, 2];
    export type SupportedVersions = (typeof supportedVersions)[number];
    export const currentVersion: 2;
    export interface ApprovalArgs {
        account: AccountInfo;
        pairing?: SerializedDate<FinalizedPairingData>;
    }
    export type Args = UserResponse<ApprovalArgs>;
    type _Response = ConnectResponse;
    export function serialize(args: Args, version?: SupportedVersions): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map