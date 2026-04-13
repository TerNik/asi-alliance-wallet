import {
  ASI_COIN_TYPE,
  KeyDerivationService,
  KeysManager,
  MnemonicService,
  WalletsService,
} from "@asichain/asi-wallet-sdk";
import { ASI_CHAIN_ADDRESS_META_KEY } from "./constants";

export class ASIChainService {
  async createMetaFromMnemonic(
    mnemonic: string,
    index: number = 0
  ): Promise<Record<string, string>> {
    let privateKey: Uint8Array | undefined;
    try {
      const words = MnemonicService.mnemonicToWordArray(mnemonic);
      privateKey = await KeyDerivationService.deriveKeyFromMnemonic(words, {
        coinType: ASI_COIN_TYPE,
        account: 0,
        change: 0,
        index,
      });

      const publicKey = KeysManager.getPublicKeyFromPrivateKey(privateKey);
      const address = WalletsService.deriveAddressFromPublicKey(publicKey);

      return {
        [ASI_CHAIN_ADDRESS_META_KEY]: address,
      };
    } catch (error) {
      console.error(
        "[ASIChainService] Failed to derive metacycle address:",
        error
      );
      return {};
    } finally {
      privateKey?.fill(0);
    }
  }
}
