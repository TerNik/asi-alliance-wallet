import { Cardano } from '@cardano-sdk/core';
import { 
  ObservableWallet, 
  createPersonalWallet,
  createInMemoryWallet,
  KeyAgent
} from '@cardano-sdk/wallet';
import { createBlockfrostChainHistoryProvider } from '@cardano-sdk/blockfrost';
import { createBlockfrostNetworkInfoProvider } from '@cardano-sdk/blockfrost';
import { createBlockfrostAssetProvider } from '@cardano-sdk/blockfrost';
import { createBlockfrostUtxoProvider } from '@cardano-sdk/blockfrost';
import { createBlockfrostTxSubmitProvider } from '@cardano-sdk/blockfrost';
import { createBlockfrostRewardsProvider } from '@cardano-sdk/blockfrost';
import { createBlockfrostStakePoolProvider } from '@cardano-sdk/blockfrost';
import { InMemoryKeyAgent, util } from '@cardano-sdk/key-management';
import { createWalletStores } from '@cardano-sdk/wallet';
import { logger } from '@cardano-sdk/util-dev';

export interface CardanoNetworkConfig {
  network: 'mainnet' | 'testnet' | 'preview' | 'preprod';
  blockfrostApiKey: string;
  blockfrostUrl?: string;
}

export interface CardanoProviders {
  chainHistoryProvider: any;
  networkInfoProvider: any;
  assetProvider: any;
  utxoProvider: any;
  txSubmitProvider: any;
  rewardsProvider: any;
  stakePoolProvider: any;
}

/**
 * Validate network configuration
 */
export function validateNetworkConfig(config: CardanoNetworkConfig): void {
  if (!config.network) {
    throw new Error('Network is required');
  }
  
  if (!config.blockfrostApiKey) {
    throw new Error('Blockfrost API key is required');
  }
  
  const validNetworks = ['mainnet', 'testnet', 'preview', 'preprod'];
  if (!validNetworks.includes(config.network)) {
    throw new Error(`Invalid network: ${config.network}. Must be one of: ${validNetworks.join(', ')}`);
  }
}

/**
 * Create Cardano providers following Lace pattern
 */
export function createCardanoProviders(config: CardanoNetworkConfig): CardanoProviders {
  validateNetworkConfig(config);
  
  const blockfrostUrl = config.blockfrostUrl || getDefaultBlockfrostUrl(config.network);
  
  const commonOptions = {
    baseUrl: blockfrostUrl,
    projectId: config.blockfrostApiKey
  };
  
  return {
    chainHistoryProvider: createBlockfrostChainHistoryProvider(commonOptions),
    networkInfoProvider: createBlockfrostNetworkInfoProvider(commonOptions),
    assetProvider: createBlockfrostAssetProvider(commonOptions),
    utxoProvider: createBlockfrostUtxoProvider(commonOptions),
    txSubmitProvider: createBlockfrostTxSubmitProvider(commonOptions),
    rewardsProvider: createBlockfrostRewardsProvider(commonOptions),
    stakePoolProvider: createBlockfrostStakePoolProvider(commonOptions)
  };
}

/**
 * Create Cardano wallet following Lace pattern
 */
export async function createCardanoWallet(
  config: CardanoNetworkConfig,
  keyAgent: KeyAgent,
  name: string = 'cardano-wallet'
): Promise<ObservableWallet> {
  const providers = createCardanoProviders(config);
  
  // Create stores for wallet data persistence (following Lace pattern)
  const stores = createWalletStores({
    name,
    logger
  });
  
  // Create wallet with providers (Lace pattern)
  const wallet = createPersonalWallet(
    { name },
    {
      keyAgent,
      logger,
      stores: stores.create(name),
      ...providers
    }
  );
  
  return wallet;
}

/**
 * Create in-memory wallet for testing/development (Lace pattern)
 */
export async function createInMemoryCardanoWallet(
  config: CardanoNetworkConfig,
  keyAgent: KeyAgent,
  name: string = 'cardano-wallet-memory'
): Promise<ObservableWallet> {
  const providers = createCardanoProviders(config);
  
  // Create in-memory wallet (similar to Lace testing)
  const wallet = createInMemoryWallet(
    { name },
    {
      keyAgent,
      logger,
      ...providers
    }
  );
  
  return wallet;
}

/**
 * Create key agent from mnemonic (following Lace key management)
 */
export async function createKeyAgentFromMnemonic(
  mnemonic: string,
  passphrase: string = '',
  accountIndex: number = 0
): Promise<KeyAgent> {
  // Convert mnemonic to entropy
  const entropy = util.mnemonicToEntropy(mnemonic);
  
  // Create root key from entropy
  const rootKey = await util.Bip32PrivateKey.fromBip39Entropy(Buffer.from(entropy, 'hex'), passphrase);
  
  // Create key agent (Lace pattern)
  const keyAgent = new InMemoryKeyAgent({
    accountIndex,
    chainId: Cardano.ChainIds.Preview, // Will be overridden by network config
    rootPrivateKeyBytes: rootKey.bytes,
    password: Buffer.from(passphrase, 'utf8')
  });
  
  return keyAgent;
}

/**
 * Get default Blockfrost URL for network
 */
function getDefaultBlockfrostUrl(network: string): string {
  switch (network) {
    case 'mainnet':
      return 'https://cardano-mainnet.blockfrost.io/api/v0';
    case 'testnet':
      return 'https://cardano-testnet.blockfrost.io/api/v0';
    case 'preview':
      return 'https://cardano-preview.blockfrost.io/api/v0';
    case 'preprod':
      return 'https://cardano-preprod.blockfrost.io/api/v0';
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Get network ID from network name
 */
export function getNetworkId(network: string): Cardano.NetworkId {
  switch (network) {
    case 'mainnet':
      return Cardano.NetworkId.Mainnet;
    case 'testnet':
    case 'preview':
    case 'preprod':
      return Cardano.NetworkId.Testnet;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Get chain ID from network name (following Lace pattern)
 */
export function getChainId(network: string): Cardano.ChainId {
  switch (network) {
    case 'mainnet':
      return Cardano.ChainIds.Mainnet;
    case 'testnet':
      return Cardano.ChainIds.Testnet;
    case 'preview':
      return Cardano.ChainIds.Preview;
    case 'preprod':
      return Cardano.ChainIds.Preprod;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}
