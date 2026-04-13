import {
  Address,
  AssetsService,
  BlockchainGateway,
  isAddress,
} from "@asichain/asi-wallet-sdk";
import { ASIChainInfo, isASIChain } from "./chain-info";

export class ASIBalanceService {
  protected readonly assetsService = new AssetsService();
  protected currentGatewayKey = "";

  ensureGatewayInitialized(chainInfo: ASIChainInfo): void {
    const key = `${chainInfo.chainId}|${chainInfo.asi.validator}|${chainInfo.asi.observer}`;
    if (this.currentGatewayKey === key && BlockchainGateway.isInitialized()) {
      return;
    }

    try {
      BlockchainGateway.init({
        validator: { baseUrl: chainInfo.asi.validator },
        indexer: { baseUrl: chainInfo.asi.observer },
      });
      this.currentGatewayKey = key;
    } catch (e) {
      console.error(
        "[ASIBalanceService] Failed to initialize BlockchainGateway:",
        e
      );
    }
  }

  async fetchBalance(
    chainInfo: ASIChainInfo,
    address: string
  ): Promise<bigint | null> {
    if (!isASIChain(chainInfo)) return null;
    if (!address || !isAddress(address)) return null;

    this.ensureGatewayInitialized(chainInfo);
    return this.assetsService.getASIBalance(address as Address);
  }
}
