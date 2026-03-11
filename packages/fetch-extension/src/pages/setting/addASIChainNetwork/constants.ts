import { Bech32Address } from "@keplr-wallet/cosmos";
import { ChainInfo } from "@keplr-wallet/types";

/** BIP-44 coin type used by ASI Chain (EVM-compatible). */
const ASI_COIN_TYPE = 60;

/** Bech32 address prefix for ASI Chain addresses. */
const ASI_BECH32_PREFIX = "asi";

/** Feature flag used to identify ASI Chain networks. */
export const ASI_CHAIN_FEATURE = "asi-chain";

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
    coinDenom: "TESTASI",
    coinMinimalDenom: "atestasi",
    coinDecimals: 18,
    coinGeckoId: "fetch-ai",
  },
  currencies: [
    {
      coinDenom: "TESTASI",
      coinMinimalDenom: "atestasi",
      coinDecimals: 18,
      coinGeckoId: "fetch-ai",
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "TESTASI",
      coinMinimalDenom: "atestasi",
      coinDecimals: 18,
      coinGeckoId: "fetch-ai",
      gasPriceStep: {
        low: 0,
        average: 5000000000,
        high: 6250000000,
      },
    },
  ],
  features: [ASI_CHAIN_FEATURE],
};
