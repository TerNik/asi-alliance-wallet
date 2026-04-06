import * as bip39 from "bip39";
import * as ASIWalletSDK from "@asichain/asi-wallet-sdk";
import type { WalletMeta } from "@asichain/asi-wallet-sdk";

/**
 * ASI Chain service that wraps the @asichain/asi-wallet-sdk to provide
 * metacycle address generation from seed phrases. Follows the same pattern
 * as CardanoService for consistent architecture.
 */
export class ASIChainService {
  private sdkResolvedPromise?: Promise<any>;

  private async getSdk(): Promise<{
    WalletsService: {
      createWalletFromMnemonic: (
        mnemonic?: string,
        index?: number
      ) => Promise<WalletMeta>;
      deriveAddressFromPrivateKey: (privateKey: Uint8Array) => string;
    };
  }> {
    if (!this.sdkResolvedPromise) {
      this.sdkResolvedPromise = (async () => {
        const maybePromise: any = ASIWalletSDK as any;
        const resolved =
          typeof maybePromise?.then === "function"
            ? await maybePromise
            : maybePromise;

        // Handle possible interop shapes: namespace exports vs { default: namespace }.
        return resolved?.WalletsService ? resolved : resolved?.default ?? resolved;
      })();
    }

    return this.sdkResolvedPromise;
  }

  /**
   * Generate ASI Chain metacycle address metadata from a mnemonic.
   * Used during account creation to derive and store the ASI address
   * in the key store meta alongside Cosmos/Cardano addresses.
   *
   * The SDK derives: mnemonic -> BIP44 private key (coin type 60) ->
   * secp256k1 public key -> keccak256 + blake2b + base58 -> metacycle address
   */
  async createMetaFromMnemonic(
    mnemonic: string,
    index: number = 0
  ): Promise<Record<string, string>> {
    try {
      const { WalletsService } = await this.getSdk();
      const walletMeta: WalletMeta =
        await WalletsService.createWalletFromMnemonic(mnemonic, index);

      return {
        asiChainAddress: walletMeta.address,
      };
    } catch (error) {
      console.error("[ASIChainService] Failed to derive metacycle address:", error);
      return {};
    }
  }

  generateMnemonic(strength: 128 | 256 = 128): string {
    return bip39.generateMnemonic(strength);
  }

  validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Derive a metacycle address directly from a private key (Uint8Array).
   * Used for private-key-based account imports.
   */
  async deriveAddressFromPrivateKey(privateKey: Uint8Array): Promise<string> {
    const { WalletsService } = await this.getSdk();
    return WalletsService.deriveAddressFromPrivateKey(privateKey);
  }
}
