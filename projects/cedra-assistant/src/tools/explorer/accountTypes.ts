export interface AccountBalance {
  coin: string;
  value: string;
}

export interface AccountResource {
  type: string;
  data: any;
}

export interface AccountModule {
  name: string;
}

export interface ExplorerAccount {
  address: string;
  balance?: string;
  resources: AccountResource[];
  modules: AccountModule[];
}
