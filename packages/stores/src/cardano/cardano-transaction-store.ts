import { makeAutoObservable, runInAction, observable, action, computed } from 'mobx';
// Temporary types until proper Cardano integration
interface TransactionOutput {
  address: string;
  value: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}
import { ObservableWallet } from '@cardano-sdk/wallet';
import { firstValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';

/**
 * Cardano Transaction Store following Lace architecture patterns
 * This store manages Cardano transaction state independently from account system
 */

export interface CardanoTransactionState {
  utxos: any[]; // Cardano SDK UTXO types
  balance: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
  pendingTransactions: Array<{
    id: string;
    outputs: TransactionOutput[];
    status: 'pending' | 'submitted' | 'confirmed' | 'failed';
    txHash?: string;
    error?: string;
    timestamp: number;
  }>;
  transactionHistory: Array<{
    id: string;
    txHash: string;
    outputs: TransactionOutput[];
    fee: bigint;
    status: 'confirmed' | 'failed';
    timestamp: number;
    blockHeight?: number;
  }>;
  isLoading: boolean;
  error?: string;
  lastUpdated: number;
}

export class CardanoTransactionStore {
  @observable state: CardanoTransactionState = {
    utxos: [],
    balance: { coins: BigInt(0), assets: undefined },
    pendingTransactions: [],
    transactionHistory: [],
    isLoading: false,
    error: undefined,
    lastUpdated: Date.now()
  };

  public transactionManager?: any; // Will be CardanoTransactionManager when cardano package builds
  private wallet?: ObservableWallet;
  private subscriptions: Subscription[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * Initialize the transaction manager with ObservableWallet
   */
  @action
  initializeTransactionManager(
    wallet: ObservableWallet
  ): void {
    try {
      this.wallet = wallet;
      // TODO: Initialize proper transaction manager when CardanoTransactionManager is ready
      this.transactionManager = { wallet }; // Temporary placeholder

      // Setup wallet subscriptions for reactive updates
      this.setupWalletSubscriptions();
    } catch (error) {
      runInAction(() => {
        this.state.error = `Failed to initialize transaction manager: ${error}`;
      });
    }
  }

  /**
   * Setup wallet subscriptions following Lace pattern
   */
  private setupWalletSubscriptions(): void {
    if (!this.wallet) return;

    // Clear existing subscriptions
    this.clearSubscriptions();

    // Subscribe to balance changes (Lace pattern)
    const balanceSubscription = this.wallet.balance.utxo.total$.subscribe({
      next: (balance) => {
        runInAction(() => {
          this.state.balance = {
            coins: balance.coins,
            assets: balance.assets
          };
          this.state.lastUpdated = Date.now();
        });
      },
      error: (error) => {
        runInAction(() => {
          this.state.error = `Balance subscription error: ${error.message || error}`;
        });
      }
    });

    // Subscribe to UTXO changes (Lace pattern)
    const utxoSubscription = this.wallet.utxo.total$.subscribe({
      next: (utxos) => {
        runInAction(() => {
          this.state.utxos = Array.from(utxos);
          this.state.lastUpdated = Date.now();
        });
      },
      error: (error) => {
        runInAction(() => {
          this.state.error = `UTXO subscription error: ${error.message || error}`;
        });
      }
    });

    this.subscriptions.push(balanceSubscription, utxoSubscription);
  }

  /**
   * Clear all subscriptions
   */
  private clearSubscriptions(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  /**
   * Force refresh data from wallet (Lace pattern - usually not needed)
   */
  @action
  async refreshFromWallet(): Promise<void> {
    if (!this.wallet) return;
    
    try {
      runInAction(() => {
        this.state.isLoading = true;
        this.state.error = undefined;
      });

      // Force fresh data from wallet observables
      const [balance, utxos] = await Promise.all([
        firstValueFrom(this.wallet.balance.utxo.total$),
        firstValueFrom(this.wallet.utxo.total$)
      ]);

      runInAction(() => {
        this.state.balance = {
          coins: balance.coins,
          assets: balance.assets
        };
        this.state.utxos = Array.from(utxos);
        this.state.lastUpdated = Date.now();
        this.state.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.state.isLoading = false;
        this.state.error = `Failed to refresh from wallet: ${error.message || error}`;
      });
    }
  }

  /**
   * Send transaction using SDK (Lace pattern)
   */
  @action
  async sendTransaction(
    outputs: TransactionOutput[],
    _metadata?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    inspection?: any;
  }> {
    if (!this.transactionManager) {
      const error = 'Transaction manager not initialized';
      runInAction(() => {
        this.state.error = error;
      });
      return { success: false, error };
    }

    try {
      runInAction(() => {
        this.state.isLoading = true;
        this.state.error = undefined;
      });

      // TODO: Implement proper transaction sending when CardanoTransactionManager is ready
      
      // Add to pending transactions
      const pendingId = this.addPendingTransaction(outputs);

      // Simulate transaction result (temporary)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      const mockTxHash = `mock_tx_${Date.now()}`;

      // Update pending transaction status
      this.updatePendingTransactionStatus(pendingId, 'submitted', mockTxHash);

      // Add to transaction history
      this.addToTransactionHistory(mockTxHash, outputs, BigInt(200000)); // Mock 0.2 ADA fee

      runInAction(() => {
        this.state.isLoading = false;
      });

      return { 
        success: true, 
        txHash: mockTxHash
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      runInAction(() => {
        this.state.isLoading = false;
        this.state.error = errorMessage;
      });

      // Update pending transaction status to failed
      if (this.state.pendingTransactions.length > 0) {
        const lastPending = this.state.pendingTransactions[this.state.pendingTransactions.length - 1];
        this.updatePendingTransactionStatus(lastPending.id, 'failed', undefined, errorMessage);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Estimate transaction fee using SDK (Lace pattern)
   */
  async estimateFee(
    _outputs: TransactionOutput[],
    _metadata?: string
  ): Promise<bigint> {
    if (!this.transactionManager) {
      console.warn('Transaction manager not initialized, using fallback fee');
      return BigInt(200000); // 0.2 ADA fallback
    }

    try {
      // When CardanoTransactionManager is available, restore:
      // return await this.transactionManager.estimateFee(outputs, metadata);
      return BigInt(200000); // Fallback until cardano package builds
    } catch (error) {
      console.warn('Fee estimation failed, using fallback:', error);
      return BigInt(200000); // 0.2 ADA fallback
    }
  }

  /**
   * Validate transaction outputs (Lace pattern)
   */
  async validateOutputs(_outputs: TransactionOutput[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    minimumCoinQuantities?: any;
  }> {
    if (!this.transactionManager) {
      return {
        isValid: false,
        errors: ['Transaction manager not initialized'],
        warnings: []
      };
    }

    try {
      // TODO: Implement proper validation when CardanoTransactionManager is ready
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message || error}`],
        warnings: []
      };
    }
  }

  /**
   * Get available UTXOs (computed from SDK data)
   */
  @computed
  get availableUtxos(): any[] {
    return this.state.utxos.filter(utxo => utxo.value?.coins > 0n);
  }

  /**
   * Get UTXOs containing specific assets
   */
  getUtxosWithAssets(assetIds: string[]): any[] {
    if (assetIds.length === 0) return [];
    
    return this.state.utxos.filter(utxo => {
      if (!utxo.value?.assets) return false;
      
      return assetIds.some(assetId => utxo.value.assets!.has(assetId));
    });
  }

  /**
   * Add pending transaction
   */
  @action
  private addPendingTransaction(outputs: TransactionOutput[]): string {
    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.state.pendingTransactions.push({
      id,
      outputs,
      status: 'pending',
      timestamp: Date.now()
    });

    return id;
  }

  /**
   * Update pending transaction status
   */
  @action
  private updatePendingTransactionStatus(
    id: string,
    status: 'pending' | 'submitted' | 'confirmed' | 'failed',
    txHash?: string,
    error?: string
  ): void {
    const pendingTx = this.state.pendingTransactions.find(tx => tx.id === id);
    if (pendingTx) {
      pendingTx.status = status;
      if (txHash) pendingTx.txHash = txHash;
      if (error) pendingTx.error = error;

      // Remove from pending if completed
      if (status === 'confirmed' || status === 'failed') {
        this.state.pendingTransactions = this.state.pendingTransactions.filter(tx => tx.id !== id);
      }
    }
  }

  /**
   * Add transaction to history
   */
  @action
  private addToTransactionHistory(
    txHash: string,
    outputs: TransactionOutput[],
    fee: bigint
  ): void {
    this.state.transactionHistory.unshift({
      id: `tx_${txHash}`,
      txHash,
      outputs,
      fee,
      status: 'confirmed',
      timestamp: Date.now()
    });
  }

  /**
   * Get current balance in ADA (computed from SDK data)
   */
  @computed
  get balanceInAda(): number {
    return Number(this.state.balance.coins) / 1_000_000; // Convert from Lovelace to ADA
  }

  /**
   * Get asset balance
   */
  getAssetBalance(assetId: string): bigint {
    return this.state.balance.assets?.get(assetId) || 0n;
  }

  /**
   * Get all asset balances (computed from SDK data)
   */
  @computed
  get allAssetBalances(): Map<string, bigint> {
    return this.state.balance.assets || new Map();
  }

  /**
   * Get spendable balance (all balance is spendable with SDK)
   */
  @computed
  get spendableBalance(): { coins: bigint; assets?: Map<string, bigint> } {
    return this.state.balance;
  }

  /**
   * Clear error
   */
  @action
  clearError(): void {
    this.state.error = undefined;
  }

  /**
   * Clear all data and dispose
   */
  @action
  dispose(): void {
    // Clear subscriptions first
    this.clearSubscriptions();
    
    // Clear state
    this.state = {
      utxos: [],
      balance: { coins: 0n, assets: undefined },
      pendingTransactions: [],
      transactionHistory: [],
      isLoading: false,
      error: undefined,
      lastUpdated: Date.now()
    };
    
    this.transactionManager = undefined;
    this.wallet = undefined;
  }

  /**
   * Legacy method for compatibility
   */
  clear(): void {
    this.dispose();
  }
}
