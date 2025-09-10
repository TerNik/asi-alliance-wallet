import { KVStore } from "@keplr-wallet/common";
import { ChainGetter } from "../../common";
import { QueriesSetBase } from "../queries";

import { ObservableQueryCardanoBalanceRegistry } from "./balance";

export interface CardanoQueries {
  cardano: CardanoQueriesImpl;
}

export const CardanoQueries = {
  use(options: {
    projectId: (chainId: string) => string;
  }): (
    queriesSetBase: QueriesSetBase,
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter
  ) => CardanoQueries {
    return (
      queriesSetBase: QueriesSetBase,
      kvStore: KVStore,
      chainId: string,
      chainGetter: ChainGetter
    ) => {
      return {
        cardano: new CardanoQueriesImpl(
          queriesSetBase,
          kvStore,
          chainId,
          chainGetter,
          options.projectId
        ),
      };
    };
  },
};

export class CardanoQueriesImpl {
  constructor(
    base: QueriesSetBase,
    kvStore: KVStore,
    chainId: string,
    _: ChainGetter,
    projectId: (chainId: string) => string
  ) {
    const chainProjectId = projectId(chainId);
    base.queryBalances.addBalanceRegistry(
      new ObservableQueryCardanoBalanceRegistry(kvStore, chainProjectId)
    );
  }
}
