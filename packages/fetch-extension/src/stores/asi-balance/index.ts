import { ChainInfo } from "@keplr-wallet/types";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import { action, makeObservable, observable, runInAction } from "mobx";
import {
  ASIBalanceService,
  ASIChainInfo,
  isASIChain,
} from "@keplr-wallet/asi-chain";

const DEFAULT_POLL_INTERVAL_MS = 15_000;

export interface ASIBalanceEntry {
  balance: CoinPretty;
  isFetching: boolean;
  error?: string;
  lastFetchedAt?: number;
}

export class ASIBalanceStore {
  @observable.shallow
  protected readonly balances: Map<string, ASIBalanceEntry> = new Map();

  protected readonly balanceService = new ASIBalanceService();

  protected activeKey: string | null = null;
  protected activeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    protected readonly pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  ) {
    makeObservable(this);
  }

  protected static buildKey(chainId: string, address: string): string {
    return `${chainId}|${address}`;
  }

  getBalance(chainInfo: ChainInfo, address: string): ASIBalanceEntry {
    const key = ASIBalanceStore.buildKey(chainInfo.chainId, address);
    const existing = this.balances.get(key);
    if (existing) return existing;

    const initial: ASIBalanceEntry = {
      balance: new CoinPretty(chainInfo.stakeCurrency, new Int(0)).ready(false),
      isFetching: false,
    };
    runInAction(() => {
      this.balances.set(key, initial);
    });
    return initial;
  }

  @action
  setActive(chainInfo: ChainInfo | null, address: string | null): void {
    const shouldPoll = !!chainInfo && !!address && isASIChain(chainInfo);

    const nextKey =
      shouldPoll && chainInfo && address
        ? ASIBalanceStore.buildKey(chainInfo.chainId, address)
        : null;

    if (nextKey === this.activeKey) {
      return;
    }

    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    this.activeKey = nextKey;

    if (!shouldPoll || !chainInfo || !address || !nextKey) {
      return;
    }

    if (!this.balances.has(nextKey)) {
      this.balances.set(nextKey, {
        balance: new CoinPretty(chainInfo.stakeCurrency, new Int(0)).ready(
          false
        ),
        isFetching: false,
      });
    }

    void this.fetchBalance(chainInfo, address);

    this.activeTimer = setInterval(() => {
      void this.fetchBalance(chainInfo, address);
    }, this.pollIntervalMs);
  }

  @action
  stop(): void {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    this.activeKey = null;
  }

  async refresh(chainInfo: ChainInfo, address: string): Promise<void> {
    await this.fetchBalance(chainInfo, address);
  }

  @action
  protected patchEntry(key: string, patch: Partial<ASIBalanceEntry>): void {
    const prev = this.balances.get(key);
    if (!prev) return;
    this.balances.set(key, { ...prev, ...patch });
  }

  protected async fetchBalance(
    chainInfo: ChainInfo,
    address: string
  ): Promise<void> {
    if (!isASIChain(chainInfo)) return;

    const asiChainInfo: ASIChainInfo = chainInfo;
    const key = ASIBalanceStore.buildKey(chainInfo.chainId, address);
    if (!this.balances.has(key)) {
      runInAction(() => {
        this.balances.set(key, {
          balance: new CoinPretty(chainInfo.stakeCurrency, new Int(0)).ready(
            false
          ),
          isFetching: false,
        });
      });
    }

    this.patchEntry(key, { isFetching: true, error: undefined });

    try {
      const atomic = await this.balanceService.fetchBalance(
        asiChainInfo,
        address
      );
      if (atomic === null) {
        this.patchEntry(key, { isFetching: false });
        return;
      }
      const balance = new CoinPretty(
        chainInfo.stakeCurrency,
        new Int(atomic.toString())
      );
      this.patchEntry(key, {
        balance,
        isFetching: false,
        error: undefined,
        lastFetchedAt: Date.now(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[ASIBalanceStore] Failed to fetch ASI balance:", e);
      this.patchEntry(key, {
        isFetching: false,
        error: message,
      });
    }
  }
}
