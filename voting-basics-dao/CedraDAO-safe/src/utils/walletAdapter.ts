import { useWallet } from '../contexts/CedraWalletProvider';

export type WalletContextState = ReturnType<typeof useWallet>;

/**
 * Converts Cedra WalletContextState to WalletStandard format expected by Mosaic
 * This is a simplified adapter that only provides the essential wallet interface
 */
export const createWalletAdapter = (walletContext: WalletContextState) => {
  if (!walletContext.account || !walletContext.connected) {
    return undefined;
  }

  // Create a minimal wallet adapter that matches what Mosaic expects
  return {
    account: {
      address: walletContext.account.address,
      // Convert to Uint8Array for compatibility
      publicKey: walletContext.account.publicKey instanceof Uint8Array
        ? walletContext.account.publicKey
        : new Uint8Array(walletContext.account.publicKey)
    },
    // Provide a wrapper for signAndSubmitTransaction that handles type differences
    signAndSubmitTransaction: async (input: any) => {
      try {
        // The Cedra wallet should handle the transaction signing
        return await walletContext.signAndSubmitTransaction(input);
      } catch (error) {
        console.error('Transaction signing failed:', error);
        throw error;
      }
    },
    connected: walletContext.connected,
    name: walletContext.wallet?.name || 'Unknown'
  } as any; // Type assertion to bypass strict type checking for now
};
