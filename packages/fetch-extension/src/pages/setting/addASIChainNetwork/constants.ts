import { Bech32Address } from "@keplr-wallet/cosmos";
import { ChainInfo } from "@keplr-wallet/types";
import {
  ASI_COIN_TYPE,
  ASI_BECH32_PREFIX,
  ASI_CHAIN_FEATURE,
  ASI_DEFAULT_CURRENCY,
  ASI_GAS_PRICE_STEP,
} from "../../../config.asi-chain";

/**
 * Initial (blank) chain config used by the "Add custom ASI Chain network"
 * form.  Pre-populated with ASI-specific defaults (coinType 60, bech32 "asi",
 * known currency metadata) so the user only needs to fill in endpoints and
 * chain-id.
 */
export const INITIAL_ASI_CHAIN_CONFIG: ChainInfo = {
  chainId: "",
  chainName: "",
  rpc: "",
  rest: "",
  bip44: { coinType: ASI_COIN_TYPE },
  bech32Config: Bech32Address.defaultBech32Config(ASI_BECH32_PREFIX),
  stakeCurrency: {
    coinDenom: ASI_DEFAULT_CURRENCY.coinDenom,
    coinMinimalDenom: ASI_DEFAULT_CURRENCY.coinMinimalDenom,
    coinDecimals: ASI_DEFAULT_CURRENCY.coinDecimals,
    coinGeckoId: ASI_DEFAULT_CURRENCY.coinGeckoId,
  },
  currencies: [
    {
      coinDenom: ASI_DEFAULT_CURRENCY.coinDenom,
      coinMinimalDenom: ASI_DEFAULT_CURRENCY.coinMinimalDenom,
      coinDecimals: ASI_DEFAULT_CURRENCY.coinDecimals,
      coinGeckoId: ASI_DEFAULT_CURRENCY.coinGeckoId,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: ASI_DEFAULT_CURRENCY.coinDenom,
      coinMinimalDenom: ASI_DEFAULT_CURRENCY.coinMinimalDenom,
      coinDecimals: ASI_DEFAULT_CURRENCY.coinDecimals,
      coinGeckoId: ASI_DEFAULT_CURRENCY.coinGeckoId,
      gasPriceStep: { ...ASI_GAS_PRICE_STEP },
    },
  ],
  features: [ASI_CHAIN_FEATURE],
};
