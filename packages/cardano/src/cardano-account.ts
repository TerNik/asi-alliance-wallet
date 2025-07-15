import * as KeyManagement from '@cardano-sdk/key-management';
import { Cardano } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';

export type CardanoAccountOptions = {
  mnemonicWords: string[];
  accountIndex?: number;
  chainId?: Cardano.ChainId;
};

export class CardanoAccount {
  private keyAgent: KeyManagement.InMemoryKeyAgent;

  private constructor(keyAgent: KeyManagement.InMemoryKeyAgent) {
    this.keyAgent = keyAgent;
  }

  static async create({ mnemonicWords, accountIndex = 0, chainId = Cardano.ChainIds.Mainnet }: CardanoAccountOptions): Promise<CardanoAccount> {
    const bip32Ed25519 = await SodiumBip32Ed25519.create();
    const keyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords({
      mnemonicWords,
      accountIndex,
      purpose: 1852,
      chainId,
      getPassphrase: async () => Buffer.from('')
    }, { bip32Ed25519, logger: console });
    return new CardanoAccount(keyAgent);
  }

  async getAddress(index = 0, type: 0 | 1 = 0): Promise<string> {
    const addrObj = await this.keyAgent.deriveAddress({ index, type }, 0);
    return addrObj.address;
  }

  getKeyAgent(): KeyManagement.InMemoryKeyAgent {
    return this.keyAgent;
  }
} 