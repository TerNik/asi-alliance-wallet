import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet, createWalletUtil } from '@cardano-sdk/wallet';
import { firstValueFrom } from 'rxjs';
import { getTransactionConfig } from './config/cardano-config';
import { 
  TransactionProps, 
  TransactionOutput
} from './transaction/types';

/**
 * Simplified TransactionManager following Lace pattern
 * Acts as a facade over Cardano SDK ObservableWallet
 */
export class CardanoTransactionManager {
  private wallet: ObservableWallet;

  constructor(wallet: ObservableWallet) {
    this.wallet = wallet;
  }

  /**
   * Send ADA and/or tokens using SDK (Lace pattern)
   */
  async sendTransaction(
    outputs: TransactionOutput[],
    metadata?: string
  ): Promise<{
    txHash: string;
    fee: bigint;
    inspection: any;
  }> {
    try {
      // Build transaction using SDK directly (Lace pattern)
      const { tx, inspection } = await this.buildTransaction({ outputs, metadata });
      
      // Sign and submit using wallet (Lace pattern)
      const signedTx = await this.wallet.finalizeTx(tx);
      
      // Submit through wallet
      await this.wallet.submitTx(signedTx);
      
      return {
        txHash: inspection.hash,
        fee: inspection.inputSelection.fee,
        inspection
      };
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message || error}`);
    }
  }

  /**
   * Delegate stake using SDK (Lace pattern)
   */
  async delegateStake(
    stakePoolId: string
  ): Promise<{
    txHash: string;
    fee: bigint;
  }> {
    try {
      // Use SDK delegation builder (Lace pattern)
      const txBuilder = this.wallet.createTxBuilder();
      const tip = await firstValueFrom(this.wallet.tip$);
      
      txBuilder.setValidityInterval({
        invalidHereafter: Cardano.Slot(tip.slot + BigInt(getTransactionConfig().invalidHereafter))
      });
      
      // Delegate portfolio (Lace pattern)
      const pools = [{ weight: 1, id: stakePoolId }];
      const delegationTxBuilder = txBuilder.delegatePortfolio({ pools });
      
      const tx = await delegationTxBuilder.build();
      const inspection = await tx.inspect();
      
      // Sign and submit
      const signedTx = await this.wallet.finalizeTx(tx);
      await this.wallet.submitTx(signedTx);
      
      return {
        txHash: inspection.hash,
        fee: inspection.inputSelection.fee
      };
    } catch (error) {
      throw new Error(`Failed to delegate stake: ${error.message || error}`);
    }
  }

  /**
   * Withdraw rewards using SDK (Lace pattern)
   */
  async withdrawRewards(): Promise<{
    txHash: string;
    fee: bigint;
  }> {
    try {
      // Use SDK withdrawal builder
      const txBuilder = this.wallet.createTxBuilder();
      const tip = await firstValueFrom(this.wallet.tip$);
      
      txBuilder.setValidityInterval({
        invalidHereafter: Cardano.Slot(tip.slot + BigInt(getTransactionConfig().invalidHereafter))
      });
      
      // SDK handles reward withdrawal automatically
      const tx = await txBuilder.build();
      const inspection = await tx.inspect();
      
      // Sign and submit
      const signedTx = await this.wallet.finalizeTx(tx);
      await this.wallet.submitTx(signedTx);
      
      return {
        txHash: inspection.hash,
        fee: inspection.inputSelection.fee
      };
    } catch (error) {
      throw new Error(`Failed to withdraw rewards: ${error.message || error}`);
    }
  }

  /**
   * Build transaction using SDK directly (Lace pattern)
   */
  async buildTransaction(props: TransactionProps): Promise<{
    tx: any; // UnwitnessedTx
    inspection: any;
    minimumCoinQuantities?: any;
  }> {
    try {
      // Validate outputs using SDK utility (Lace pattern)
      const util = createWalletUtil(this.wallet);
      const cardanoOutputs = this.convertToCardanoOutputs(props.outputs);
      const minimumCoinQuantities = await util.validateOutputs(cardanoOutputs);
      
      // Create TxBuilder (Lace pattern)
      const txBuilder = this.wallet.createTxBuilder();
      
      // Set validity interval (Lace pattern)
      const tip = await firstValueFrom(this.wallet.tip$);
      txBuilder.setValidityInterval({
        invalidHereafter: Cardano.Slot(tip.slot + BigInt(getTransactionConfig().invalidHereafter))
      });
      
      // Add outputs
      for (const output of cardanoOutputs) {
        txBuilder.addOutput(output);
      }
      
      // Add metadata if provided (Lace pattern)
      if (props.metadata) {
        const auxiliaryData = this.createAuxiliaryData(props.metadata);
        if (auxiliaryData.blob) {
          txBuilder.metadata(auxiliaryData.blob);
        }
      }
      
      // Build transaction
      const tx = await txBuilder.build();
      const inspection = await tx.inspect();
      
      return {
        tx,
        inspection,
        minimumCoinQuantities
      };
    } catch (error) {
      throw new Error(`Failed to build transaction: ${error.message || error}`);
    }
  }

  /**
   * Estimate transaction fee using SDK (Lace pattern)
   */
  async estimateFee(
    outputs: TransactionOutput[],
    metadata?: string
  ): Promise<bigint> {
    try {
      const { inspection } = await this.buildTransaction({ outputs, metadata });
      return inspection.inputSelection.fee;
    } catch (error) {
      console.warn('Fee estimation failed, using fallback:', error);
      return BigInt(200000); // 0.2 ADA fallback
    }
  }

  /**
   * Get current balance from wallet (SDK observable)
   */
  async getBalance(): Promise<{ coins: bigint; assets?: Map<string, bigint> }> {
    try {
      const balance = await firstValueFrom(this.wallet.balance.utxo.total$);
      return {
        coins: balance.coins,
        assets: balance.assets
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message || error}`);
    }
  }

  /**
   * Get all UTXOs from wallet (SDK observable)
   */
  async getUtxos(): Promise<any[]> {
    try {
      const utxos = await firstValueFrom(this.wallet.utxo.total$);
      return Array.from(utxos);
    } catch (error) {
      throw new Error(`Failed to get UTXOs: ${error.message || error}`);
    }
  }

  /**
   * Validate transaction using SDK (Lace pattern)
   */
  async validateTransaction(outputs: TransactionOutput[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    minimumCoinQuantities?: any;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let minimumCoinQuantities;

    try {
      const util = createWalletUtil(this.wallet);
      const cardanoOutputs = this.convertToCardanoOutputs(outputs);
      minimumCoinQuantities = await util.validateOutputs(cardanoOutputs);
      
      // Check for insufficient minimum coins
      for (const mq of minimumCoinQuantities) {
        if (mq.coinMissing > BigInt(0)) {
          warnings.push(`Output requires additional ${mq.coinMissing} lovelace to meet minimum UTXO requirement`);
        }
      }
      
    } catch (error) {
      errors.push(`Transaction validation failed: ${error.message || error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      minimumCoinQuantities
    };
  }

  /**
   * Get wallet instance
   */
  getWallet(): ObservableWallet {
    return this.wallet;
  }

  /**
   * Convert outputs to Cardano format (Lace pattern)
   */
  private convertToCardanoOutputs(outputs: TransactionOutput[]): Cardano.TxOut[] {
    return outputs.map(output => ({
      address: Cardano.PaymentAddress(output.address),
      value: {
        coins: output.value.coins,
        assets: output.value.assets || new Map()
      }
    }));
  }

  /**
   * Create auxiliary data from metadata (Lace pattern)
   */
  private createAuxiliaryData(metadata: string): { blob?: Cardano.TxMetadata } {
    try {
      let metadataObj: any;
      try {
        metadataObj = JSON.parse(metadata);
      } catch {
        metadataObj = metadata;
      }
      
      const metadataMap = new Map<bigint, Cardano.Metadatum>();
      
      if (typeof metadataObj === 'string') {
        // CIP-20 message format
        metadataMap.set(674n, { 
          map: new Map([['msg', [metadataObj]]])
        } as Cardano.Metadatum);
      } else if (typeof metadataObj === 'object') {
        metadataMap.set(0n, metadataObj as Cardano.Metadatum);
      }
      
      return {
        blob: metadataMap.size > 0 ? metadataMap : undefined
      };
    } catch (error) {
      throw new Error(`Failed to create auxiliary data: ${error.message || error}`);
    }
  }
}
