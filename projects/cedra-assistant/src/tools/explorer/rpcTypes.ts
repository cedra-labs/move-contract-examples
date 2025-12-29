export interface RpcTransaction {
  hash: string;
  sender: string;
  success: boolean;
  gas_used: string | number;

  payload?: {
    function?: string;
    arguments?: string[];
  };

  events?: unknown[];
  vm_status?: string;
}
