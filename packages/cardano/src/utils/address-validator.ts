import { Cardano } from '@cardano-sdk/core';

/**
 * Validate Cardano address format
 */
export function isValidCardanoAddress(address: string): boolean {
  try {
    // Try to parse the address using Cardano SDK
    const cardanoAddress = Cardano.Address(address);
    
    // Check if it's a valid address type
    const addressType = cardanoAddress.getNetworkId();
    if (addressType === undefined) {
      return false;
    }
    
    // Check if it has payment credential
    const paymentCredential = cardanoAddress.getPaymentCredential();
    if (!paymentCredential) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If parsing fails, it's not a valid address
    return false;
  }
}

/**
 * Get network type from address
 */
export function getAddressNetwork(address: string): 'mainnet' | 'testnet' | 'unknown' {
  try {
    const cardanoAddress = Cardano.Address(address);
    const networkId = cardanoAddress.getNetworkId();
    
    if (networkId === Cardano.NetworkId.Mainnet) {
      return 'mainnet';
    } else if (networkId === Cardano.NetworkId.Testnet) {
      return 'testnet';
    } else {
      return 'unknown';
    }
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Check if address is a stake address
 */
export function isStakeAddress(address: string): boolean {
  try {
    const cardanoAddress = Cardano.Address(address);
    const addressType = cardanoAddress.getAddressType();
    return addressType === Cardano.AddressType.Reward;
  } catch (error) {
    return false;
  }
}

/**
 * Check if address is a payment address
 */
export function isPaymentAddress(address: string): boolean {
  try {
    const cardanoAddress = Cardano.Address(address);
    const addressType = cardanoAddress.getAddressType();
    return addressType === Cardano.AddressType.External || 
           addressType === Cardano.AddressType.Internal;
  } catch (error) {
    return false;
  }
}

