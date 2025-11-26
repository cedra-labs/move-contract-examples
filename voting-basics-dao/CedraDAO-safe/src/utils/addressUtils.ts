/**
 * Utility functions for address formatting and manipulation
 */

/**
 * Truncates an address to show first 4 characters after 0x and last 4 characters
 * This ensures leading zeros are properly preserved
 * @param address - The full address string
 * @returns Truncated address in format 0x1234...abcd
 */
export const truncateAddress = (address: string): string => {
  if (!address) return 'Unknown';
  
  // Remove 0x prefix if present, then add it back properly
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // If address is too short, return as-is
  if (cleanAddress.length <= 8) return `0x${cleanAddress}`;
  
  // Take first 4 and last 4 characters from the hex part (after 0x)
  return `0x${cleanAddress.slice(0, 4)}...${cleanAddress.slice(-4)}`;
};

/**
  Validates if a string is a valid Ethereum-style address
  @param address - The address string to validate
  @returns True if valid address format
 */
export const isValidAddress = (address: string): boolean => {
  if (!address) return false;
  
  // Remove 0x prefix for validation
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // Check if it's a valid hex string of correct length (64 characters for full address)
  return /^[0-9a-fA-F]{64}$/.test(cleanAddress);
};

/**
 * Ensures address has 0x prefix
 * @param address - The address string
 * @returns Address with 0x prefix
 */
export const ensureAddressPrefix = (address: string): string => {
  if (!address) return '';
  return address.startsWith('0x') ? address : `0x${address}`;
};