/**
 * DAO Core Service for Cedra Network
 *
 * Handles DAO creation, proposals, and voting using Cedra SDK
 * Wallet-based transaction signing and submission
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/CedraWalletProvider'
import { cedraClient } from '../cedra_service/cedra-client'
import { MODULE_ADDRESS } from '../cedra_service/constants'
import { DAO_FUNCTIONS, DAO_RESOURCES } from '../services_abi/dao_core'

export interface CreateDAOParams {
  name: string
  subname: string
  description: string
  logo: Uint8Array
  background: Uint8Array
  minStakeToJoin: number
  xLink: string
  discordLink: string
  telegramLink: string
  website: string
  category: string
}

export interface CreateDAOWithUrlsParams {
  name: string
  subname: string
  description: string
  logoUrl: string
  backgroundUrl: string
  minStakeToJoin: number
  xLink: string
  discordLink: string
  telegramLink: string
  website: string
  category: string
}

export interface DAOInfo {
  name: string
  subname: string
  description: string
  logo: Uint8Array
  background: Uint8Array
  createdAt: number
}

export interface DAOCreationProposal {
  id: number
  proposer: string
  targetDaoAddress: string
  name: string
  subname: string
  description: string
  createdAt: number
  votingDeadline: number
  yesVotes: number
  noVotes: number
  executed: boolean
  approved: boolean
}

export function useCreateDAO() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createDAO = async (params: CreateDAOParams) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      console.log('📋 Creating DAO on Cedra Network')
      console.log('👤 Account:', account.address)

      // Validate parameters against contract requirements

      // Name validation (3-100 characters)
      if (!params.name || params.name.trim().length < 3) {
        throw new Error('DAO name must be at least 3 characters long')
      }
      if (params.name.length > 100) {
        throw new Error('DAO name must be less than 100 characters')
      }

      // Subname validation
      if (!params.subname || params.subname.trim().length < 3) {
        throw new Error('DAO subname must be at least 3 characters long')
      }
      if (params.subname.length > 100) {
        throw new Error('DAO subname must be less than 100 characters')
      }

      // Description validation (10-2000 characters)
      if (!params.description || params.description.trim().length < 10) {
        throw new Error('DAO description must be at least 10 characters long')
      }
      if (params.description.length > 2000) {
        throw new Error('DAO description must be less than 2000 characters')
      }

      // Logo size validation (contract allows up to 1MB)
      const maxLogoSize = 1_048_576 // 1MB
      if (params.logo.length > maxLogoSize) {
        throw new Error(`Logo must be ≤ ${Math.round(maxLogoSize/1024)}KB (contract limit). Current: ${Math.round(params.logo.length/1024)}KB`)
      }

      // Background size validation (contract allows up to 5MB)
      const maxBgSize = 5_242_880 // 5MB
      if (params.background.length > maxBgSize) {
        throw new Error(`Background must be ≤ ${Math.round(maxBgSize/1024)}KB (contract limit). Current: ${Math.round(params.background.length/1024)}KB`)
      }

      // Min stake validation (6,000,000-10,000,000,000 octas = 6-10,000 CEDRA)
      if (params.minStakeToJoin < 6000000) {
        throw new Error('Minimum stake must be at least 6 CEDRA tokens')
      }
      if (params.minStakeToJoin > 10000000000) {
        throw new Error('Minimum stake must be less than 10,000 CEDRA tokens')
      }

      // Prepare transaction payload using ABI helpers
      const logoBytes = Array.from(params.logo);
      const backgroundBytes = Array.from(params.background);

      // Prepare payload in exact format wallet expects
      const payload = {
        function: DAO_FUNCTIONS.CREATE_DAO as `${string}::${string}::${string}`,
        typeArguments: [] as string[],
        functionArguments: [
          params.name,
          params.subname,
          params.description,
          logoBytes,
          backgroundBytes,
          params.minStakeToJoin,
          params.xLink || "",
          params.discordLink || "",
          params.telegramLink || "",
          params.website || "",
          params.category || ""
        ],
      }

      console.log('📋 Transaction payload:')
      console.log('  - Function:', DAO_FUNCTIONS.CREATE_DAO)
      console.log('  - Name:', params.name, `(${params.name.length} chars)`)
      console.log('  - Subname:', params.subname, `(${params.subname.length} chars)`)
      console.log('  - Description:', `${params.description.length} chars`)
      console.log('  - Logo:', `${params.logo.length} bytes`)
      console.log('  - Background:', `${params.background.length} bytes`)
      console.log('  - Min stake:', params.minStakeToJoin, 'octas (CEDRA)')

      // Verify contract exists before submitting
      console.log('🔍 Verifying contract exists on Cedra testnet...')
      try {
        const module = await cedraClient.getAccountModule({
          accountAddress: MODULE_ADDRESS,
          moduleName: 'dao_core_file'
        });
        console.log(' Contract verified on-chain:', module ? 'exists' : 'not found')
      } catch (verifyError) {
        console.error(' WARNING: Contract may not be deployed:', verifyError)
        throw new Error('DAO contract not found on Cedra testnet. Please ensure the contract is deployed.')
      }

      // Calculate gas based on data size
      const logoSize = params.logo.length
      const backgroundSize = params.background.length
      const totalImageSize = logoSize + backgroundSize

      const baseGas = 80000
      const gasPerByte = 2
      const estimatedGas = baseGas + (totalImageSize * gasPerByte)
      const maxGasAmount = Math.min(Math.max(estimatedGas, 150000), 500_000)

      console.log('⛽ Gas estimation:', {
        logoSize: `${logoSize} bytes`,
        backgroundSize: `${backgroundSize} bytes`,
        totalImageSize: `${totalImageSize} bytes`,
        estimatedGas,
        maxGasAmount,
      })

      // Submit via wallet (wallet will build, sign, and submit)
      console.log('🚀 Submitting DAO creation via Cedra wallet...')

      let resultTx;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount <= maxRetries) {
        try {
          console.log('📤 Sending transaction to wallet');

          // Wallet expects: { payload, gasUnitPrice?, maxGasAmount? }
          const walletInput = {
            payload,
            maxGasAmount,
            gasUnitPrice: 100
          };

          resultTx = await signAndSubmitTransaction(walletInput);
          break;
        } catch (retryError: any) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw retryError;
          }

          const isRetryableError = retryError.message?.includes('network') ||
                                  retryError.message?.includes('timeout') ||
                                  retryError.message?.includes('429') ||
                                  retryError.message?.includes('503');

          if (!isRetryableError) {
            throw retryError;
          }

          console.log(` Network error on attempt ${retryCount}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Extract transaction hash
      const txHash = typeof resultTx === 'string'
        ? resultTx
        : ((resultTx as any)?.hash || (resultTx as any)?.transactionHash || null);

      if (txHash) {
        try {
          console.log('⏳ Waiting for transaction confirmation...')
          await cedraClient.waitForTransaction({
            transactionHash: txHash as string,
            options: {
              checkSuccess: true,
              timeoutSecs: 45
            }
          });
          console.log(` DAO created successfully! Transaction: ${txHash}`)
        } catch (waitError) {
          console.warn(' Transaction confirmation timeout. DAO creation likely succeeded.')
        }
      }

      // Verify DAO creation using ABI resource type
      try {
        await cedraClient.getAccountResource({
          accountAddress: account.address,
          resourceType: DAO_RESOURCES.DAO_INFO as `${string}::${string}::${string}`
        })
        console.log('DAO resource verified on-chain')
      } catch (verifyError) {
        console.warn(' DAO verification pending (indexer delay)')
      }

      setIsPending(false)
      return resultTx
    } catch (err: any) {
      console.error('Error in createDAO:', err)

      // Enhanced error handling
      let errorMessage = 'Failed to create DAO'

      if (err.message?.includes('User rejected') || err.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected by the wallet. Please approve the transaction to create the DAO.'
      } else if (err.message?.includes('insufficient') || err.message?.includes('balance')) {
        errorMessage = 'Insufficient balance to pay for transaction fees. Please ensure you have enough CEDRA tokens.'
      } else if (err.message?.includes('gas')) {
        errorMessage = 'Gas estimation failed. This might be a temporary network issue. Please try again.'
      } else if (err.message?.includes('network') || err.message?.includes('connection')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  const createDAOWithUrls = async (params: CreateDAOWithUrlsParams) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      console.log('Creating DAO with URLs on Cedra Network')

      // Validate parameters
      if (!params.name || params.name.trim().length < 3) {
        throw new Error('DAO name must be at least 3 characters long')
      }
      if (!params.logoUrl || !params.backgroundUrl) {
        throw new Error('Logo and background URLs are required')
      }

      const payload = {
        function: DAO_FUNCTIONS.CREATE_DAO_WITH_URLS as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [
          params.name,
          params.subname,
          params.description,
          params.logoUrl,
          params.backgroundUrl,
          params.minStakeToJoin,
          params.xLink,
          params.discordLink,
          params.telegramLink,
          params.website,
          params.category
        ],
      }

      console.log('Submitting DAO creation with URLs...')

      const tx = await signAndSubmitTransaction({
        payload,
        options: {
          maxGasAmount: 200_000,
          gasUnitPrice: 100
        }
      } as any);

      const txHash = (tx as any)?.hash || (tx as any)?.transactionHash;

      if (txHash) {
        try {
          console.log('Waiting for confirmation...')
          await cedraClient.waitForTransaction({
            transactionHash: txHash,
            options: { checkSuccess: true, timeoutSecs: 30 }
          });
          console.log(`DAO created with URLs! Transaction: ${txHash}`)
        } catch (waitError) {
          console.warn(' Confirmation timeout')
        }
      }

      setIsPending(false)
      return tx
    } catch (err: any) {
      console.error('Error creating DAO with URLs:', err)

      let errorMessage = 'Failed to create DAO with URLs'

      if (err.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by the wallet.'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  const testMinimalTransaction = async () => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    console.log('Testing minimal DAO creation transaction...')

    const payload = {
      function: DAO_FUNCTIONS.CREATE_DAO as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [
        "Test DAO",
        "test-dao",
        "A test DAO for debugging",
        [1, 2, 3],
        [4, 5, 6],
        6000000,
        "", "", "", "", ""
      ],
    }

    try {
      const result = await signAndSubmitTransaction({ payload } as any)
      return result
    } catch (testError) {
      console.error('Minimal transaction failed:', testError)
      throw testError
    }
  }

  return {
    createDAO,
    createDAOWithUrls,
    testMinimalTransaction,
    isPending,
    error,
  }
}

export function useProposeDAOCreation() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proposeDAOCreation = async (
    councilAddress: string,
    targetDAOAddress: string,
    params: CreateDAOParams
  ) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::propose_dao_creation`,
        typeArguments: [],
        functionArguments: [
          councilAddress,
          targetDAOAddress,
          params.name,
          params.subname,
          params.description,
          Array.from(params.logo),
          Array.from(params.background),
          params.minStakeToJoin.toString()
        ],
      }

      const result = await signAndSubmitTransaction({ payload } as any)
      setIsPending(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to propose DAO creation'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    proposeDAOCreation,
    isPending,
    error,
  }
}

// Utility function to convert Uint8Array to data URL
const uint8ArrayToDataUrl = (uint8Array: Uint8Array, mimeType: string = 'image/jpeg'): string => {
  try {
    if (!uint8Array || uint8Array.length === 0) {
      return '';
    }

    const binary = Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');

    const base64 = btoa(binary);

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting Uint8Array to data URL:', error);
    return '';
  }
};

// Enhanced interface that includes data URLs for display
export interface DAOInfoWithImages extends DAOInfo {
  logoDataUrl?: string;
  backgroundDataUrl?: string;
}

export function useGetDAOInfo(daoAddress: string | null) {
  const [data, setData] = useState<DAOInfoWithImages | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDAOInfo = async () => {
    if (!daoAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_dao_info_with_subname`,
          functionArguments: [daoAddress],
        },
      })

      const [name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = result

      let logoUint8: Uint8Array;
      let logoDataUrl: string;
      if (logoIsUrl) {
        logoDataUrl = logoUrl as string;
        logoUint8 = new Uint8Array();
      } else {
        logoUint8 = new Uint8Array(logoData as number[]);
        logoDataUrl = uint8ArrayToDataUrl(logoUint8);
      }

      let backgroundUint8: Uint8Array;
      let backgroundDataUrl: string;
      if (bgIsUrl) {
        backgroundDataUrl = bgUrl as string;
        backgroundUint8 = new Uint8Array();
      } else {
        backgroundUint8 = new Uint8Array(bgData as number[]);
        backgroundDataUrl = uint8ArrayToDataUrl(backgroundUint8);
      }

      setData({
        name: name as string,
        subname: (subname as string) || '',
        description: description as string,
        logo: logoUint8,
        background: backgroundUint8,
        logoDataUrl,
        backgroundDataUrl,
        createdAt: Number(createdAt),
      })
    } catch (err) {
      console.error('Failed to fetch DAO info:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DAO info'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDAOInfo()
  }, [daoAddress])

  return {
    data,
    isLoading,
    error,
    refetch: fetchDAOInfo,
  }
}

export function useGetDAOCreationProposals(councilAddress: string | null) {
  const [data, setData] = useState<DAOCreationProposal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = async () => {
    if (!councilAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const countResult = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_dao_creation_proposal_count`,
          functionArguments: [councilAddress],
        },
      })

      const proposalCount = Number(countResult[0])
      const proposals: DAOCreationProposal[] = []

      for (let i = 0; i < proposalCount; i++) {
        try {
          const proposalResult = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_dao_creation_proposal`,
              functionArguments: [councilAddress, i],
            },
          })

          const [
            id,
            proposer,
            targetDaoAddress,
            name,
            subname,
            createdAt,
            votingDeadline,
            yesVotes,
            noVotes,
            executed,
            approved
          ] = proposalResult

          proposals.push({
            id: Number(id),
            proposer: proposer as string,
            targetDaoAddress: targetDaoAddress as string,
            name: name as string,
            subname: subname as string,
            description: '',
            createdAt: Number(createdAt),
            votingDeadline: Number(votingDeadline),
            yesVotes: Number(yesVotes),
            noVotes: Number(noVotes),
            executed: Boolean(executed),
            approved: Boolean(approved),
          })
        } catch (proposalError) {
          console.warn(`Failed to fetch proposal ${i}:`, proposalError)
        }
      }

      setData(proposals)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DAO creation proposals'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [councilAddress])

  return {
    data,
    isLoading,
    error,
    refetch: fetchProposals,
  }
}

export function useVoteOnDAOCreation() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const voteOnDAOCreation = async (
    councilAddress: string,
    proposalId: number,
    approve: boolean
  ) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::vote_on_dao_creation`,
        typeArguments: [],
        functionArguments: [councilAddress, proposalId.toString(), approve],
      }

      const result = await signAndSubmitTransaction({ payload } as any)
      setIsPending(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote on DAO creation'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    voteOnDAOCreation,
    isPending,
    error,
  }
}

export function useExecuteDAOCreation() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeDAOCreation = async (councilAddress: string, proposalId: number) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::execute_dao_creation`,
        typeArguments: [],
        functionArguments: [councilAddress, proposalId.toString()],
      }

      const result = await signAndSubmitTransaction({ payload } as any)
      setIsPending(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute DAO creation'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    executeDAOCreation,
    isPending,
    error,
  }
}

export function useCheckDAOCreationRegistry(councilAddress: string | null) {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkRegistry = async () => {
    if (!councilAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::is_dao_creation_registry_initialized`,
          functionArguments: [councilAddress],
        },
      })

      setIsInitialized(Boolean(result[0]))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check DAO creation registry'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkRegistry()
  }, [councilAddress])

  return {
    isInitialized,
    isLoading,
    error,
    refetch: checkRegistry,
  }
}

export function useCheckSubnameAvailability() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkSubname = async (subname: string): Promise<{ isAvailable: boolean, owner?: string }> => {
    if (!subname) {
      throw new Error('Subname is required')
    }

    setIsPending(true)
    setError(null)

    try {
      const takenResult = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::is_subname_taken`,
          functionArguments: [subname],
        },
      })

      const isTaken = Boolean(takenResult[0])

      if (isTaken) {
        try {
          const ownerResult = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_subname_owner`,
              functionArguments: [subname],
            },
          })

          return {
            isAvailable: false,
            owner: ownerResult[0] as string
          }
        } catch (ownerError) {
          console.warn('Failed to get subname owner:', ownerError)
          return {
            isAvailable: false
          }
        }
      }

      return {
        isAvailable: true
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check subname availability'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsPending(false)
    }
  }

  return {
    checkSubname,
    isPending,
    error,
  }
}
