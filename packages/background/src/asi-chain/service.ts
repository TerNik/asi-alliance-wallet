import { WalletsService, MnemonicService } from "@asichain/asi-wallet-sdk";

export class ASIChainService {
  async createMetaFromMnemonic(
    mnemonic: string,
    index: number = 0
  ): Promise<Record<string, string>> {
    try {
      const walletMeta = await WalletsService.createWalletFromMnemonic(
        mnemonic,
        index
      );

      return {
        asiChainAddress: walletMeta.address,
      };
    } catch (error) {
      console.error(
        "[ASIChainService] Failed to derive metacycle address:",
        error
      );
      return {};
    }
  }

  generateMnemonic(strength: 128 | 256 = 128): string {
    return MnemonicService.generateMnemonic(strength);
  }

  validateMnemonic(mnemonic: string): boolean {
    return MnemonicService.isMnemonicValid(mnemonic);
  }
}
