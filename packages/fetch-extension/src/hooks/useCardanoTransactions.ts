import { useCallback, useMemo } from 'react';
import { CardanoTransactionStore } from '@keplr-wallet/stores';

// Temporary types until proper Cardano integration
interface TransactionOutput {
  address: string;
  value: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}

export interface UseCardanoTransactionsReturn {
  transactionStore: CardanoTransactionStore;
  sendTransaction: (outputs: TransactionOutput[], metadata?: string) => Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
  estimateFee: (outputs: TransactionOutput[], metadata?: string) => Promise<bigint>;
  validateOutputs: (outputs: TransactionOutput[]) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    minimumCoinQuantities?: any;
  }>;
  balance: {
    ada: number;
    assets: Map<string, bigint>;
  };
  isLoading: boolean;
  error?: string;
  utxos: any[];
  pendingTransactions: any[];
  transactionHistory: any[];
}

/**
 * Hook for Cardano transactions following Lace patterns
 * Provides reactive access to transaction functionality
 */
export const useCardanoTransactions = (
  transactionStore: CardanoTransactionStore
): UseCardanoTransactionsReturn => {
  
  // Reactive send transaction function
  const sendTransaction = useCallback(async (
    outputs: TransactionOutput[], 
    metadata?: string
  ) => {
    return await transactionStore.sendTransaction(outputs, metadata);
  }, [transactionStore]);

  // Reactive fee estimation
  const estimateFee = useCallback(async (
    outputs: TransactionOutput[], 
    metadata?: string
  ) => {
    return await transactionStore.estimateFee(outputs, metadata);
  }, [transactionStore]);

  // Reactive validation
  const validateOutputs = useCallback(async (
    outputs: TransactionOutput[]
  ) => {
    return await transactionStore.validateOutputs(outputs);
  }, [transactionStore]);

  // Computed balance following Lace pattern
  const balance = useMemo(() => ({
    ada: transactionStore.balanceInAda,
    assets: transactionStore.allAssetBalances
  }), [transactionStore.balanceInAda, transactionStore.allAssetBalances]);

  // Direct store access for reactive UI updates
  const isLoading = transactionStore.state.isLoading;
  const error = transactionStore.state.error;
  const utxos = transactionStore.state.utxos;
  const pendingTransactions = transactionStore.state.pendingTransactions;
  const transactionHistory = transactionStore.state.transactionHistory;

  return {
    transactionStore,
    sendTransaction,
    estimateFee,
    validateOutputs,
    balance,
    isLoading,
    error,
    utxos,
    pendingTransactions,
    transactionHistory
  };
};

export default useCardanoTransactions;
