import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkConfig } from '../providers/cardano-providers';

export interface CardanoConfig {
  networks: {
    mainnet: CardanoNetworkConfig;
    testnet: CardanoNetworkConfig;
    preview: CardanoNetworkConfig;
    preprod: CardanoNetworkConfig;
  };
  defaultNetwork: 'mainnet' | 'testnet' | 'preview' | 'preprod';
  transaction: {
    invalidHereafter: number; // Slots
    ttl: number; // Transaction time to live in slots
  };
  development: {
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Get Cardano configuration by environment (following Lace pattern)
 */
export function getCardanoConfig(environment: 'development' | 'staging' | 'production' = 'development'): CardanoConfig {
  const baseConfig: CardanoConfig = {
    networks: {
      mainnet: {
        network: 'mainnet',
        blockfrostApiKey: process.env.BLOCKFROST_MAINNET_API_KEY || '',
        blockfrostUrl: 'https://cardano-mainnet.blockfrost.io/api/v0'
      },
      testnet: {
        network: 'testnet',
        blockfrostApiKey: process.env.BLOCKFROST_TESTNET_API_KEY || '',
        blockfrostUrl: 'https://cardano-testnet.blockfrost.io/api/v0'
      },
      preview: {
        network: 'preview',
        blockfrostApiKey: process.env.BLOCKFROST_PREVIEW_API_KEY || 'preview_test_key',
        blockfrostUrl: 'https://cardano-preview.blockfrost.io/api/v0'
      },
      preprod: {
        network: 'preprod',
        blockfrostApiKey: process.env.BLOCKFROST_PREPROD_API_KEY || 'preprod_test_key',
        blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0'
      }
    },
    defaultNetwork: 'preview', // Default to preview for development
    transaction: {
      invalidHereafter: 3600, // 1 hour in slots (following Lace)
      ttl: 7200 // 2 hours TTL
    },
    development: {
      enableLogging: true,
      logLevel: 'debug'
    }
  };

  // Environment-specific overrides
  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        defaultNetwork: 'preview',
        development: {
          enableLogging: true,
          logLevel: 'debug'
        }
      };
    
    case 'staging':
      return {
        ...baseConfig,
        defaultNetwork: 'preprod',
        development: {
          enableLogging: true,
          logLevel: 'info'
        }
      };
    
    case 'production':
      return {
        ...baseConfig,
        defaultNetwork: 'mainnet',
        development: {
          enableLogging: false,
          logLevel: 'error'
        }
      };
    
    default:
      return baseConfig;
  }
}

/**
 * Get network configuration by name
 */
export function getNetworkConfig(
  network: 'mainnet' | 'testnet' | 'preview' | 'preprod',
  environment: 'development' | 'staging' | 'production' = 'development'
): CardanoNetworkConfig {
  const config = getCardanoConfig(environment);
  return config.networks[network];
}

/**
 * Get transaction configuration
 */
export function getTransactionConfig(environment: 'development' | 'staging' | 'production' = 'development') {
  const config = getCardanoConfig(environment);
  return config.transaction;
}

/**
 * Validate configuration completeness
 */
export function validateCardanoConfig(config: CardanoConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check networks
  for (const [networkName, networkConfig] of Object.entries(config.networks)) {
    if (!networkConfig.blockfrostApiKey) {
      errors.push(`Missing Blockfrost API key for ${networkName}`);
    }
    if (!networkConfig.blockfrostUrl) {
      errors.push(`Missing Blockfrost URL for ${networkName}`);
    }
  }
  
  // Check transaction config
  if (!config.transaction.invalidHereafter || config.transaction.invalidHereafter <= 0) {
    errors.push('Invalid transaction invalidHereafter value');
  }
  
  if (!config.transaction.ttl || config.transaction.ttl <= 0) {
    errors.push('Invalid transaction TTL value');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Constants following Lace patterns
 */
export const CARDANO_CONSTANTS = {
  // Protocol parameters (will be fetched from network)
  MIN_UTXO_VALUE: 1_000_000n, // 1 ADA in lovelace
  MIN_FEE_COEFFICIENT: 44n,
  MIN_FEE_CONSTANT: 155_381n,
  
  // Transaction limits
  MAX_TRANSACTION_SIZE: 16384, // 16KB
  MAX_VALUE_SIZE: 5000,
  
  // Address formats
  ADDRESS_TYPES: {
    BASE: 0,
    POINTER: 4,
    ENTERPRISE: 6,
    REWARD: 14
  },
  
  // Derivation paths (CIP-1852)
  DERIVATION_PATHS: {
    PURPOSE: 1852,
    COIN_TYPE: 1815,
    ACCOUNT: 0,
    EXTERNAL_CHAIN: 0,
    INTERNAL_CHAIN: 1,
    STAKE_CHAIN: 2
  },
  
  // Network magic numbers
  NETWORK_MAGIC: {
    MAINNET: 764824073,
    TESTNET: 1097911063,
    PREVIEW: 2,
    PREPROD: 1
  },
  
  // Asset handling
  POLICY_ID_LENGTH: 56, // 28 bytes in hex
  ASSET_NAME_MAX_LENGTH: 64, // 32 bytes in hex
  
  // Metadata labels (CIP-20, CIP-25, etc.)
  METADATA_LABELS: {
    MESSAGE: 674n,
    NFT: 721n,
    ROYALTY: 777n
  }
} as const;

/**
 * Helper to check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
}

/**
 * Helper to get current environment
 */
export function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}
