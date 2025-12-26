import { DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface IsConnectedRequest extends WalletRequest<IsConnectedRequest.RequestName, IsConnectedRequest.CurrentVersion> {
}
export declare namespace IsConnectedRequest {
    const name: "isConnected";
    type RequestName = typeof name;
    const currentVersion: 1;
    type CurrentVersion = typeof currentVersion;
    function serialize(dappInfo: DappInfo): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(request: SerializedWalletRequest<RequestName, CurrentVersion>): IsConnectedRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, CurrentVersion>;
}
//# sourceMappingURL=request.d.ts.map