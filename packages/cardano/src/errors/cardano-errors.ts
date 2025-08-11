/**
 * Cardano error types
 */
export enum CardanoErrorType {
  INVALID_MNEMONIC = 'INVALID_MNEMONIC',
  INVALID_NETWORK = 'INVALID_NETWORK',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TRANSACTION_BUILD_FAILED = 'TRANSACTION_BUILD_FAILED',
  TRANSACTION_SIGN_FAILED = 'TRANSACTION_SIGN_FAILED',
  TRANSACTION_SUBMIT_FAILED = 'TRANSACTION_SUBMIT_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  WALLET_NOT_INITIALIZED = 'WALLET_NOT_INITIALIZED'
}

/**
 * Cardano specific error class
 */
export class CardanoError extends Error {
  public readonly type: CardanoErrorType;
  public readonly context?: Record<string, any>;

  constructor(options: {
    type: CardanoErrorType;
    message: string;
    context?: Record<string, any>;
  }) {
    super(options.message);
    this.name = 'CardanoError';
    this.type = options.type;
    this.context = options.context;
  }
}

/**
 * Error handler for Cardano operations
 */
export class CardanoErrorHandler {
  /**
   * Handle and transform errors
   */
  static handleError(error: any, context?: Record<string, any>): CardanoError {
    if (error instanceof CardanoError) {
      return error;
    }

    // Determine error type based on error message/type
    let errorType: CardanoErrorType = CardanoErrorType.NETWORK_ERROR;
    let message = error.message || 'Unknown Cardano error';

    if (message.includes('mnemonic')) {
      errorType = CardanoErrorType.INVALID_MNEMONIC;
    } else if (message.includes('network')) {
      errorType = CardanoErrorType.INVALID_NETWORK;
    } else if (message.includes('address')) {
      errorType = CardanoErrorType.INVALID_ADDRESS;
    } else if (message.includes('insufficient') || message.includes('balance')) {
      errorType = CardanoErrorType.INSUFFICIENT_FUNDS;
    } else if (message.includes('build')) {
      errorType = CardanoErrorType.TRANSACTION_BUILD_FAILED;
    } else if (message.includes('sign')) {
      errorType = CardanoErrorType.TRANSACTION_SIGN_FAILED;
    } else if (message.includes('submit')) {
      errorType = CardanoErrorType.TRANSACTION_SUBMIT_FAILED;
    }

    return new CardanoError({
      type: errorType,
      message,
      context
    });
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: CardanoError): boolean {
    const recoverableTypes = [
      CardanoErrorType.NETWORK_ERROR,
      CardanoErrorType.TRANSACTION_SUBMIT_FAILED
    ];
    
    return recoverableTypes.includes(error.type);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: CardanoError): string {
    switch (error.type) {
      case CardanoErrorType.INVALID_MNEMONIC:
        return 'Invalid recovery phrase. Please check your mnemonic words.';
      case CardanoErrorType.INVALID_NETWORK:
        return 'Invalid network configuration. Please check network settings.';
      case CardanoErrorType.INVALID_ADDRESS:
        return 'Invalid Cardano address format.';
      case CardanoErrorType.INSUFFICIENT_FUNDS:
        return 'Insufficient funds for this transaction.';
      case CardanoErrorType.TRANSACTION_BUILD_FAILED:
        return 'Failed to build transaction. Please check your inputs.';
      case CardanoErrorType.TRANSACTION_SIGN_FAILED:
        return 'Failed to sign transaction. Please try again.';
      case CardanoErrorType.TRANSACTION_SUBMIT_FAILED:
        return 'Failed to submit transaction to network. Please try again.';
      case CardanoErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.';
      case CardanoErrorType.UNSUPPORTED_OPERATION:
        return 'This operation is not supported yet.';
      case CardanoErrorType.WALLET_NOT_INITIALIZED:
        return 'Wallet not initialized. Please set up your wallet first.';
      default:
        return error.message || 'An unknown error occurred.';
    }
  }
}

export default CardanoErrorHandler;
