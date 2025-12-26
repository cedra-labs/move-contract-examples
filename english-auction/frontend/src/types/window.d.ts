import { InputEntryFunctionData } from '@cedra-labs/ts-sdk'

declare global {
  interface Window {
    cedra?: {
      signAndSubmitTransaction: (params: { data: InputEntryFunctionData }) => Promise<{ hash: string }>
      account: () => Promise<{ address: string }>
      network: () => Promise<{ name: string }>
      connect: () => Promise<void>
      disconnect: () => Promise<void>
      isConnected: () => Promise<boolean>
    }
  }
}

export {}

