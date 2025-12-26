import { DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface GetConnectedAccountsRequest extends WalletRequest<GetConnectedAccountsRequest.RequestName, GetConnectedAccountsRequest.CurrentVersion> {
}
export declare namespace GetConnectedAccountsRequest {
    const name: "getConnectedAccounts";
    type RequestName = typeof name;
    const currentVersion: 1;
    type CurrentVersion = typeof currentVersion;
    function serialize(dappInfo: DappInfo): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(request: SerializedWalletRequest<RequestName, CurrentVersion>): GetConnectedAccountsRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, CurrentVersion>;
}
//# sourceMappingURL=request.d.ts.map