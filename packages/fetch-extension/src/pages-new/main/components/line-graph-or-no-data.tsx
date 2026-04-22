import React from "react";
import { LineGraphView } from "@components-v2/line-graph";
import { NoDataAvailable } from "./no-data-available";
import { FeeCurrency } from "@keplr-wallet/types";

interface LineGraphOrNoDataProps {
  chainName: string;
  feeCurrencies: Omit<FeeCurrency, "gasPriceStep">[];
  isASIChain: boolean;
  tokenState: Record<string, any>;
  setTokenState: (state: Record<string, any>) => void;
  priceInVsCurrency: number | undefined;
  vsCurrencySymbol: string;
}

export const LineGraphOrNoData: React.FC<LineGraphOrNoDataProps> = ({
  feeCurrencies,
  isASIChain,
  tokenState,
  setTokenState,
  priceInVsCurrency,
  vsCurrencySymbol,
}) => {
  if (isASIChain) {
    return null;
  }

  if (!feeCurrencies || !feeCurrencies.length) {
    return <NoDataAvailable />;
  }

  const { coinGeckoId, coinDenom } = feeCurrencies[0];

  return (
    <LineGraphView
      setTokenState={setTokenState}
      tokenName={coinGeckoId}
      tokenDenom={coinDenom}
      tokenState={tokenState}
      priceInVsCurrency={priceInVsCurrency}
      vsCurrencySymbol={vsCurrencySymbol}
    />
  );
};
