import { KeyStore, BIP44HDPath, Key } from "@keplr-wallet/background/src/keyring/types";
import * as KeyManagement from '@cardano-sdk/key-management';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { Cardano } from '@cardano-sdk/core';
import { CardanoWalletManager } from './wallet-manager';

// Определения констант и интерфейсов, специфичных для Cardano
export const CARDANO_PURPOSE = 1852;
export const CARDANO_COIN_TYPE = 1815;

export class CardanoKeyRing {
  private keyAgent: KeyManagement.InMemoryKeyAgent | undefined;
  private walletManager: CardanoWalletManager | undefined;

  constructor() {
    this.keyAgent = undefined;
    this.walletManager = undefined;
  }

  public async getMetaFromMnemonic(
    mnemonic: string,
    password: string
  ): Promise<Record<string, string>> {
    const mnemonicWords = mnemonic.trim().split(/\s+/);
    if (mnemonicWords.length !== 24) {
      // Lace/Cardano SDK работает только с 24 словами
      return {};
    }
    const bip32Ed25519 = await SodiumBip32Ed25519.create();

    const keyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
      {
        mnemonicWords,
        accountIndex: 0,
        purpose: CARDANO_PURPOSE,
        chainId: Cardano.ChainIds.Mainnet,
        getPassphrase: async () => Buffer.from(password, "utf8"),
      },
      { bip32Ed25519, logger: console }
    );

    const serialized = keyAgent.serializableData;

    return {
      cardano: "true",
      cardanoSerializedAgent: JSON.stringify(serialized),
      coinType: CARDANO_COIN_TYPE.toString(),
    };
  }

  public async restore(keyStore: KeyStore, password: string): Promise<void> {
    const serialized = keyStore.meta["cardanoSerializedAgent"];
    if (!serialized) {
      throw new Error("Cardano agent not found in keyStore meta");
    }
    const bip32Ed25519 = await SodiumBip32Ed25519.create();
    this.keyAgent = new KeyManagement.InMemoryKeyAgent(
      {
        ...JSON.parse(serialized),
        getPassphrase: async () => Buffer.from(password, 'utf8'),
      },
      { bip32Ed25519, logger: console }
    );
    this.walletManager = await CardanoWalletManager.create({
      mnemonicWords: keyStore.key.split(" "),
      network: 'mainnet',
      blockfrostApiKey: process.env['BLOCKFROST_API_KEY'] || "<API_KEY>"
    });
  }

  public async getKey(chainId: string): Promise<Key> {
    if (!this.keyAgent) {
      throw new Error("Cardano key agent not initialized");
    }
    const addrObj = await this.keyAgent.deriveAddress({ index: 0, type: 0 }, 0);
    return {
      algo: "ed25519",
      pubKey: Buffer.from(addrObj.rewardAccount, "utf8"),
      address: Buffer.from(addrObj.address, "utf8"),
      isNanoLedger: false,
      isKeystone: false,
    };
  }

  public async getBalance(): Promise<string> {
    if (!this.walletManager) {
      throw new Error("Cardano wallet manager not initialized");
    }
    const balance = await this.walletManager.getBalance();
    return balance?.coins?.toString() || '0';
  }

  public async getAddresses(): Promise<string[]> {
    if (!this.walletManager) {
      throw new Error("Cardano wallet manager not initialized");
    }
    const addresses = await this.walletManager.getAddresses();
    return addresses.map(a => a.address);
  }
} 