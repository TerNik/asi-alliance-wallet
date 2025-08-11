import { Cardano } from '@cardano-sdk/core';

export interface CardanoUtxo {
  txHash: string;
  outputIndex: number;
  address: string;
  value: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}

export interface TransactionInput {
  txHash: string;
  outputIndex: number;
  address: string;
  value: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}

export interface TransactionOutput {
  address: string;
  value: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}

export interface TransactionProps {
  outputs: TransactionOutput[];
  metadata?: string;
  changeAddress?: string;
}

export interface BuildTransactionResult {
  transaction: any; // UnwitnessedTx from SDK
  fee: bigint;
  minimumCoinQuantities: {
    coinMissing: bigint;
    minimumCoin: bigint;
  };
}

export interface SignTransactionResult {
  signedTransaction: Cardano.Tx;
  witnessSet: Cardano.WitnessSet;
}

export interface SubmitTransactionResult {
  txHash: string;
  success: boolean;
  error?: string;
}

// These types are now handled by the Cardano SDK internally
// Keeping minimal types for compatibility

export interface DelegationProps {
  stakePoolId: string;
  amount: bigint;
  stakeAddress: string;
}

export interface StakeRegistrationProps {
  stakeAddress: string;
}

export interface WithdrawalProps {
  stakeAddress: string;
  amount: bigint;
}

export interface DelegationTransactionResult {
  transaction: any; // WitnessedTx from SDK
  fee: bigint;
  stakePoolId: string;
}

export interface StakeRegistrationTransactionResult {
  transaction: any; // WitnessedTx from SDK
  fee: bigint;
  stakeAddress: string;
}

export interface WithdrawalTransactionResult {
  transaction: any; // WitnessedTx from SDK
  fee: bigint;
  amount: bigint;
}

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Balance and stake info are now provided by ObservableWallet
// through reactive streams (balance$, rewards$, etc.)
export interface BalanceInfo {
  total: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
  spendable: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}

export interface StakeInfo {
  registered: boolean;
  delegatedTo?: string;
  rewards: bigint;
  stakeAmount: bigint;
}
