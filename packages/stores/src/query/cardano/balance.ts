import { ObservableChainQuery } from "../chain-query";
import { KVStore, DenomHelper } from "@keplr-wallet/common";
import { ChainGetter } from "../../common";
import axios, { AxiosInstance } from "axios";
import { makeObservable, computed, override } from "mobx";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import { BalanceRegistry, ObservableQueryBalanceInner } from "../balances";

interface CardanoAddressResponse {
  address: string;
  amount: { unit: string; quantity: string }[];
  stake_address?: string;
}

export class ObservableCardanoQuery<T> extends ObservableChainQuery<T> {
  protected readonly projectId: string;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    url: string,
    protected readonly blockfrostProjectId: string
  ) {
    super(kvStore, chainId, chainGetter, url);
    this.projectId = blockfrostProjectId;
  }

  protected override get instance(): AxiosInstance {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    return axios.create({
      baseURL: chainInfo.rest,
      headers: {
        project_id: this.projectId,
        ...(chainInfo.restConfig?.headers ?? {}),
      },
    });
  }
}

export class ObservableCardanoBalance extends ObservableCardanoQuery<CardanoAddressResponse> {
  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    protected bech32Address: string,
    projectId: string
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      `/addresses/${bech32Address}`,
      projectId
    );

    this.bech32Address = bech32Address;
    makeObservable(this);
  }

  protected override canFetch(): boolean {
    /* If bech32 address is empty, it will always fail, so don't need to fetch it.
    also avoid fetching the endpoint for evm or cosmos networks*/
    const chainInfo = this.chainGetter.getChain(this.chainId);
    return Boolean(
      this.bech32Address.length > 0 && chainInfo?.features?.includes("cardano")
    );
  }

  get balance(): string {
    if (!this.response) return "0";
    const lovelaceObj = this.response.data.amount.find(
      (a) => a.unit === "lovelace"
    );
    return lovelaceObj ? lovelaceObj.quantity : "0";
  }

  get balanceInAda(): number {
    return Number(this.balance) / 1_000_000;
  }

  get stakeAddress(): string | undefined {
    return this.response?.data.stake_address;
  }
}

export class ObservableQueryCardanoBalanceInner extends ObservableQueryBalanceInner {
  protected readonly queryBalance: ObservableCardanoBalance;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    denomHelper: DenomHelper,
    protected readonly address: string,
    protected readonly projectId: string
  ) {
    super(kvStore, chainId, chainGetter, "", denomHelper);

    makeObservable(this);

    this.queryBalance = new ObservableCardanoBalance(
      kvStore,
      chainId,
      chainGetter,
      address,
      projectId
    );
  }

  protected override canFetch(): boolean {
    return false; // fetching is delegated
  }

  override get isFetching(): boolean {
    return this.queryBalance.isFetching;
  }

  override get error() {
    return this.queryBalance.error;
  }

  override get response() {
    return this.queryBalance.response;
  }

  @override
  override *fetch() {
    yield this.queryBalance.fetch();
  }

  @computed
  get balance(): CoinPretty {
    const denom = this.denomHelper.denom;

    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      (cur) => cur.coinMinimalDenom === denom
    );

    if (!currency) {
      throw new Error(`Unknown currency: ${denom}`);
    }

    if (!this.queryBalance.response?.data) {
      return new CoinPretty(currency, new Int(0)).ready(false);
    }

    return new CoinPretty(currency, this.queryBalance.balance);
  }
}

export class ObservableQueryCardanoBalanceRegistry implements BalanceRegistry {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly projectId: string
  ) {}

  getBalanceInner(
    chainId: string,
    chainGetter: ChainGetter,
    address: string,
    minimalDenom: string
  ): ObservableQueryBalanceInner | undefined {
    const denomHelper = new DenomHelper(minimalDenom);
    const isCardano =
      chainGetter.getChain(chainId).features?.includes("cardano") ?? false;
    const isEvm =
      chainGetter.getChain(chainId).features?.includes("evm") ?? false;

    if (!(isCardano && denomHelper.type === "native") || isEvm) {
      return;
    }

    return new ObservableQueryCardanoBalanceInner(
      this.kvStore,
      chainId,
      chainGetter,
      denomHelper,
      address,
      this.projectId
    );
  }
}
