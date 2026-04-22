import { ASI_CHAIN_FEATURE } from "./constants";
import { ChainInfo } from "@keplr-wallet/types";

export type ASIChainInfo = ChainInfo & {
  asi: {
    validator: string;
    observer: string;
  };
};

export const isASIChain = (
  chainInfo: ChainInfo | undefined
): chainInfo is ASIChainInfo => {
  if (!chainInfo) {
    return false;
  }

  if (!chainInfo.features?.includes(ASI_CHAIN_FEATURE)) {
    return false;
  }

  return Boolean(chainInfo.asi?.validator && chainInfo.asi?.observer);
};
