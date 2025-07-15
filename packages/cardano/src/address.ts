import * as bip39 from "bip39";
import {
  BaseAddress,
  Bip32PrivateKey,
  Ed25519KeyHash,
  Credential,
  RewardAddress
} from "@emurgo/cardano-serialization-lib-browser";
import { CardanoNetwork } from './cardano-key-agent';



const HARDENED = 0x80000000;

export function isValidCardanoMnemonic(mnemonic: string[]): boolean {
  return (
    (mnemonic.length === 12 || mnemonic.length === 24) &&
    bip39.validateMnemonic(mnemonic.join(" "))
  );
}

export function generateMnemonic(): string[] {
  return bip39.generateMnemonic().split(" ");
}

export async function deriveCardanoKeys(
  mnemonic: string[],
  network: CardanoNetwork = "mainnet"
): Promise<{ address: string; pubKey: string; rootPrivateKey: string; rewardAccount: string }> {
  if (!isValidCardanoMnemonic(mnemonic)) {
    throw new Error("Cardano seed phrase must be 12 or 24 valid BIP39 words");
  }
  const entropy = bip39.mnemonicToEntropy(mnemonic.join(" "));
  const rootKey = Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.from("")
  );
  const accountKey = rootKey
    .derive(HARDENED + 1852)
    .derive(HARDENED + 1815)
    .derive(HARDENED + 0);
  const paymentKey = accountKey.derive(0).derive(0).to_public();
  const stakeKey = accountKey.derive(2).derive(0).to_public();
  const networkId = network === "mainnet" ? 1 : 0;
  const paymentKeyHash = Ed25519KeyHash.from_bytes(paymentKey.to_raw_key().hash().to_bytes());
  const stakeKeyHash = Ed25519KeyHash.from_bytes(stakeKey.to_raw_key().hash().to_bytes());
  const baseAddr = BaseAddress.new(
    networkId,
    Credential.from_keyhash(paymentKeyHash),
    Credential.from_keyhash(stakeKeyHash)
  );
  const rewardAddr = RewardAddress.new(
    networkId,
    Credential.from_keyhash(stakeKeyHash)
  ).to_address().to_bech32();
  return {
    address: baseAddr.to_address().to_bech32(),
    pubKey: Buffer.from(accountKey.to_public().as_bytes()).toString("hex"),
    rootPrivateKey: Buffer.from(accountKey.as_bytes()).toString("hex"),
    rewardAccount: rewardAddr
  };
}

export async function deriveLaceStyleAddress(
  mnemonic: string[],
  network: CardanoNetwork = "mainnet"
): Promise<string> {
  const { address } = await deriveCardanoKeys(mnemonic, network);
  return address;
} 