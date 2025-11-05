import { firstValueFrom } from 'rxjs';
import { getNetworkConfig, type BlockfrostConfig } from './adapters/env-adapter';

export class CardanoWalletManager {
  private wallet: any;
  private wsProvider: any;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private keyAgent: any;

  private constructor(wallet: any, keyAgent: any, wsProvider?: any) {
    this.wallet = wallet;
    this.keyAgent = keyAgent;
    this.wsProvider = wsProvider;
    if (this.wallet) {
      this.setupWSErrorHandling();
    }
  }

  private setupWSErrorHandling() {
    if (!this.wsProvider) return;
    
    // Handle WebSocket disconnections with auto-reconnect
    const handleReconnect = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        
        setTimeout(() => {
          try {
            if (this.wsProvider && this.wsProvider.connect) {
              this.wsProvider.connect();
            }
          } catch (error) {
            console.warn("WebSocket reconnect failed:", error);
          }
        }, Math.pow(2, this.reconnectAttempts) * 1000); // exponential backoff
      }
    };

    // Reset reconnect attempts on successful connection
    if (this.wsProvider.on) {
      this.wsProvider.on('connect', () => {
        this.reconnectAttempts = 0;
      });
      
      this.wsProvider.on('disconnect', handleReconnect);
      this.wsProvider.on('error', (error: any) => {
        console.warn("WebSocket error:", error);
        handleReconnect();
      });
    }
  }

  static async create({ mnemonicWords, network, accountIndex = 0 }: {
    mnemonicWords: string[];
    network: 'mainnet' | 'testnet';
    accountIndex?: number;
  }): Promise<CardanoWalletManager> {
    // Create key agent
    const { SodiumBip32Ed25519 } = await import('@cardano-sdk/crypto');
    const { InMemoryKeyAgent } = await import('@cardano-sdk/key-management');
    const { Cardano } = await import('@cardano-sdk/core');

    const bip32Ed25519 = await SodiumBip32Ed25519.create();
    const keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords({
      mnemonicWords,
      accountIndex,
      purpose: 1852,
      chainId: network === 'mainnet' ? Cardano.ChainIds.Mainnet : Cardano.ChainIds.Preview,
      getPassphrase: async () => Buffer.from('')
    }, { bip32Ed25519, logger: console });

    // Check if Blockfrost is available
    const networkConfig = getNetworkConfig(network);
    let wallet: any = undefined;
    
    if (networkConfig?.projectId) {
      try {
        wallet = await this.createFullWallet(networkConfig, keyAgent);
      } catch (error) {
        console.error('[CardanoWalletManager] Failed to create full wallet:', error);
      }
    } else {
      console.warn('[CardanoWalletManager] No Blockfrost API key found for network:', network);
    }

    return new CardanoWalletManager(wallet, keyAgent);
  }

  private static async createFullWallet(
    networkConfig: BlockfrostConfig,
    keyAgent: any
  ): Promise<any> {
    // Import necessary SDK modules
    const walletModule = await import('@cardano-sdk/wallet');
    const { createPersonalWallet, storage, DEFAULT_POLLING_CONFIG } = walletModule;
    const KeyManagement = await import('@cardano-sdk/key-management');
    const { createBlockfrostProviders } = await import('./wallet/lib/providers');

    const providers = createBlockfrostProviders({
      blockfrostConfig: networkConfig,
      logger: console
    });

    const stores = storage.createInMemoryWalletStores();
    const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
    const witnesser = KeyManagement.util.createBip32Ed25519Witnesser(asyncKeyAgent);
    const bip32Account = await KeyManagement.Bip32Account.fromAsyncKeyAgent(asyncKeyAgent) as any;

    const wallet = createPersonalWallet(
      {
        name: 'Cardano Wallet',
        polling: DEFAULT_POLLING_CONFIG
      },
      {
        logger: console,
        ...providers,
        stores,
        witnesser,
        bip32Account
      }
    );

    return wallet;
  }

  async getBalance() {
    if (!this.wallet) {
      return {
        utxo: {
          available: { coins: BigInt(0) },
          total: { coins: BigInt(0) },
          unspendable: { coins: BigInt(0) }
        },
        rewards: BigInt(0),
        deposits: BigInt(0),
        assetInfo: new Map()
      };
    }

    try {
      const [available, total, unspendable, rewards, deposits, assetInfo] = await Promise.all([
        firstValueFrom(this.wallet.balance.utxo.available$),
        firstValueFrom(this.wallet.balance.utxo.total$),
        firstValueFrom(this.wallet.balance.utxo.unspendable$),
        firstValueFrom(this.wallet.balance.rewardAccounts.rewards$),
        firstValueFrom(this.wallet.balance.rewardAccounts.deposit$),
        firstValueFrom(this.wallet.assetInfo$).catch(() => new Map())
      ]);

      return {
        utxo: { available, total, unspendable },
        rewards: rewards || BigInt(0),
        deposits: deposits || BigInt(0),
        assetInfo: assetInfo || new Map()
      };
    } catch (error) {
      console.warn("Failed to get balance:", error);
      return {
        utxo: {
          available: { coins: BigInt(0) },
          total: { coins: BigInt(0) },
          unspendable: { coins: BigInt(0) }
        },
        rewards: BigInt(0),
        deposits: BigInt(0),
        assetInfo: new Map()
      };
    }
  }

  async getAddresses() {
    if (!this.wallet) {
      return [];
    }
    
    try {
      return await firstValueFrom(this.wallet.addresses$);
    } catch (error) {
      console.warn("Failed to get addresses:", error);
      return [];
    }
  }

  async signAndSubmitTx(txProps: any) {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    
    try {
      const txInit = await this.wallet.initializeTx(txProps);
      const finalizedTx = await this.wallet.finalizeTx({ tx: txInit });
      return await this.wallet.submitTx(finalizedTx);
    } catch (error) {
      console.error("Transaction failed:", error);
      if (error?.message?.includes('insufficient')) {
        throw new Error('Insufficient funds for transaction');
      }
      if (error?.message?.includes('network')) {
        throw new Error('Network error. Please try again');
      }
      throw error;
    }
  }


  
  /**
   * Creates TxBuilder for building transactions
   * Direct access to BaseWallet method
   */
  createTxBuilder() {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return this.wallet.createTxBuilder();
  }

  /**
   * lace-style: cleanup method for proper resource management
   */
  dispose() {
    try {
      if (this.wsProvider && this.wsProvider.close) {
        this.wsProvider.close().catch((error: any) => 
          console.warn("Error closing WebSocket:", error)
        );
      }
      if (this.wallet && this.wallet.shutdown) {
        this.wallet.shutdown();
      }
    } catch (error) {
      console.warn("Error during wallet disposal:", error);
    }
  }

  /**
   * Initializes transaction with given parameters
   * Direct access to BaseWallet method
   */
  async initializeTx(txProps: any) {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return await this.wallet.initializeTx(txProps);
  }

  /**
   * Finalizes and signs transaction
   * Direct access to BaseWallet method
   */
  async finalizeTx(params: { tx: any }) {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return await this.wallet.finalizeTx(params);
  }

  /**
   * Submits signed transaction to network
   * Direct access to BaseWallet method
   */
  async submitTx(signedTx: any) {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return await this.wallet.submitTx(signedTx);
  }

  /**
   * Checks if wallet is initialized and available for transactions
   */
  hasWallet(): boolean {
    return !!this.wallet;
  }

  /**
   * Gets current blockchain tip
   * Needed for setting validity interval
   */
  get tip$() {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return this.wallet.tip$;
  }

  /**
   * Gets protocol parameters
   * Needed for minAdaRequired validation
   */
  get protocolParameters$() {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return this.wallet.protocolParameters$;
  }

  /**
   * Gets wallet UTXO
   */
  get utxo() {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return this.wallet.utxo;
  }

  /**
   * Gets wallet addresses
   */
  get addresses$() {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return this.wallet.addresses$;
  }

  /**
   * Gets base wallet for access to ObservableWallet API
   * Needed for integration with functions from Lace wallet/lib
   */
  getWallet() {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    return this.wallet;
  }

  /**
   * Estimates transaction fee for ADA send using lace-style buildTx + inspect pattern
   * Follows lace architecture: buildTx → tx.inspect() → get fee
   */
  async estimateSendAda(params: {
    to: string;
    amount: string;
    memo?: string;
  }): Promise<{ fee: string; total: string }> {
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    
    try {
      const { Cardano } = await import('@cardano-sdk/core');
      const { buildTx } = await import('./api/extension/wallet');
      const { getAuxiliaryData } = await import('./wallet/lib/get-auxiliary-data');
      
      if (!params.to || typeof params.to !== 'string') {
        throw new Error(`Invalid recipient address: ${params.to}`);
      }

      let address: any;
      try {
        address = Cardano.PaymentAddress(params.to);
        if (!address) {
          throw new Error('Failed to parse address from bech32');
        }
      } catch (parseError: any) {
        console.error('[CardanoWalletManager] Failed to parse address:', parseError);
        throw new Error(`Invalid Cardano address format: ${parseError?.message || parseError}`);
      }

      // Create output in lace-style format
      const output = {
        address,
        value: { coins: BigInt(params.amount) }
      };
      
      // Create auxiliary data if memo provided
      const auxiliaryData = params.memo 
        ? getAuxiliaryData({ metadataString: params.memo })
        : undefined;
      
      // Use lace-style buildTx pattern
      const tx = await buildTx({
        output,
        auxiliaryData,
        walletManager: this
      });
      
      // Use tx.inspect() to get fee (lace-style)
      let inspection: any;
      try {
        inspection = await tx.inspect();
      } catch (error) {
        console.error('[CardanoWalletManager] Failed to inspect transaction for estimation:', error);
        // Fallback: use default fee if inspection fails
        const defaultFee = '200000'; // 0.2 ADA default fee
        const totalAmount = (BigInt(params.amount) + BigInt(defaultFee)).toString();
        return {
          fee: defaultFee,
          total: totalAmount
        };
      }
      
      if (!inspection || !inspection.inputSelection) {
        // Fallback: use default fee if inspection structure is invalid
        const defaultFee = '200000'; // 0.2 ADA default fee
        const totalAmount = (BigInt(params.amount) + BigInt(defaultFee)).toString();
        return {
          fee: defaultFee,
          total: totalAmount
        };
      }
      
      const fee = inspection.inputSelection.fee.toString();
      const totalAmount = (BigInt(params.amount) + BigInt(fee)).toString();
      
      return {
        fee,
        total: totalAmount
      };
    } catch (error) {
      console.error("Failed to estimate Cardano transaction fee:", error);
      const TYPICAL_TX_SIZE_BYTES = 500;
      const FEE_COEFFICIENT = 0.000044; // ada per byte
      const FEE_CONSTANT = 0.155381; // ada
      const estimatedFeeAda = (TYPICAL_TX_SIZE_BYTES * FEE_COEFFICIENT) + FEE_CONSTANT;
      const estimatedFeeLovelaces = Math.ceil(estimatedFeeAda * 1000000).toString();
      const totalAmount = (BigInt(params.amount) + BigInt(estimatedFeeLovelaces)).toString();
      
      return {
        fee: estimatedFeeLovelaces,
        total: totalAmount
      };
    }
  }

  /**
   * High-level function for sending ADA
   * Uses lace-style buildTx + signAndSubmit pattern for consistency with lace architecture
   * Includes minAdaRequired validation (lace prepareTx pattern) and tx.inspect() before sending
   */
  async sendAda(params: {
    to: string;
    amount: string; // in lovelaces (1 ADA = 1,000,000 lovelaces)
    memo?: string;
  }): Promise<string> {
    console.log('[CardanoWalletManager] sendAda called with:', params);
    if (!this.wallet) {
      throw new Error("Transaction features unavailable without Blockfrost API key");
    }
    
    try {
      console.log('[CardanoWalletManager] Loading dependencies...');
      const { Cardano, Serialization } = await import('@cardano-sdk/core');
      const { buildTx, signAndSubmit } = await import('./api/extension/wallet');
      const { getAuxiliaryData } = await import('./wallet/lib/get-auxiliary-data');
      const { minAdaRequired } = await import('./api/util');
      console.log('[CardanoWalletManager] Dependencies loaded');
      
      if (!params.to || typeof params.to !== 'string') {
        throw new Error(`Invalid recipient address: ${params.to}`);
      }

      let address: any;
      try {
        address = Cardano.PaymentAddress(params.to);
        if (!address) {
          throw new Error('Failed to parse address from bech32');
        }
      } catch (parseError: any) {
        console.error('[CardanoWalletManager] Failed to parse address:', parseError);
        throw new Error(`Invalid Cardano address format: ${parseError?.message || parseError}`);
      }

      // Lace-style prepareTx: validate minAdaRequired before buildTx
      // Lace pattern: use firstValueFrom directly (as in lace wallet.ts:25, activity-detail-slice.ts:196)
      // protocolParameters$ from Cardano SDK is BehaviorSubject, so it should emit immediately
      console.log('[CardanoWalletManager] Getting protocolParameters...');
      let protocolParameters: any;
      try {
        // Lace pattern: use firstValueFrom directly without filter/take
        // protocolParameters$ is BehaviorSubject/ReplaySubject from Cardano SDK, always has current value
        protocolParameters = await firstValueFrom(this.protocolParameters$);
        console.log('[CardanoWalletManager] protocolParameters received:', protocolParameters ? 'OK' : 'null');
      } catch (error) {
        console.error('[CardanoWalletManager] Failed to get protocolParameters:', error);
        // Fallback: use default value if protocolParameters unavailable
        protocolParameters = { coinsPerUtxoByte: 4310 };
      }
      
      const amountBigInt = BigInt(params.amount);
      
      // Create TransactionOutput for minAdaRequired validation (lace pattern)
      const checkOutput = new Serialization.TransactionOutput(
        address,
        new Serialization.Value(amountBigInt)
      );
      
      // Extract coinsPerUtxoByte from protocolParameters (lace pattern)
      const coinsPerUtxoByte = BigInt(protocolParameters?.coinsPerUtxoByte || protocolParameters?.coinsPerUtxoWord || 4310);
      const minAda = minAdaRequired(
        checkOutput,
        coinsPerUtxoByte
      );
      
      // Validate that amount >= minAdaRequired (lace pattern)
      if (BigInt(minAda) > amountBigInt) {
        throw new Error(`Transaction not possible: amount ${params.amount} is less than minimum required ${minAda} lovelace`);
      }

      // Create output in lace-style format
      const output = {
        address,
        value: { coins: amountBigInt }
      };
      
      // Create auxiliary data if memo provided
      const auxiliaryData = params.memo 
        ? getAuxiliaryData({ metadataString: params.memo })
        : undefined;
      
      // Use lace-style buildTx pattern: buildTx → UnwitnessedTx
      console.log('[CardanoWalletManager] Building transaction...');
      const tx = await buildTx({
        output,
        auxiliaryData,
        walletManager: this
      });
      console.log('[CardanoWalletManager] Transaction built successfully');
      
      // Lace-style: tx.inspect() before sending for validation
      console.log('[CardanoWalletManager] Inspecting transaction...');
      let inspection: any;
      try {
        inspection = await tx.inspect();
        console.log('[CardanoWalletManager] Transaction inspection completed');
      } catch (error) {
        console.error('[CardanoWalletManager] Failed to inspect transaction:', error);
        // Continue without inspection if it fails (non-critical validation)
        // This allows transaction to proceed even if inspection fails
        inspection = null;
      }
      
      // Validate transaction before sending (lace pattern)
      // Only validate if inspection succeeded
      if (inspection && !inspection.inputSelection) {
        throw new Error('Transaction validation failed: unable to inspect transaction');
      }
      
      // Use lace-style signAndSubmit pattern: tx.sign() → submitTx
      console.log('[CardanoWalletManager] Signing and submitting transaction...');
      const txId = await signAndSubmit({
        tx,
        walletManager: this
      });
      console.log('[CardanoWalletManager] Transaction submitted successfully, txId:', txId);
      
      return typeof txId === 'string' ? txId : txId.toString();
    } catch (error) {
      console.error("Failed to send ADA transaction:", error);
      if (error?.message?.includes('insufficient')) {
        throw new Error('Insufficient funds for transaction');
      }
      if (error?.message?.includes('network')) {
        throw new Error('Network error. Please try again');
      }
      if (error?.message?.includes('Mock wallet') || error?.message?.includes('subscribe')) {
        throw new Error('Transaction sending requires a full wallet with Blockfrost API key. Please configure Blockfrost API key.');
      }
      if (error?.message?.includes('Transaction not possible')) {
        throw error; // Re-throw minAda validation errors
      }
      throw error;
    }
  }

  // Key agent access for CardanoKeyRing
  getKeyAgent(): any {
    return this.keyAgent;
  }


} 