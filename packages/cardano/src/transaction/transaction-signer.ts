import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { SignTransactionResult } from './types';

export class TransactionSigner {
  private wallet: ObservableWallet;

  constructor(wallet: ObservableWallet) {
    this.wallet = wallet;
  }

  /**
   * Sign a Cardano transaction using ObservableWallet (Lace pattern)
   */
  async signTransaction(
    transaction: any // UnwitnessedTx from SDK
  ): Promise<SignTransactionResult> {
    try {
      // Use wallet's built-in signing functionality
      // This follows the Lace pattern where wallet handles signing internally
      const signedTransaction = await this.wallet.finalizeTx(transaction);
      
      return {
        signedTransaction,
        witnessSet: signedTransaction.witnessSet
      };
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Sign transaction with password (Lace pattern)
   */
  async signTransactionWithPassword(
    transaction: any, // UnwitnessedTx
    password: string
  ): Promise<SignTransactionResult> {
    try {
      // This follows the Lace signAndSubmit pattern
      const signedTransaction = await this.wallet.finalizeTx({
        tx: transaction,
        password
      });
      
      return {
        signedTransaction,
        witnessSet: signedTransaction.witnessSet
      };
    } catch (error) {
      throw new Error(`Failed to sign transaction with password: ${error}`);
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

