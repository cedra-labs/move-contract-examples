export enum CedraWalletErrorCode {
  Unauthorized = 4100,
  Unsupported = 4200,
  InternalError = -30001
}

export const CedraWalletErrors = Object.freeze({
  [CedraWalletErrorCode.Unauthorized]: {
    status: 'Unauthorized',
    message: 'The requested method and/or account has not been authorized by the user.'
  },
  [CedraWalletErrorCode.InternalError]: {
    status: 'Internal error',
    message: 'Something went wrong within the wallet.'
  },
  [CedraWalletErrorCode.Unsupported]: {
    status: 'Unsupported',
    message: 'The requested feature is not supported.'
  }
})

export class CedraWalletError extends Error {
  readonly code: number
  readonly status: string

  constructor(code: number, message?: string) {
    super(
      message ??
        CedraWalletErrors[code as keyof typeof CedraWalletErrors]?.message ??
        'Unknown error occurred'
    )
    this.code = code
    this.status =
      CedraWalletErrors[code as keyof typeof CedraWalletErrors]?.status ?? 'Unknown error'
    this.name = 'CedraWalletError'
    Object.setPrototypeOf(this, CedraWalletError.prototype)
  }
}
