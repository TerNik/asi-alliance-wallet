import { RNG } from "@keplr-wallet/crypto";

export type CoinTypeForChain = {
  [identifier: string]: number;
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
}

export enum SignMode {
  Amino = "amino",
  Direct = "direct",
  Message = "message",
}

export type SupportedCurve = 'secp256k1' | 'ed25519';

export type KeyStore = {
  type: "mnemonic" | "privateKey" | "ledger" | "keystone";
  version: "1.0" | "1.1" | "1.2";
  meta: Record<string, string>;
  bip44HDPath?: BIP44HDPath;
  curve: SupportedCurve;
  coinTypeForChain?: CoinTypeForChain;
  // TODO: Replace 'any' with a strict type for crypto if possible. For now, keep as any for Cardano compatibility.
  crypto: any;
};
