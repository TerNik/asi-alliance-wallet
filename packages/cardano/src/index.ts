// Main exports following Lace pattern
export { CardanoTransactionManager } from './transaction-manager';

// Core components
export * from './cardano-account';
export * from './cardano-keyring';

// Transaction components (simplified)
export * from './transaction/types';
export * from './transaction/transaction-signer';
export * from './transaction/transaction-submitter';

// Network providers (new)
export * from './providers/cardano-providers';

// Configuration (new)
export * from './config/cardano-config';

// Key management and signing
export * from './signing/key-derivation';

// Validation
export * from './validation/transaction-validator';
export * from './utils/address-validator';

// Error handling
export * from './errors/cardano-errors';

// Integration
export * from './integration/wallet-integration';
