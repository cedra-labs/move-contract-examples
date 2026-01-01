/* =====================================================
   EXPLORER TYPES (SINGLE SOURCE OF TRUTH)
===================================================== */

export interface ExplorerTransaction {
  hash: string;
  sender: string;
  success: boolean;
  gasUsed: number;
  function?: string;
  arguments?: any[];
  events: any[];
  vmStatus?: string;
}

export interface ExplorerAccount {
  address: string;
  balance?: string;
  resources: {
    type: string;
    data: any;
  }[];
  modules: {
    name: string;
  }[];
}
