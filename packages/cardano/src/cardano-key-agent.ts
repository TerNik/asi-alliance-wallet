import * as bip39 from 'bip39';
import {
  Bip32PrivateKey,
  Ed25519KeyHash,
  BaseAddress,
  Credential,
  RewardAddress
} from '@emurgo/cardano-serialization-lib-browser';
import { Buffer } from 'buffer';
import { Crypto, CommonCrypto } from '@keplr-wallet/background';



export type CardanoNetwork = "mainnet" | "testnet";

const HARDENED = 0x80000000;

export type CardanoKeyAgentOptions = {
  mnemonic: string[];
  getPassphrase: () => Promise<Uint8Array>;
  accountIndex?: number;
  network?: 'mainnet' | 'testnet';
};

export type DeriveAddressParams = {
  type: 'external' | 'internal';
  index: number;
  stakeIndex?: number;
};

export type DerivedCardanoAddress = {
  address: string;
  publicKey: string;
  stakeKey: string;
  rewardAccount: string;
  index: number;
  type: 'external' | 'internal';
};

export class CardanoKeyAgent {
  private accountKey: any;
  private accountIndex: number;
  private networkId: number;

  static async fromMnemonic(opts: CardanoKeyAgentOptions): Promise<CardanoKeyAgent> {
    const { mnemonic, getPassphrase, accountIndex = 0, network = 'mainnet' } = opts;
    const entropy = bip39.mnemonicToEntropy(mnemonic.join(' '));
    const passphrase = await getPassphrase();
    const rootKey = Bip32PrivateKey.from_bip39_entropy(
      fromHex(entropy),
      passphrase
    );
    // m/1852'/1815'/account'
    const accountKey = rootKey
      .derive(HARDENED + 1852)
      .derive(HARDENED + 1815)
      .derive(HARDENED + accountIndex);
    const networkId = network === 'mainnet' ? 1 : 0;
    return new CardanoKeyAgent(accountKey, accountIndex, networkId);
  }

  private constructor(
    accountKey: any,
    accountIndex: number,
    networkId: number
  ) {
    this.accountKey = accountKey;
    this.accountIndex = accountIndex;
    this.networkId = networkId;
  }

  async deriveAddress(params: DeriveAddressParams): Promise<DerivedCardanoAddress> {
    const { type, index, stakeIndex = 0 } = params;
    // role: 0 = external, 1 = internal
    const role = type === 'external' ? 0 : 1;
    // payment key: m/1852'/1815'/account'/role/index
    const paymentKey = this.accountKey.derive(role).derive(index);
    // stake key: m/1852'/1815'/account'/2/stakeIndex
    const stakeKey = this.accountKey.derive(2).derive(stakeIndex);
    const paymentKeyHash = Ed25519KeyHash.from_bytes(paymentKey.to_public().to_raw_key().hash().to_bytes());
    const stakeKeyHash = Ed25519KeyHash.from_bytes(stakeKey.to_public().to_raw_key().hash().to_bytes());
    const baseAddr = BaseAddress.new(
      this.networkId,
      Credential.from_keyhash(paymentKeyHash),
      Credential.from_keyhash(stakeKeyHash)
    );
    const rewardAddr = RewardAddress.new(
      this.networkId,
      Credential.from_keyhash(stakeKeyHash)
    ).to_address().to_bech32();
    return {
      address: baseAddr.to_address().to_bech32(),
      publicKey: toHex(paymentKey.to_public().as_bytes()),
      stakeKey: toHex(stakeKey.to_public().as_bytes()),
      rewardAccount: rewardAddr,
      index,
      type
    };
  }

  getAccountPublicKey(): string {
    return toHex(this.accountKey.to_public().as_bytes());
  }

  /**
   * Encrypts the root private key for storage (uses common Crypto.encrypt)
   */
  public static async encryptRootKey(
    crypto: CommonCrypto,
    rootKeyHex: string,
    password: string
  ): Promise<any> {
    // Use type: 'cardano-root', curve: 'ed25519'
    return await Crypto.encrypt(
      crypto,
      'scrypt',
      'mnemonic', // or 'cardano-root' if needed
      'ed25519',
      rootKeyHex,
      password,
      {}
    );
  }

  /**
   * Decrypts the root private key (uses common Crypto.decrypt)
   */
  public static async decryptRootKey(
    crypto: CommonCrypto,
    keyStore: any,
    password: string
  ): Promise<string> {
    const bytes = await Crypto.decrypt(crypto, keyStore, password);
    return toHex(bytes);
  }

  /**
   * Serializes the agent for storage in keyStore (encrypts rootKey via Crypto)
   */
  public async serialize(crypto: CommonCrypto, password: string): Promise<{
    encryptedRootPrivateKey: any; // KeyStore-compatible object
    extendedAccountPublicKey: string;
    accountIndex: number;
    networkId: number;
  }> {
    // rootKey in bytes
    const rootKeyHex = toHex(this.accountKey.as_bytes());
    const encryptedRootPrivateKey = await CardanoKeyAgent.encryptRootKey(
      crypto,
      rootKeyHex,
      password
    );
    return {
      encryptedRootPrivateKey,
      extendedAccountPublicKey: this.accountKey ? toHex(this.accountKey.to_public().as_bytes()) : '',
      accountIndex: this.accountIndex,
      networkId: this.networkId
    };
  }

  /**
   * Restores the agent from serialized data (decrypts rootKey via Crypto)
   */
  public static async fromSerialized(
    data: {
      encryptedRootPrivateKey: any;
      extendedAccountPublicKey: string;
      accountIndex: number;
      networkId: number;
    },
    crypto: CommonCrypto,
    password: string
  ): Promise<CardanoKeyAgent> {
    // Decrypt root private key
    const rootKeyHex = await CardanoKeyAgent.decryptRootKey(crypto, data.encryptedRootPrivateKey, password);
    const { Bip32PrivateKey } = await import('@emurgo/cardano-serialization-lib-browser');
    const rootKey = Bip32PrivateKey.from_bytes(fromHex(rootKeyHex));
    const agent = Object.create(CardanoKeyAgent.prototype);
    agent.accountKey = rootKey;
    agent.accountIndex = data.accountIndex;
    agent.networkId = data.networkId;
    return agent;
  }

  /**
   * Gets the account public key (hex)
   */
  public getPublicKey(): string {
    return this.accountKey ? toHex(this.accountKey.to_public().as_bytes()) : '';
  }

  /**
   * Gets the reward account (stake address, bech32)
   */
  public getRewardAccount(stakeIndex = 0): string {
    if (!this.accountKey) return '';
    const stakeKey = this.accountKey.derive(2).derive(stakeIndex);
    const stakeKeyHash = stakeKey.to_public().to_raw_key().hash();
    // Cardano stake address: networkId + stakeKeyHash
    // BaseAddress.new(networkId, payment, stake)
    // But reward account is stakeKeyHash + networkId
    // Form enterprise address (stake only)
    // You can use CardanoSerializationLib API for this
    // TODO: implement correctly via CardanoSerializationLib
    return toHex(stakeKeyHash);
  }

  /**
   * Message signing (stub)
   */
  public async sign(_message: Uint8Array): Promise<string> {
    // TODO: implement signing via accountKey
    throw new Error('sign: Not implemented');
  }

  // TODO: add encrypt/decrypt rootKey with passphrase for storage
}

function toHex(buf: Uint8Array): string {
  return Buffer.from(buf).toString('hex');
}
function fromHex(hex: string): Uint8Array {
  return Buffer.from(hex, 'hex');
} 