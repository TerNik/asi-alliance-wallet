import { AccountSetBaseSuper } from "./base";
import { ChainGetter } from "../common";
import { ActivityStore } from "../activity";
import { TokenGraphStore } from "../token-graph";
import { CardanoKeyStore } from "../cardano/CardanoKeyStore";
import { CosmosAccount } from "./cosmos";
import { CosmwasmAccount } from "./cosmwasm";
import { SecretAccount } from "./secret";
import { EthereumAccount } from "./ethereum";

export interface CardanoAccount {
  cardano: CardanoAccountImpl;
}

/**
 * CardanoAccount mixin for AccountStore.
 * @param options (optional, for compatibility with other mixins)
 */
export const CardanoAccount = {
  use(
    _options?: {}
  ): (
    base: AccountSetBaseSuper & CosmosAccount & CosmwasmAccount & SecretAccount & EthereumAccount,
    chainGetter: ChainGetter,
    chainId: string,
    _activityStore: ActivityStore,
    _tokenGraphStore: TokenGraphStore
  ) => CardanoAccount {
    return (base, chainGetter, chainId, _activityStore, _tokenGraphStore) => {
      return {
        cardano: new CardanoAccountImpl(base, chainGetter, chainId),
      };
    };
  },
};

export class CardanoAccountImpl {
  private keyStore: CardanoKeyStore;

  constructor(
    protected readonly base: AccountSetBaseSuper,
    protected readonly chainGetter: ChainGetter,
    protected readonly chainId: string
  ) {
    this.keyStore = new CardanoKeyStore();
  }

  /** Generate a new seed phrase and address */
  async createWallet() {
    const mnemonic = this.keyStore.generateMnemonic();
    const address = await this.keyStore.generateAddress();
    return { mnemonic, address };
  }

  /** Restore from seed phrase */
  async restoreWallet(mnemonic: string[]) {
    const address = await this.keyStore.restoreFromMnemonic(mnemonic);
    return { mnemonic, address };
  }

  /** Get seed phrase */
  getMnemonic() {
    return this.keyStore.getMnemonic();
  }

  /** Get address */
  getAddress() {
    return this.keyStore.getAddress();
  }
} 