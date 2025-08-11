import { makeAutoObservable, runInAction, observable, action, computed } from 'mobx';
import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

export interface CardanoWalletState {
  addresses: string[];
  changeAddress: string;
  utxos: any[]; // Cardano SDK UTXO types
  balance: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
  protocolParameters?: Cardano.ProtocolParameters;
  networkInfo: {
    network: 'mainnet' | 'testnet';
    url: string;
    blockHeight?: number;
    lastBlockTime?: number;
  };
  isInitialized: boolean;
  lastUpdated: number;
}

/**
 * Cardano Wallet Store following Lace architecture patterns
 * This store is independent from the main account system and manages
 * Cardano-specific wallet state using ObservableWallet
 */
export class CardanoWalletStore {
  @observable state: CardanoWalletState = {
    addresses: [],
    changeAddress: '',
    utxos: [],
    balance: { coins: BigInt(0), assets: undefined },
    protocolParameters: undefined,
    networkInfo: {
      network: 'mainnet',
      url: '',
      blockHeight: undefined,
      lastBlockTime: undefined
    },
    isInitialized: false,
    lastUpdated: Date.now()
  };

  private wallet?: ObservableWallet;
  private subscriptions: Subscription[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * Initialize Cardano wallet store with ObservableWallet (Lace pattern)
   */
  @action
  async initialize(
    wallet: ObservableWallet,
    changeAddress: string,
    networkInfo: {
      network: 'mainnet' | 'testnet';
      url: string;
    }
  ): Promise<void> {
    try {
      // Store wallet reference
      this.wallet = wallet;

      runInAction(() => {
        this.state.changeAddress = changeAddress;
        this.state.networkInfo = {
          ...networkInfo,
          blockHeight: undefined,
          lastBlockTime: undefined
        };
        this.state.isInitialized = true;
        this.state.lastUpdated = Date.now();
      });

      // Setup wallet subscriptions for reactive updates
      this.setupWalletSubscriptions(wallet);
    } catch (error) {
      console.error('Failed to initialize Cardano wallet store:', error);
      throw error;
    }
  }

  /**
   * Setup reactive subscriptions following Lace pattern
   */
  private setupWalletSubscriptions(wallet: ObservableWallet): void {
    // Clear existing subscriptions
    this.clearSubscriptions();

    // Subscribe to addresses changes (Lace pattern)
    const addressesSubscription = wallet.addresses$.subscribe({
      next: (addresses) => {
        runInAction(() => {
          this.state.addresses = addresses.map(addr => addr.address);
          this.state.lastUpdated = Date.now();
        });
      },
      error: (error) => console.error('Addresses subscription error:', error)
    });

    // Subscribe to balance changes (Lace pattern)
    const balanceSubscription = wallet.balance.utxo.total$.subscribe({
      next: (balance) => {
        runInAction(() => {
          this.state.balance = {
            coins: balance.coins,
            assets: balance.assets
          };
          this.state.lastUpdated = Date.now();
        });
      },
      error: (error) => console.error('Balance subscription error:', error)
    });

    // Subscribe to UTXO changes (Lace pattern)
    const utxoSubscription = wallet.utxo.total$.subscribe({
      next: (utxos) => {
        runInAction(() => {
          this.state.utxos = Array.from(utxos);
          this.state.lastUpdated = Date.now();
        });
      },
      error: (error) => console.error('UTXO subscription error:', error)
    });

    // Subscribe to tip for network info (Lace pattern)
    const tipSubscription = wallet.tip$.subscribe({
      next: (tip) => {
        runInAction(() => {
          this.state.networkInfo.blockHeight = Number(tip.blockNo);
          this.state.networkInfo.lastBlockTime = Date.now();
          this.state.lastUpdated = Date.now();
        });
      },
      error: (error) => console.error('Tip subscription error:', error)
    });

    this.subscriptions.push(
      addressesSubscription,
      balanceSubscription, 
      utxoSubscription,
      tipSubscription
    );
  }

  /**
   * Clear all subscriptions
   */
  private clearSubscriptions(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  /**
   * Force refresh data from wallet (Lace pattern - usually not needed)
   */
  @action
  async refreshFromWallet(): Promise<void> {
    if (!this.wallet) return;
    
    try {
      // Force fresh data from wallet observables
      const [balance, utxos] = await Promise.all([
        firstValueFrom(this.wallet.balance.utxo.total$),
        firstValueFrom(this.wallet.utxo.total$)
      ]);

      runInAction(() => {
        this.state.balance = {
          coins: balance.coins,
          assets: balance.assets
        };
        this.state.utxos = Array.from(utxos);
        this.state.lastUpdated = Date.now();
      });
    } catch (error) {
      console.error('Failed to refresh from wallet:', error);
    }
  }

  /**
   * Get available UTXOs for spending
   */
  @computed
  get availableUtxos(): any[] {
    return this.state.utxos.filter(utxo => utxo.value.coins > BigInt(0));
  }

  /**
   * Get UTXOs containing specific assets
   */
  getUtxosWithAssets(assetIds: string[]): any[] {
    if (assetIds.length === 0) return [];
    
    return this.state.utxos.filter(utxo => {
      if (!utxo.value.assets) return false;
      
      return assetIds.some(assetId => utxo.value.assets!.has(assetId));
    });
  }

  /**
   * Get ADA balance in human-readable format
   */
  @computed
  get adaBalance(): number {
    return Number(this.state.balance.coins) / 1_000_000; // Convert from Lovelace to ADA
  }

  /**
   * Get asset balance
   */
  getAssetBalance(assetId: string): bigint {
    return this.state.balance.assets?.get(assetId) || BigInt(0);
  }

  /**
   * Get all asset balances
   */
  @computed
  get allAssetBalances(): Map<string, bigint> {
    return this.state.balance.assets || new Map();
  }

  /**
   * Get change address
   */
  @computed
  get changeAddress(): string {
    return this.state.changeAddress;
  }

  /**
   * Get all addresses
   */
  @computed
  get addresses(): string[] {
    return this.state.addresses;
  }

  /**
   * Get primary address (first address)
   */
  @computed
  get primaryAddress(): string {
    return this.state.addresses[0] || '';
  }

  /**
   * Get wallet instance (for advanced usage)
   */
  getWallet(): ObservableWallet | undefined {
    return this.wallet;
  }

  /**
   * Clear all data and dispose
   */
  @action
  dispose(): void {
    // Clear subscriptions first
    this.clearSubscriptions();
    
    // Clear state
    this.state = {
      addresses: [],
      changeAddress: '',
      utxos: [],
      balance: { coins: BigInt(0), assets: undefined },
      protocolParameters: undefined,
      networkInfo: {
        network: 'mainnet',
        url: '',
        blockHeight: undefined,
        lastBlockTime: undefined
      },
      isInitialized: false,
      lastUpdated: Date.now()
    };
    
    this.wallet = undefined;
  }

  /**
   * Legacy method for compatibility
   */
  clear(): void {
    this.dispose();
  }

  /**
   * Legacy method for compatibility
   */
  async refresh(): Promise<void> {
    await this.refreshFromWallet();
  }
}
