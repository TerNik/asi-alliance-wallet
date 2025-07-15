import { RNG } from "@keplr-wallet/crypto";

export interface KeyStore {
  version: "1.2";
  type: "mnemonic" | "privateKey" | "ledger" | "keystone";
  /**
   * The key is encoded as hex.
   */
  key: string;
  meta: Record<string, string>;
  bip44HDPath?: BIP44HDPath;
  curve: SupportedCurve;
  coinTypeForChain?: CoinTypeForChain;
  // TODO: Replace 'any' with a strict type for crypto if possible. For now, keep as any for Cardano compatibility.
  crypto: any;
}

export interface Key {
  algo: string;
  pubKey: Uint8Array;
  address: Uint8Array;
  isKeystone: boolean;
  isNanoLedger: boolean;
}

export type CoinTypeForChain = {
  [identifier: string]: number | undefined;
};

export type BIP44HDPath = {
  account: number;
  change: number;
  addressIndex: number;
};

export interface CommonCrypto {
  rng: RNG;
  scrypt: (text: string, params: ScryptParams) => Promise<Uint8Array>;
}

export interface ScryptParams {
  dklen: number;
  salt: string;
  n: number;
  r: number;
  p: number;
}

export interface ExportKeyRingData {
  type: "mnemonic" | "privateKey";
  // If the type is private key, the key is encoded as hex.
  key: string;
  coinTypeForChain?: CoinTypeForChain;
  bip44HDPath: BIP44HDPath;
  meta: {
    [key: string]: string;
  };
  curve: SupportedCurve;
}

export enum SignMode {
  Amino = "amino",
  Direct = "direct",
  Message = "message",
}

export type SupportedCurve = 'secp256k1' | 'ed25519';
