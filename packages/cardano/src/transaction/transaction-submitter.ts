import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { SubmitTransactionResult } from './types';

export class TransactionSubmitter {
  private wallet: ObservableWallet;
  private txSubmitProvider: any; // Cardano SDK TxSubmitProvider

  constructor(wallet: ObservableWallet) {
    this.wallet = wallet;
    // Extract the tx submit provider from wallet - following Lace pattern
    this.txSubmitProvider = wallet.txSubmitProvider;
  }

  /**
   * Submit a signed transaction using ObservableWallet (Lace pattern)
   */
  async submitTransaction(
    signedTransaction: Cardano.Tx
  ): Promise<SubmitTransactionResult> {
    try {
      // Validate transaction before submission
      await this.validateTransaction(signedTransaction);

      // Submit transaction using wallet's built-in submit functionality
      const txHash = await this.wallet.submitTx(signedTransaction);

      return {
        txHash: txHash.toString(),
        success: true
      };
    } catch (error) {
      return {
        txHash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Submit transaction using raw bytes (alternative method)
   */
  async submitTransactionBytes(
    transactionBytes: Uint8Array
  ): Promise<SubmitTransactionResult> {
    try {
      // Submit raw transaction bytes
      const txHash = await this.txSubmitProvider.submitTx(transactionBytes);

      return {
        txHash: txHash.toString(),
        success: true
      };
    } catch (error) {
      return {
        txHash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Submit transaction using hex string
   */
  async submitTransactionHex(
    transactionHex: string
  ): Promise<SubmitTransactionResult> {
    try {
      // Convert hex to bytes
      const transactionBytes = this.hexToBytes(transactionHex);
      
      // Submit bytes
      return await this.submitTransactionBytes(transactionBytes);
    } catch (error) {
      return {
        txHash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert hex to bytes'
      };
    }
  }

  /**
   * Validate transaction before submission
   */
  private async validateTransaction(transaction: Cardano.Tx): Promise<void> {
    // Check if transaction has required components
    if (!transaction.body || !transaction.witnessSet) {
      throw new Error('Transaction is missing required components');
    }

    // Check if transaction has inputs
    if (!transaction.body.inputs || transaction.body.inputs.length === 0) {
      throw new Error('Transaction must have at least one input');
    }

    // Check if transaction has outputs
    if (!transaction.body.outputs || transaction.body.outputs.length === 0) {
      throw new Error('Transaction must have at least one output');
    }

    // Check if transaction has signatures
    if (!transaction.witnessSet.signatures || transaction.witnessSet.signatures.length === 0) {
      throw new Error('Transaction must be signed');
    }

    // Note: In Cardano, signature validation is more complex
    // Multiple inputs can be signed by the same key, so we skip this check

    // Validate fee
    if (transaction.body.fee < BigInt(0)) {
      throw new Error('Transaction fee cannot be negative');
    }

    // Validate outputs have positive values
    for (const output of transaction.body.outputs) {
      if (output.value.coins < BigInt(0)) {
        throw new Error('Output value cannot be negative');
      }
    }
  }

  /**
   * Convert hex string to bytes
   */
  private hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Hex string must have even length');
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16);
      if (isNaN(byte)) {
        throw new Error('Invalid hex string');
      }
      bytes[i / 2] = byte;
    }

    return bytes;
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    blockHeight?: number;
    confirmations?: number;
  }> {
    try {
      // This would typically query the network for transaction status
      // For now, return a placeholder response
      return {
        status: 'pending'
      };
    } catch (error) {
      throw new Error(`Failed to get transaction status: ${error}`);
    }
  }

  /**
   * Update the wallet instance
   */
  updateWallet(wallet: ObservableWallet): void {
    this.wallet = wallet;
  }

  /**
   * Get current wallet instance
   */
  getWallet(): ObservableWallet {
    return this.wallet;
  }
}
