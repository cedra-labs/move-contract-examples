/**
 * User Profile Service for Cedra Network
 *
 * Manages user profile data and interactions
 * Uses Cedra SDK for blockchain interactions
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/CedraWalletProvider'
import { cedraClient } from '../cedra_service/cedra-client'
import { ABI } from '../Userprofileabi/profile'
import { managedApiCall } from '../services/apiRequestManager'
import { truncateAddress } from '../utils/addressUtils'

// Profile types based on the contract
export interface UserProfile {
  displayName: string
  avatarUrl: string
  walletAddress: string
  createdAt: number
  updatedAt: number
}

export interface BasicProfile {
  displayName: string
  avatarUrl: string
}

export interface ProfileWithExists {
  displayName: string
  avatarUrl: string
  exists: boolean
}

// Profile creation and update functions
export function useCreateProfile() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProfile = async (displayName: string, avatarUrl: string = '') => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    if (!displayName?.trim()) {
      throw new Error('Display name is required')
    }

    if (displayName.trim().length < 1 || displayName.trim().length > 50) {
      throw new Error('Display name must be between 1 and 50 characters')
    }

    setIsPending(true)
    setError(null)

    try {

      const payload = {
        function: `${ABI.address}::profile::create_profile`,
        typeArguments: [],
        functionArguments: [displayName.trim(), avatarUrl.trim()],
      }

      const tx = await signAndSubmitTransaction({ 
        payload,
        options: {
          maxGasAmount: 50_000,
          gasUnitPrice: 100
        }
      } as any)

      const txHash = typeof tx === 'string' ? tx : (tx as any)?.hash
      
      if (txHash) {
        await cedraClient.waitForTransaction({ 
          transactionHash: txHash as string, 
          options: { checkSuccess: true, timeoutSecs: 30 } 
        })
      }

      setIsPending(false)
      return tx
    } catch (err: any) {
      console.error('Error creating profile:', err)
      
      let errorMessage = 'Failed to create profile'
      if (err.message?.includes('PROFILE_ALREADY_EXISTS')) {
        errorMessage = 'Profile already exists for this wallet'
      } else if (err.message?.includes('INVALID_DISPLAY_NAME')) {
        errorMessage = 'Invalid display name'
      } else if (err.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by the wallet'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    createProfile,
    isPending,
    error,
  }
}

export function useUpdateProfile() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = async (displayName: string, avatarUrl: string = '') => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    if (!displayName?.trim()) {
      throw new Error('Display name is required')
    }

    setIsPending(true)
    setError(null)

    try {

      const payload = {
        function: `${ABI.address}::profile::update_profile`,
        typeArguments: [],
        functionArguments: [displayName.trim(), avatarUrl.trim()],
      }

      const tx = await signAndSubmitTransaction({ 
        payload,
        options: {
          maxGasAmount: 30_000,
          gasUnitPrice: 100
        }
      } as any)

      const txHash = typeof tx === 'string' ? tx : (tx as any)?.hash
      
      if (txHash) {
        await cedraClient.waitForTransaction({ 
          transactionHash: txHash as string, 
          options: { checkSuccess: true, timeoutSecs: 30 } 
        })
      }

      setIsPending(false)
      return tx
    } catch (err: any) {
      console.error('Error updating profile:', err)
      
      let errorMessage = 'Failed to update profile'
      if (err.message?.includes('PROFILE_NOT_FOUND')) {
        errorMessage = 'Profile not found. Please create a profile first.'
      } else if (err.message?.includes('INVALID_DISPLAY_NAME')) {
        errorMessage = 'Invalid display name'
      } else if (err.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by the wallet'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  const updateDisplayName = async (displayName: string) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${ABI.address}::profile::update_display_name`,
        typeArguments: [],
        functionArguments: [displayName.trim()],
      }

      const tx = await signAndSubmitTransaction({ 
        payload,
        options: {
          maxGasAmount: 25_000,
          gasUnitPrice: 100
        }
      } as any)

      setIsPending(false)
      return tx
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update display name'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  const updateAvatarUrl = async (avatarUrl: string) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${ABI.address}::profile::update_avatar_url`,
        typeArguments: [],
        functionArguments: [avatarUrl.trim()],
      }

      const tx = await signAndSubmitTransaction({ 
        payload,
        options: {
          maxGasAmount: 25_000,
          gasUnitPrice: 100
        }
      } as any)

      setIsPending(false)
      return tx
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar URL'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    updateProfile,
    updateDisplayName,
    updateAvatarUrl,
    isPending,
    error,
  }
}

// Profile reading functions
export function useGetProfile(userAddress: string | null) {
  const [data, setData] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState(0)

  // Debounce profile fetching to prevent excessive API calls
  const FETCH_COOLDOWN = 100 // 100ms between fetches (minimal delay)

  const fetchProfile = async () => {
    if (!userAddress) return

    // Check cooldown to prevent excessive API calls
    const now = Date.now()
    if (now - lastFetchTime < FETCH_COOLDOWN) {
      return
    }

    setIsLoading(true)
    setError(null)
    setLastFetchTime(now)

    try {

      const result = await managedApiCall(
        () => cedraClient.view({
          payload: {
            function: `${ABI.address}::profile::get_profile`,
            functionArguments: [userAddress],
          },
        }),
        {
          cacheKey: `profile_${userAddress}`,
          cacheTtl: 120000, // Cache profile for 2 minutes to avoid re-fetch on quick tab switches
          priority: 3 // High priority for profile data
        }
      )

      // Contract returns: (display_name, avatar_url, wallet_address, created_at, updated_at)
      const [displayName, avatarUrl, walletAddress, createdAt, updatedAt] = result

      setData({
        displayName: displayName as string,
        avatarUrl: avatarUrl as string,
        walletAddress: walletAddress as string,
        createdAt: Number(createdAt),
        updatedAt: Number(updatedAt),
      })

    } catch (err: any) {
      // Check for various ways the profile not found error can manifest
      if (err.message?.includes('PROFILE_NOT_FOUND') || 
          err.message?.includes('resource') || 
          err.message?.includes('ABORTED') ||
          err.message?.includes('sub_status: Some(2)') ||
          err.status === 400) {
        // Profile doesn't exist - this is expected for new users, so don't log as error
        console.log(' No profile found for user:', userAddress)
        setData(null)
        setError(null)
      } else if (err.code === 'ERR_NETWORK' || 
                err.message?.includes('CORS') ||
                err.message?.includes('429') ||
                err.message?.includes('Too Many Requests') ||
                err.status === 429) {
        // Network/CORS/Rate limit issues - don't spam logs
        console.log(' Network issue, skipping profile fetch')
        setData(null)
        setError(null)
      } else {
        console.error(' Failed to fetch profile:', err)
        setError(err.message || 'Failed to fetch profile')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userAddress])

  return {
    data,
    isLoading,
    error,
    refetch: fetchProfile,
  }
}

export function useGetBasicProfile(userAddress: string | null) {
  const [data, setData] = useState<BasicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBasicProfile = async () => {
    if (!userAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${ABI.address}::profile::get_basic_profile`,
          functionArguments: [userAddress],
        },
      })

      const [displayName, avatarUrl] = result

      setData({
        displayName: displayName as string,
        avatarUrl: avatarUrl as string,
      })
    } catch (err: any) {
      // Only set error for unexpected errors, not for profile not found
      if (!err.message?.includes('PROFILE_NOT_FOUND') && 
          !err.message?.includes('resource') && 
          !err.message?.includes('ABORTED') &&
          !err.message?.includes('sub_status: Some(2)') &&
          err.status !== 400) {
        setError(err.message || 'Failed to fetch profile')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBasicProfile()
  }, [userAddress])

  return {
    data,
    isLoading,
    error,
    refetch: fetchBasicProfile,
  }
}

// DAO-optimized batch functions
export function useGetMultipleProfiles() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMultipleDisplayNames = async (addresses: string[]): Promise<string[]> => {
    if (!addresses.length) return []

    setIsLoading(true)
    setError(null)

    try {

      const result = await cedraClient.view({
        payload: {
          function: `${ABI.address}::profile::get_multiple_display_names`,
          functionArguments: [addresses],
        },
      })

      const displayNames = result[0] as string[]
      
      setIsLoading(false)
      return displayNames
    } catch (err: any) {
      console.error(' Failed to fetch display names:', err)
      setError(err.message || 'Failed to fetch display names')
      setIsLoading(false)
      return addresses.map(() => '') // Return empty strings as fallback
    }
  }

  const getMultipleAvatarUrls = async (addresses: string[]): Promise<string[]> => {
    if (!addresses.length) return []

    setIsLoading(true)
    setError(null)

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${ABI.address}::profile::get_multiple_avatar_urls`,
          functionArguments: [addresses],
        },
      })

      const avatarUrls = result[0] as string[]
      setIsLoading(false)
      return avatarUrls
    } catch (err: any) {
      console.error(' Failed to fetch avatar URLs:', err)
      setError(err.message || 'Failed to fetch avatar URLs')
      setIsLoading(false)
      return addresses.map(() => '') // Return empty strings as fallback
    }
  }

  const getMultipleBasicProfiles = async (addresses: string[]): Promise<BasicProfile[]> => {
    if (!addresses.length) return []

    setIsLoading(true)
    setError(null)

    try {

      const [displayNames, avatarUrls] = await Promise.all([
        getMultipleDisplayNames(addresses),
        getMultipleAvatarUrls(addresses)
      ])

      const profiles: BasicProfile[] = addresses.map((address, index) => ({
        displayName: displayNames[index] || `User ${address.slice(0, 6)}...`,
        avatarUrl: avatarUrls[index] || '',
      }))

      setIsLoading(false)
      return profiles
    } catch (err: any) {
      console.error(' Failed to batch fetch profiles:', err)
      setError(err.message || 'Failed to fetch profiles')
      setIsLoading(false)
      return addresses.map(address => ({
        displayName: `User ${address.slice(0, 6)}...`,
        avatarUrl: '',
      }))
    }
  }

  const checkMultipleProfilesExist = async (addresses: string[]): Promise<boolean[]> => {
    if (!addresses.length) return []

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${ABI.address}::profile::check_multiple_profiles_exist`,
          functionArguments: [addresses],
        },
      })

      return result[0] as boolean[]
    } catch (err: any) {
      console.error(' Failed to check profile existence:', err)
      return addresses.map(() => false)
    }
  }

  return {
    getMultipleDisplayNames,
    getMultipleAvatarUrls,
    getMultipleBasicProfiles,
    checkMultipleProfilesExist,
    isLoading,
    error,
  }
}

// Profile existence and validation functions
export function useProfileExists(userAddress: string | null) {
  const [exists, setExists] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkProfileExists = async () => {
    if (!userAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${ABI.address}::profile::profile_exists`,
          functionArguments: [userAddress],
        },
      })

      setExists(Boolean(result[0]))
    } catch (err: any) {
      console.error(' Failed to check profile existence:', err)
      
      // For profile existence checks, any error likely means profile doesn't exist
      if (err.message?.includes('PROFILE_NOT_FOUND') || 
          err.message?.includes('resource') || 
          err.message?.includes('ABORTED') ||
          err.message?.includes('sub_status: Some(2)') ||
          err.status === 400) {
        setExists(false)
        setError(null)
      } else {
        setError(err.message || 'Failed to check profile existence')
        setExists(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkProfileExists()
  }, [userAddress])

  return {
    exists,
    isLoading,
    error,
    refetch: checkProfileExists,
  }
}

export function useValidateProfile(userAddress: string | null) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateProfile = async () => {
    if (!userAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${ABI.address}::profile::validate_profile_for_dao_action`,
          functionArguments: [userAddress],
        },
      })

      setIsValid(Boolean(result[0]))
    } catch (err: any) {
      console.error(' Failed to validate profile:', err)
      setError(err.message || 'Failed to validate profile')
      setIsValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    validateProfile()
  }, [userAddress])

  return {
    isValid,
    isLoading,
    error,
    refetch: validateProfile,
  }
}

// Utility function to get profile or fallback to address
export const getDisplayNameOrAddress = (profile: BasicProfile | null, address: string): string => {
  return profile?.displayName && profile.displayName.trim() 
    ? profile.displayName 
    : truncateAddress(address)
}

// Utility function to get avatar or default
export const getAvatarUrlOrDefault = (profile: BasicProfile | null, defaultAvatar: string = ''): string => {
  return profile?.avatarUrl && profile.avatarUrl.trim() 
    ? profile.avatarUrl 
    : defaultAvatar
}