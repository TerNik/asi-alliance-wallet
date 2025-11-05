/**
 * Blockfrost providers creation
 * Adapted from lace/packages/cardano/src/wallet/lib/providers.ts
 * Minimal implementation for transaction features
 */

import { Logger } from 'ts-log';
import {
  AssetProvider,
  ChainHistoryProvider,
  NetworkInfoProvider,
  Provider,
  RewardAccountInfoProvider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';

import {
  BlockfrostClient,
  BlockfrostClientConfig,
  BlockfrostAssetProvider,
  BlockfrostChainHistoryProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostRewardAccountInfoProvider,
  BlockfrostRewardsProvider,
  BlockfrostTxSubmitProvider,
  BlockfrostUtxoProvider,
  CreateHttpProviderConfig,
  RateLimiter
} from '@cardano-sdk/cardano-services-client';
import Bottleneck from 'bottleneck';
import { BlockfrostAddressDiscovery } from '../../adapters/blockfrost-address-discovery';
import { BlockfrostInputResolver } from '../../adapters/blockfrost-input-resolver';
import type { BlockfrostConfig } from '../../adapters/env-adapter';

export interface WalletProvidersDependencies {
  assetProvider: AssetProvider;
  networkInfoProvider: NetworkInfoProvider;
  txSubmitProvider: TxSubmitProvider;
  stakePoolProvider: StakePoolProvider;
  utxoProvider: UtxoProvider;
  chainHistoryProvider: ChainHistoryProvider;
  rewardAccountInfoProvider: RewardAccountInfoProvider;
  rewardsProvider: RewardsProvider;
  handleProvider?: any; // Optional for now
  addressDiscovery: any; // BlockfrostAddressDiscovery
  inputResolver?: any; // BlockfrostInputResolver
  drepProvider?: any; // Optional for now
}

interface ProvidersConfig {
  blockfrostConfig: BlockfrostConfig;
  logger: Logger;
}

const createTxSubmitProvider = (
  blockfrostClient: BlockfrostClient,
  httpProviderConfig: CreateHttpProviderConfig<Provider>,
  customSubmitTxUrl?: string
): TxSubmitProvider => {
  if (customSubmitTxUrl) {
    httpProviderConfig.logger.debug(`Using custom TxSubmit api URL ${customSubmitTxUrl}`);
    const { TxSubmitApiProvider } = require('@cardano-sdk/cardano-services-client');
    const url = new URL(customSubmitTxUrl);
    return new TxSubmitApiProvider(
      { baseUrl: url, path: url.pathname },
      { logger: httpProviderConfig.logger, adapter: httpProviderConfig.adapter }
    );
  }

  return new BlockfrostTxSubmitProvider(blockfrostClient, httpProviderConfig.logger);
};

/**
 * Creates Blockfrost providers for wallet operations
 * Minimal implementation - only essential providers for transactions
 */
export const createBlockfrostProviders = ({
  blockfrostConfig,
  logger
}: ProvidersConfig): WalletProvidersDependencies => {
  // Create Blockfrost client with rate limiter
  // RateLimiter uses Bottleneck under the hood (like in lace)
  const rateLimiter: RateLimiter = new Bottleneck({
    reservoir: 500, // Initial capacity
    reservoirIncreaseAmount: 100,
    reservoirIncreaseInterval: 1000, // 1 second
    reservoirIncreaseMaximum: 500
  });

  const blockfrostClientConfig: BlockfrostClientConfig = {
    projectId: blockfrostConfig.projectId,
    baseUrl: blockfrostConfig.baseUrl
  };

  const blockfrostClient = new BlockfrostClient(blockfrostClientConfig, {
    rateLimiter
  });

  const httpProviderConfig: CreateHttpProviderConfig<Provider> = {
    baseUrl: blockfrostConfig.baseUrl,
    logger,
    adapter: undefined // Will use default fetch adapter
  };

  // Create essential providers
  const assetProvider = new BlockfrostAssetProvider(blockfrostClient, logger);
  const networkInfoProvider = new BlockfrostNetworkInfoProvider(blockfrostClient, logger);
  const rewardsProvider = new BlockfrostRewardsProvider(blockfrostClient, logger);
  
  // Create stake pool provider (minimal implementation)
  // For full implementation, see lace initStakePoolService
  const stakePoolProvider = {
    queryStakePools: async () => {
      throw new Error('Stake pool queries not implemented yet');
    },
    stakePoolStats: async () => {
      throw new Error('Stake pool stats not implemented yet');
    },
    healthCheck: async () => ({ ok: true })
  } as StakePoolProvider;

  const txSubmitProvider = createTxSubmitProvider(blockfrostClient, httpProviderConfig);

  // Create chain history provider (with optional cache)
  const chainHistoryProvider = new BlockfrostChainHistoryProvider({
    client: blockfrostClient,
    cache: undefined as any, // No persistent cache for now - optional parameter
    networkInfoProvider,
    logger
  });

  // Create reward account info provider (dRepProvider is optional)
  const rewardAccountInfoProvider = new BlockfrostRewardAccountInfoProvider({
    client: blockfrostClient,
    dRepProvider: undefined as any, // Optional - not implemented yet
    logger,
    stakePoolProvider
  });

  // Create address discovery
  const addressDiscovery = new BlockfrostAddressDiscovery(blockfrostClient, logger);

  // Create input resolver (with optional cache)
  const inputResolver = new BlockfrostInputResolver({
    cache: undefined as any, // No persistent cache for now - optional parameter
    client: blockfrostClient,
    logger
  });

  // Create UTxO provider (with optional cache)
  const utxoProvider = new BlockfrostUtxoProvider({
    cache: undefined as any, // No persistent cache for now - optional parameter
    client: blockfrostClient,
    logger
  });

  return {
    assetProvider,
    networkInfoProvider,
    txSubmitProvider,
    stakePoolProvider,
    utxoProvider,
    chainHistoryProvider,
    rewardAccountInfoProvider,
    rewardsProvider,
    addressDiscovery,
    inputResolver
  };
};

