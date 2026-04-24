import { Bech32Address } from "@keplr-wallet/cosmos";
import { ChainInfo } from "@keplr-wallet/types";

const ASI_COIN_TYPE = 60;
const ASI_BECH32_PREFIX = "asi";

export const ASI_CHAIN_FEATURE = "asi-chain";

export const INITIAL_ASI_CHAIN_CONFIG: ChainInfo = {
  chainId: "",
  chainName: "",
  rpc: "",
  rest: "",
  asi: {
    validator: "",
    observer: "",
  },
  bip44: { coinType: ASI_COIN_TYPE },
  bech32Config: Bech32Address.defaultBech32Config(ASI_BECH32_PREFIX),
  stakeCurrency: {
    coinDenom: "TESTASI",
    coinMinimalDenom: "atestasi",
    coinDecimals: 18,

  },
  currencies: [
    {
      coinDenom: "TESTASI",
      coinMinimalDenom: "atestasi",
      coinDecimals: 18,
  
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "TESTASI",
      coinMinimalDenom: "atestasi",
      coinDecimals: 18,
  
      gasPriceStep: {
        low: 0,
        average: 5000000000,
        high: 6250000000,
      },
    },
  ],
  features: [ASI_CHAIN_FEATURE],
};
