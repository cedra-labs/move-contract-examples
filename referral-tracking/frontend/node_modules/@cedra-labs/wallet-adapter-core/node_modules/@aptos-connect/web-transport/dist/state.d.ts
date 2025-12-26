import { AccountInfo } from '@aptos-connect/wallet-api';
import { AccountAddress } from '@aptos-labs/ts-sdk';
export declare function getConnectedAccounts(): AccountInfo[];
export declare function addConnectedAccount(account: AccountInfo): void;
export declare function removeConnectedAccount(address: AccountAddress): void;
//# sourceMappingURL=state.d.ts.map