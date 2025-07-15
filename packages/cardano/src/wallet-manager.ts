import {
  BlockfrostClient,
  BlockfrostAssetProvider,
  BlockfrostChainHistoryProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostRewardsProvider,
  BlockfrostRewardAccountInfoProvider,
  BlockfrostUtxoProvider,
  BlockfrostTxSubmitProvider
} from '@cardano-sdk/cardano-services-client';
import Bottleneck from 'bottleneck';
import * as KeyManagement from '@cardano-sdk/key-management';
import { Cardano } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { BaseWallet, Bip32PublicCredentialsManager, PublicCredentialsManagerType } from '@cardano-sdk/wallet';
import { firstValueFrom } from 'rxjs';

export class CardanoWalletManager {
  private wallet: BaseWallet;

  private constructor(wallet: BaseWallet) {
    this.wallet = wallet;
  }

  static async create({ mnemonicWords, network, accountIndex = 0, blockfrostApiKey }: {
    mnemonicWords: string[];
    network: 'mainnet' | 'testnet';
    accountIndex?: number;
    blockfrostApiKey: string;
  }): Promise<CardanoWalletManager> {
    const bip32Ed25519 = await SodiumBip32Ed25519.create();
    const keyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords({
      mnemonicWords,
      accountIndex,
      purpose: 1852,
      chainId: network === 'mainnet' ? Cardano.ChainIds.Mainnet : Cardano.ChainIds.Preview,
      getPassphrase: async () => Buffer.from('')
    }, { bip32Ed25519, logger: console });

    // Оборачиваем keyAgent в asyncKeyAgent
    const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
    // Создаём bip32Account для передачи в publicCredentialsManager
    const bip32Account = await KeyManagement.Bip32Account.fromAsyncKeyAgent(asyncKeyAgent);
    // Создаём witnesser
    const witnesser = KeyManagement.util.createBip32Ed25519Witnesser(asyncKeyAgent);

    // Формируем publicCredentialsManager для BaseWallet
    const publicCredentialsManager: Bip32PublicCredentialsManager = {
      __type: PublicCredentialsManagerType.BIP32_CREDENTIALS_MANAGER,
      bip32Account,
      // TODO: Implement discovery via BlockfrostAddressDiscovery when BlockfrostClient is available
      addressDiscovery: undefined as any
    };

    // lace-style: always use two arguments for BlockfrostClient
    const baseUrl = network === 'mainnet'
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : 'https://cardano-preview.blockfrost.io/api/v0';
    // lace-style: use Bottleneck for rateLimiter
    const rateLimiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 334 // ~3 requests per second (Blockfrost free tier)
    });
    const blockfrostConfig = {
      baseUrl,
      projectId: blockfrostApiKey
    };
    const blockfrostClient = new BlockfrostClient(blockfrostConfig, { rateLimiter });
    const assetProvider = new BlockfrostAssetProvider(blockfrostClient, console);
    const networkInfoProvider = new BlockfrostNetworkInfoProvider(blockfrostClient, console);
    const rewardsProvider = new BlockfrostRewardsProvider(blockfrostClient, console);
    const txSubmitProvider = new BlockfrostTxSubmitProvider(blockfrostClient, console);
    const utxoProvider = new BlockfrostUtxoProvider({
      client: blockfrostClient,
      cache: {} as any,
      logger: console
    });
    const chainHistoryProvider = new BlockfrostChainHistoryProvider({
      client: blockfrostClient,
      cache: {} as any,
      networkInfoProvider,
      logger: console
    });
    const rewardAccountInfoProvider = new BlockfrostRewardAccountInfoProvider({
      client: blockfrostClient,
      stakePoolProvider: {} as any,
      dRepProvider: {} as any,
      logger: console
    });

    // Создаём BaseWallet напрямую
    const wallet = new BaseWallet(
      { name: 'Cardano Wallet' },
      {
        witnesser,
        txSubmitProvider,
        assetProvider,
        networkInfoProvider,
        utxoProvider,
        chainHistoryProvider,
        rewardAccountInfoProvider,
        rewardsProvider,
        logger: console,
        publicCredentialsManager
      }
    );
    return new CardanoWalletManager(wallet);
  }

  async getBalance() {
    return await firstValueFrom(this.wallet.balance.utxo.available$);
  }

  async getAddresses() {
    return await firstValueFrom(this.wallet.addresses$);
  }

  async signAndSubmitTx(txProps: any) {
    const txInit = await this.wallet.initializeTx(txProps);
    const finalizedTx = await this.wallet.finalizeTx({ tx: txInit });
    return await this.wallet.submitTx(finalizedTx);
  }
} 