import { Cardano } from '@cardano-sdk/core';
import { TransactionOutput } from '../transaction/types';

/**
 * Transaction validator for Cardano transactions
 */
export class TransactionValidator {
  /**
   * Validate transaction outputs
   */
  static validateOutputs(outputs: TransactionOutput[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const output of outputs) {
      // Basic validation
      if (!output.address) {
        errors.push('Output address is required');
      }

      if (output.value.coins < 0n) {
        errors.push('Output coins cannot be negative');
      }

      // Check minimum ADA requirement (basic check)
      if (output.value.assets && output.value.assets.size > 0) {
        if (output.value.coins < 1_000_000n) {
          warnings.push('Output with assets should contain at least 1 ADA');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate address format
   */
  static isValidAddress(address: string): boolean {
    // Basic Cardano address validation
    return address.startsWith('addr') && address.length >= 100;
  }
}

export default TransactionValidator;
