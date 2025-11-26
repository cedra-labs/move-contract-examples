import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/CedraWalletProvider';
import { cedraClient } from '../cedra_service/cedra-client';
import { safeView } from '../utils/rpcUtils';
import { MODULE_ADDRESS } from '../cedra_service/constants';

interface VaultData {
  address: string;
  metadata: string;
  totalAssets: number;
  idleAssets: number;
  strategy: string | null;
  manager: string;
  tokenSymbol?: string;
  tokenName?: string;
  decimals?: number;
  iconUrl?: string;
}

interface VaultBalance {
  totalAssets: number;
  idleAssets: number;
  strategicAssets: number;
}

interface VaultTransaction {
  type: 'deposit' | 'withdrawal';
  amount: number;
  from?: string;
  to?: string;
  timestamp: string;
  txHash: string;
  tokenSymbol?: string;
}

export const useVault = (daoId: string, treasuryObject?: string) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Known FA token metadata addresses for your network
  const KNOWN_TOKENS = {
    // Add your network's FA token addresses here
    // Example:
    // '0x...': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  };

  // Convert token amounts based on decimals
  const toTokenAmount = (rawAmount: number, decimals: number = 6): number => rawAmount / Math.pow(10, decimals);
  const fromTokenAmount = (amount: number, decimals: number = 6): number => Math.floor(amount * Math.pow(10, decimals));

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!account?.address || !daoId) return;

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::admin::is_admin`,
          functionArguments: [daoId, account.address]
        }
      });
      setIsAdmin(Boolean(result[0]));
    } catch (error) {
      console.warn('Failed to check admin status:', error);
      setIsAdmin(false);
    }
  }, [account?.address, daoId]);

  // Get token info from metadata address (fallback path)
  const getTokenInfo = useCallback(async (metadataAddress: string) => {
    const knownToken = KNOWN_TOKENS[metadataAddress as keyof typeof KNOWN_TOKENS];
    if (knownToken) return knownToken;

    try {
      console.log('Fetching token metadata from blockchain for:', metadataAddress);

      // Try to fetch symbol, name, decimals, and optional icon from blockchain
      const [symbolRes, nameRes, decimalRes, iconUriRes, iconResAlt] = await Promise.allSettled([
        cedraClient.view({
          payload: {
            function: `0x1::fungible_asset::symbol`,
            functionArguments: [metadataAddress]
          }
        }),
        cedraClient.view({
          payload: {
            function: `0x1::fungible_asset::name`,
            functionArguments: [metadataAddress]
          }
        }),
        cedraClient.view({
          payload: {
            function: `0x1::fungible_asset::decimals`,
            functionArguments: [metadataAddress]
          }
        }),
        // Preferred: icon_uri
        cedraClient.view({
          payload: {
            function: `0x1::fungible_asset::icon_uri`,
            functionArguments: [metadataAddress]
          }
        }),
        // Fallback: icon (some implementations use this)
        cedraClient.view({
          payload: {
            function: `0x1::fungible_asset::icon`,
            functionArguments: [metadataAddress]
          }
        })
      ]);

      const symbol = symbolRes.status === 'fulfilled' ? (symbolRes.value[0] as string) : 'UNKNOWN';
      const name = nameRes.status === 'fulfilled' ? (nameRes.value[0] as string) : symbol;
      const decimals = decimalRes.status === 'fulfilled' ? Number(decimalRes.value[0]) : 6;
      let iconUrl = iconUriRes.status === 'fulfilled' ? (iconUriRes.value?.[0] as string | undefined) : undefined;
      if (!iconUrl && iconResAlt.status === 'fulfilled') {
        iconUrl = (iconResAlt.value?.[0] as string | undefined);
      }

      console.log('Resolved token info:', { symbol, name, decimals, iconUrl });
      return { symbol, name, decimals, iconUrl } as { symbol: string; name: string; decimals: number; iconUrl?: string };
    } catch (error) {
      console.warn('Failed to fetch token metadata:', error);
      return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 6 };
    }
  }, []);

  // Fetch DAO vaults using treasury ABI
  const fetchDAOVaults = useCallback(async () => {
    if (!treasuryObject) {
      setVaults([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get vault addresses from DAO registry
      console.log('Fetching vaults with treasury object:', treasuryObject);

      // Extract the treasury address like other working functions
      const treasuryAddress = typeof treasuryObject === 'string'
        ? treasuryObject
        : (treasuryObject as any).inner || (treasuryObject as any).value || treasuryObject;

      let vaultAddresses;
      try {
        vaultAddresses = await safeView({
          function: `${MODULE_ADDRESS}::treasury::get_dao_vaults`,
          functionArguments: [treasuryAddress]
        }, `dao_vaults_${daoId}`);
      } catch (registryError: any) {
        // If DAOVaultRegistry doesn't exist yet, it means no vaults have been created
        if (registryError.message?.includes('MISSING_DATA') &&
            registryError.message?.includes('DAOVaultRegistry')) {
          console.log('DAOVaultRegistry not found - no vaults created yet');
          setVaults([]);
          setIsLoading(false);
          return;
        }
        // Re-throw other errors
        throw registryError;
      }

      if (!Array.isArray(vaultAddresses) || vaultAddresses.length === 0) {
        setVaults([]);
        setIsLoading(false);
        return;
      }

      // Process vault addresses - they might come as comma-separated string
      let processedAddresses: string[] = [];
      if (Array.isArray(vaultAddresses)) {
        processedAddresses = vaultAddresses.flatMap(addr => {
          const addressString = typeof addr === 'string' ? addr : String(addr);
          // Split by comma in case multiple addresses are in one string
          return addressString.split(',').map(a => a.trim()).filter(a => a.length > 0);
        });
      }

      console.log('Processed vault addresses:', processedAddresses);

      // Fetch vault details for each address via treasury ABI
      const vaultDetails = await Promise.all(
        processedAddresses.map(async (vaultAddr: string) => {
          const addressString = vaultAddr;
          try {
            console.log('Fetching vault details (treasury ABI) for address:', addressString);

            const [symbolRes, nameRes, decimalsRes, balanceRes, metadataRes, iconHelperRes, projectHelperRes] = await Promise.all([
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_asset_symbol`, functionArguments: [addressString] } }),
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_asset_name`, functionArguments: [addressString] } }),
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_asset_decimals`, functionArguments: [addressString] } }),
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_balance`, functionArguments: [addressString] } }),
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_metadata`, functionArguments: [addressString] } }),
              // Optional icon URI helper in treasury module, if available
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_asset_icon_uri`, functionArguments: [addressString] } }).catch(() => undefined),
              // Optional project URI helper in treasury module
              cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::treasury::get_vault_asset_project_uri`, functionArguments: [addressString] } }).catch(() => undefined),
            ]);

            const symbol = (symbolRes?.[0] as string) || 'UNKNOWN';
            const name = (nameRes?.[0] as string) || symbol;
            const decimals = Number(decimalsRes?.[0] ?? 6);
            const balanceRaw = Number(balanceRes?.[0] ?? 0);
            const metadataAddress = typeof metadataRes?.[0] === 'string'
              ? (metadataRes as any)[0]
              : (metadataRes as any)?.[0]?.inner || (metadataRes as any)?.[0]?.value;
            let iconUrl: string | undefined = Array.isArray(iconHelperRes) ? (iconHelperRes as any)?.[0] : (iconHelperRes as any);
            const projectUri: string | undefined = Array.isArray(projectHelperRes) ? (projectHelperRes as any)?.[0] : (projectHelperRes as any);
            if (typeof iconUrl === 'string') iconUrl = iconUrl.trim();
            if (iconUrl === '') iconUrl = undefined;

            const totalAssets = toTokenAmount(balanceRaw, decimals);
            const idleAssets = totalAssets; // No separate idle metric in treasury ABI
            const strategy = null;
            const manager = '';

            // Fallback: if no icon from treasury helper, try standard FA::icon_uri directly with metadata address
            if (!iconUrl && metadataAddress) {
              try {
                const faIcon = await cedraClient.view({ payload: { function: `0x1::fungible_asset::icon_uri`, functionArguments: [metadataAddress] } });
                const resolved = (faIcon?.[0] as string) || '';
                iconUrl = resolved.trim() || undefined;
              } catch {}
              // Try alternate function name if icon_uri missing
              if (!iconUrl) {
                try {
                  const faIconAlt = await cedraClient.view({ payload: { function: `0x1::fungible_asset::icon`, functionArguments: [metadataAddress] } });
                  const resolvedAlt = (faIconAlt?.[0] as string) || '';
                  iconUrl = resolvedAlt.trim() || undefined;
                } catch {}
              }
            }

            // Last resort: if we have a project URI, attempt a common icon path
            if (!iconUrl && projectUri && typeof projectUri === 'string') {
              const trimmed = projectUri.trim();
              if (trimmed.startsWith('http')) {
                iconUrl = `${trimmed.replace(/\/$/, '')}/icon.png`;
              }
            }

            return {
              address: addressString,
              metadata: metadataAddress,
              totalAssets,
              idleAssets,
              strategy,
              manager,
              tokenSymbol: symbol,
              tokenName: name,
              decimals,
              iconUrl
            } as VaultData;

          } catch (vaultError) {
            console.warn(`Failed to fetch vault details for ${addressString}:`, vaultError);
            return null;
          }
        })
      );

      const validVaults = vaultDetails.filter(vault => vault !== null) as VaultData[];
      setVaults(validVaults);

    } catch (error: any) {
      console.error('Failed to fetch DAO vaults:', error);
      // Don't display circuit breaker errors to users, just log them
      if (error.message?.includes('Circuit breaker is OPEN')) {
        setError('Network temporarily unavailable. Please try again later.');
      } else {
        setError(error.message || 'Failed to fetch vault data');
      }
      setVaults([]);
    } finally {
      setIsLoading(false);
    }
  }, [daoId, treasuryObject, getTokenInfo]);

  // Create a new vault for the DAO (admin only)
  const createVault = useCallback(async (metadataAddress: string): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !treasuryObject) {
      throw new Error('Wallet not connected or treasury not available');
    }

    if (!isAdmin) {
      throw new Error('Only DAO admins can create vaults');
    }

    try {
      // Extract the treasury object address like other working treasury functions do
      const treasuryAddress = typeof treasuryObject === 'string'
        ? treasuryObject
        : (treasuryObject as any).inner || (treasuryObject as any).value || treasuryObject;

      console.log('Creating vault with treasury address:', treasuryAddress);
      console.log('Creating vault with metadata address:', metadataAddress);

      // Treasury ABI: create_dao_vault(&signer, address, Object<Treasury>, Object<Metadata>)
      const payload = {
        function: `${MODULE_ADDRESS}::treasury::create_dao_vault`,
        typeArguments: [],
        functionArguments: [daoId, treasuryAddress, metadataAddress],
      };

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as any).hash,
          options: { checkSuccess: true }
        });
      }

      // Refresh vault list
      await fetchDAOVaults();
      return true;

    } catch (error: any) {
      console.error('Create vault failed:', error);

      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('not_admin')) {
        throw new Error('Only DAO admins can create vaults');
      } else {
        throw new Error(error.message || 'Failed to create vault');
      }
    }
  }, [account, signAndSubmitTransaction, treasuryObject, isAdmin, fetchDAOVaults]);

  // Deposit to vault (user function) via treasury ABI
  const depositToVault = useCallback(async (vaultAddress: string, amount: number, decimals?: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      // If decimals not provided, find the vault to get its decimals
      let actualDecimals = decimals;
      if (!actualDecimals) {
        const vault = vaults.find(v => v.address === vaultAddress);
        actualDecimals = vault?.decimals || 6;
        console.log('Using vault decimals:', actualDecimals, 'for vault:', vaultAddress);
      }

      const amountRaw = fromTokenAmount(amount, actualDecimals);
      console.log('Depositing amount:', amount, 'with decimals:', actualDecimals, 'raw amount:', amountRaw);

      // Treasury ABI: user_deposit_to_vault(&signer, dao_address, vault_address, amount)
      const payload = {
        function: `${MODULE_ADDRESS}::treasury::user_deposit_to_vault`,
        typeArguments: [],
        functionArguments: [daoId, vaultAddress, amountRaw.toString()],
      };

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as any).hash,
          options: { checkSuccess: true }
        });
      }

      // Refresh vault data with a small delay to ensure blockchain state is updated
      console.log('Deposit successful, refreshing vault data...');
      setTimeout(async () => {
        await fetchDAOVaults();
      }, 2000); // 2 second delay

      // Also trigger immediate refresh
      await fetchDAOVaults();
      return true;

    } catch (error: any) {
      console.error('Vault deposit failed:', error);

      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('insufficient')) {
        throw new Error('Insufficient token balance');
      } else {
        throw new Error(error.message || 'Deposit failed');
      }
    }
  }, [account, signAndSubmitTransaction, fetchDAOVaults]);

  // Withdraw from vault (admin only) via treasury ABI
  const withdrawFromVault = useCallback(async (vaultAddress: string, amount: number, decimals?: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !treasuryObject) {
      throw new Error('Wallet not connected or treasury not available');
    }

    if (!isAdmin) {
      throw new Error('Only DAO admins can withdraw from vaults');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      // If decimals not provided, find the vault to get its decimals
      let actualDecimals = decimals;
      if (!actualDecimals) {
        const vault = vaults.find(v => v.address === vaultAddress);
        actualDecimals = vault?.decimals || 6;
        console.log('Using vault decimals for withdrawal:', actualDecimals, 'for vault:', vaultAddress);
      }

      const amountRaw = fromTokenAmount(amount, actualDecimals);
      console.log('Withdrawing amount:', amount, 'with decimals:', actualDecimals, 'raw amount:', amountRaw);

      // Extract the treasury address like other working functions
      const treasuryAddress = typeof treasuryObject === 'string'
        ? treasuryObject
        : (treasuryObject as any).inner || (treasuryObject as any).value || treasuryObject;

      console.log('Withdrawing from vault with treasury address:', treasuryAddress);

      const payload = {
        function: `${MODULE_ADDRESS}::treasury::withdraw_from_dao_vault`,
        typeArguments: [],
        functionArguments: [daoId, vaultAddress, amountRaw.toString(), account.address],
      };

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as any).hash,
          options: { checkSuccess: true }
        });
      }

      // Refresh vault data
      await fetchDAOVaults();
      return true;

    } catch (error: any) {
      console.error('Vault withdrawal failed:', error);

      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('not_admin')) {
        throw new Error('Only DAO admins can withdraw from vaults');
      } else if (error.message?.includes('insufficient')) {
        throw new Error('Insufficient vault balance');
      } else {
        throw new Error(error.message || 'Withdrawal failed');
      }
    }
  }, [account, signAndSubmitTransaction, treasuryObject, isAdmin, fetchDAOVaults]);

  // Set vault strategy (admin only) - not supported in current treasury ABI
  const setVaultStrategy = useCallback(async () => {
    throw new Error('Strategy management is not supported by the current treasury ABI');
  }, []);

  // Initialize data fetching
  useEffect(() => {
    if (daoId && treasuryObject) {
      const initTasks = [fetchDAOVaults()];

      if (account?.address) {
        initTasks.push(checkAdminStatus());
      }

      Promise.all(initTasks).catch((error) => {
        console.warn('Vault initialization failed:', error);
      });
    }
  }, [daoId, treasuryObject, account?.address, fetchDAOVaults, checkAdminStatus]);

  // Refresh data every 60 seconds
  useEffect(() => {
    if (!daoId || !treasuryObject) return;

    const interval = setInterval(() => {
      const refreshTasks = [fetchDAOVaults()];

      if (account?.address) {
        refreshTasks.push(checkAdminStatus());
      }

      Promise.all(refreshTasks);
    }, 60000);

    return () => clearInterval(interval);
  }, [daoId, treasuryObject, account?.address, fetchDAOVaults, checkAdminStatus]);

  return {
    vaults,
    isLoading,
    error,
    isAdmin,
    createVault,
    depositToVault,
    withdrawFromVault,
    setVaultStrategy,
    refreshData: () => Promise.all([fetchDAOVaults(), checkAdminStatus()]),
    toTokenAmount,
    fromTokenAmount,
    KNOWN_TOKENS
  };
};