import * as bip39 from "bip39";
import {
  Bip32PrivateKey,
  Ed25519KeyHash,
  BaseAddress,
  Credential,
  HARDENED
} from "@emurgo/cardano-serialization-lib-browser";
import { CardanoNetwork } from '@keplr-wallet/cardano';



export class CardanoKeyStore {
  private mnemonic: string[] | null = null;
  private address: string = "";

  generateMnemonic(): string[] {
    const mnemonic = bip39.generateMnemonic().split(" ");
    this.mnemonic = mnemonic;
    this.address = "";
    return mnemonic;
  }

  async restoreFromMnemonic(mnemonic: string[], network: CardanoNetwork = "mainnet"): Promise<string> {
    if (!bip39.validateMnemonic(mnemonic.join(" "))) {
      throw new Error("Invalid mnemonic");
    }
    this.mnemonic = mnemonic;
    return this.generateAddress(network);
  }

  async generateAddress(network: CardanoNetwork = "mainnet"): Promise<string> {
    if (!this.mnemonic) {
      throw new Error("Mnemonic not set");
    }
    const entropy = bip39.mnemonicToEntropy(this.mnemonic.join(" "));
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
    const paymentKeyHash = Ed25519KeyHash.from_bytes(paymentKey.to_raw_key().hash().to_bytes());
    const stakeKeyHash = Ed25519KeyHash.from_bytes(stakeKey.to_raw_key().hash().to_bytes());
    const baseAddr = BaseAddress.new(
      network === "mainnet" ? 1 : 0,
      Credential.new(paymentKeyHash, 0),
      Credential.new(stakeKeyHash, 0)
    );
    this.address = baseAddr.to_address().to_bech32();
    return this.address;
  }

  getMnemonic(): string[] | null {
    return this.mnemonic;
  }

  getAddress(): string {
    return this.address;
  }
} 