/**
 * Balance Service for Cedra Network
 *
 * Handles wallet balance queries using Cedra SDK
 * Supports multiple fallback methods for reliability
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { cedraClient } from '../cedra_service/cedra-client';

export class BalanceService {
  // Cedra uses CedraCoin as the native coin
  private static readonly CEDRA_COIN_STORE_TYPE = '0x1::coin::CoinStore<0x1::cedra_coin::CedraCoin>';
  private static readonly CEDRA_COIN_TYPE = '0x1::cedra_coin::CedraCoin';
  private static readonly OCTAS_TO_CEDRA = 100000000; // 1e8 - Cedra has 8 decimals (Octas)

  /**
   * Get wallet balance using multiple fallback methods
   *
   * Uses Cedra SDK to query CedraCoin balance
   * Implements multiple fallback strategies for reliability
   */
  static async getWalletBalance(address: string): Promise<number> {
    if (!address) {
      console.warn('No address provided for balance check');
      return 0;
    }

    try {
      // Method 1: Try direct account resource query (most reliable)
      const balance = await this.getBalanceFromAccountResource(address);
      if (balance !== null) {
        console.log(` Balance from account resource: ${balance} CEDRA`);
        return balance;
      }
    } catch (error) {
      console.log('Method 1 failed, trying method 2...', error);
    }

    try {
      // Method 2: Try view function call
      const balance = await this.getBalanceFromViewFunction(address);
      if (balance !== null) {
        console.log(` Balance from view function: ${balance} CEDRA`);
        return balance;
      }
    } catch (error) {
      console.log('Method 2 failed, trying method 3...', error);
    }

    try {
      // Method 3: Try account resources list search
      const balance = await this.getBalanceFromAccountResources(address);
      if (balance !== null) {
        console.log(` Balance from account resources: ${balance} CEDRA`);
        return balance;
      }
    } catch (error) {
      console.log('Method 3 failed, trying method 4...', error);
    }

    try {
      // Method 4: Try account info with coins
      const balance = await this.getBalanceFromAccountInfo(address);
      if (balance !== null) {
        console.log(` Balance from account info: ${balance} CEDRA`);
        return balance;
      }
    } catch (error) {
      console.log(' All balance fetching methods failed', error);
    }

    console.warn(` Unable to fetch balance for address ${address}`);
    return 0;
  }

  /**
   * Method 1: Get balance from account resource
   *
   * Queries CedraCoin CoinStore resource directly
   */
  private static async getBalanceFromAccountResource(address: string): Promise<number | null> {
    try {
      const resource = await cedraClient.getAccountResource({
        accountAddress: address,
        resourceType: this.CEDRA_COIN_STORE_TYPE,
      });

      const value = (resource.data as any)?.coin?.value;
      if (value !== undefined && value !== null) {
        return Number(value) / this.OCTAS_TO_CEDRA;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method 2: Get balance using view function
   *
   * Uses Cedra SDK view function to query balance
   */
  private static async getBalanceFromViewFunction(address: string): Promise<number | null> {
    try {
      const result = await cedraClient.view({
        payload: {
          function: '0x1::coin::balance',
          typeArguments: [this.CEDRA_COIN_TYPE],
          functionArguments: [address],
        },
      });

      if (result && result[0] !== undefined) {
        return Number(result[0]) / this.OCTAS_TO_CEDRA;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method 3: Get balance from account resources list
   *
   * Searches all account resources for CedraCoin store
   */
  private static async getBalanceFromAccountResources(address: string): Promise<number | null> {
    try {
      const resources = await cedraClient.getAccountResources({
        accountAddress: address,
      });

      if (!Array.isArray(resources)) return null;

      // Look for CedraCoin store
      const cedraCoinStore: any = resources.find((resource: any) =>
        resource?.type === this.CEDRA_COIN_STORE_TYPE
      );

      if ((cedraCoinStore as any)?.data?.coin?.value) {
        return Number((cedraCoinStore as any).data.coin.value) / this.OCTAS_TO_CEDRA;
      }

      // Fallback: Look for any coin store with value
      const anyCoinStore: any = resources.find((resource: any) =>
        resource?.type?.startsWith('0x1::coin::CoinStore<') &&
        resource?.data?.coin?.value
      );

      if ((anyCoinStore as any)?.data?.coin?.value) {
        return Number((anyCoinStore as any).data.coin.value) / this.OCTAS_TO_CEDRA;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method 4: Get balance from account info
   *
   * Uses Cedra SDK getAccountInfo for balance
   */
  private static async getBalanceFromAccountInfo(address: string): Promise<number | null> {
    try {
      const accountInfo = await cedraClient.getAccountInfo({
        accountAddress: address,
      });

      // Check if account info has balance information
      if ((accountInfo as any)?.balance !== undefined) {
        return Number((accountInfo as any).balance) / this.OCTAS_TO_CEDRA;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Register CedraCoin for an account if not already registered
   *
   * Uses Cedra SDK to check and register CedraCoin
   */
  static async ensureCedraCoinRegistered(
    address: string,
    signAndSubmitTransaction: any
  ): Promise<boolean> {
    try {
      // Check if CedraCoin is already registered
      await cedraClient.getAccountResource({
        accountAddress: address,
        resourceType: this.CEDRA_COIN_STORE_TYPE,
      });
      return true; // Already registered
    } catch {
      // Not registered, need to register
      try {
        const registerPayload = {
          function: '0x1::coin::register',
          typeArguments: [this.CEDRA_COIN_TYPE],
          functionArguments: [],
        };

        const tx = await signAndSubmitTransaction({ payload: registerPayload });
        if (tx?.hash) {
          await cedraClient.waitForTransaction({
            transactionHash: tx.hash,
            options: { checkSuccess: true }
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to register CedraCoin:', error);
        return false;
      }
    }
  }

  /**
   * Check if account has sufficient balance for transaction
   */
  static async hasSufficientBalance(
    address: string, 
    requiredAmount: number, 
    gasReserve: number = 0.02
  ): Promise<{ sufficient: boolean; available: number; required: number }> {
    const balance = await this.getWalletBalance(address);
    const available = Math.max(0, balance - gasReserve);
    const required = requiredAmount;
    
    return {
      sufficient: available >= required,
      available,
      required
    };
  }

  /**
   * Format balance for display
   */
  static formatBalance(balance: number, decimals: number = 2): string {
    return balance.toFixed(decimals);
  }

  /**
   * Convert CEDRA to Octas (smallest unit)
   */
  static cedraToOctas(cedraAmount: number): string {
    return Math.floor(cedraAmount * this.OCTAS_TO_CEDRA).toString();
  }

  /**
   * Convert Octas to CEDRA
   */
  static octasToCedra(octasAmount: string | number): number {
    return Number(octasAmount) / this.OCTAS_TO_CEDRA;
  }
}