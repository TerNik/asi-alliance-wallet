import React from "react";
import style from "./style.module.scss";

import { useStore } from "../../../stores";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import { useLanguage } from "../../../languages";
import { AppCurrency } from "@keplr-wallet/types";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { separateNumericAndDenom } from "@utils/format";
import { WalletStatus } from "@keplr-wallet/stores";
import { useQuery } from "@tanstack/react-query";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import {
  checkAddressIsBuySellWhitelisted,
  useMoonpayCurrency,
} from "@utils/moonpay-currency";
import { moonpaySupportedTokensByChainId } from "../../more/token/moonpay/utils";
import { addressCacheStore } from "../../../utils/address-cache-store";
import { isASIChain as isASIChainPredicate } from "@keplr-wallet/asi-chain";
import { BalanceFieldEvm } from "./balance-field-evm";
import { BalanceFieldDefault } from "./balance-field-default";

interface Props {
  tokenState: any;
}

export const Balances: React.FC<Props> = observer(({ tokenState }) => {
  const {
    chainStore,
    accountStore,
    queriesStore,
    priceStore,
    keyRingStore,
    activityStore,
    analyticsStore,
    asiBalanceStore,
  } = useStore();
  const navigate = useNavigate();
  const language = useLanguage();

  const fiatCurrency = language.fiatCurrency;

  const current = chainStore.current;

  const queries = queriesStore.get(current.chainId);

  const accountInfo = accountStore.getAccount(current.chainId);

  const selectedKeyStore = keyRingStore.multiKeyStoreInfo.find(
    (ks) => ks.selected
  );

  const selectedWalletId = selectedKeyStore?.meta?.["__id__"] || "";

  const cachedAddress = current.chainId
    ? addressCacheStore.getCache(current.chainId)[selectedWalletId] || ""
    : "";

  const cachedSelectedAddress = selectedWalletId && cachedAddress;

  const isASIChain = isASIChainPredicate(current);

  const asiChainAddress =
    (isASIChain && selectedKeyStore?.meta?.["asiChainAddress"]) || "";

  const loadedAddress =
    accountInfo.walletStatus === WalletStatus.Loaded
      ? accountInfo.bech32Address
      : cachedSelectedAddress;

  const effectiveAddress = isASIChain ? asiChainAddress : loadedAddress;

  const balanceQuery =
    !isASIChain && effectiveAddress
      ? queries.queryBalances.getQueryBech32Address(effectiveAddress)
      : undefined;

  const balanceStakableQuery = balanceQuery ? balanceQuery.stakable : undefined;

  const isNoble =
    ChainIdHelper.parse(chainStore.current.chainId).identifier === "noble";

  const hasUSDC = chainStore.current.currencies.find(
    (currency: AppCurrency) => currency.coinMinimalDenom === "uusdc"
  );

  const isEvm = chainStore.current.features?.includes("evm") ?? false;

  const currency = current.feeCurrencies?.[0];

  const zero = currency
    ? new CoinPretty(currency, new Int(0)).ready(false)
    : undefined;

  const emptyBalance = () =>
    zero ??
    new CoinPretty(
      { coinDecimals: 0, coinDenom: "", coinMinimalDenom: "" } as any,
      new Int(0)
    ).ready(false);

  const asiBalanceEntry =
    isASIChain && asiChainAddress
      ? asiBalanceStore.getBalance(current, asiChainAddress)
      : undefined;

  const stakable = (() => {
    if (isASIChain) {
      return asiBalanceEntry?.balance ?? emptyBalance();
    }

    if (!effectiveAddress || !balanceQuery || !balanceStakableQuery) {
      return emptyBalance();
    }

    if (isNoble && hasUSDC) {
      return balanceQuery.getBalanceFromCurrency(hasUSDC);
    }

    return balanceStakableQuery.balance;
  })();

  const delegated =
    effectiveAddress && !isASIChain
      ? queries.cosmos.queryDelegations
          .getQueryBech32Address(effectiveAddress)
          .total.upperCase(true)
      : emptyBalance();

  const unbonding =
    effectiveAddress && !isASIChain
      ? queries.cosmos.queryUnbondingDelegations
          .getQueryBech32Address(effectiveAddress)
          .total.upperCase(true)
      : emptyBalance();

  const accountOrChainChanged =
    activityStore.getAddress !== effectiveAddress ||
    activityStore.getChainId !== current.chainId;

  const { data } = useMoonpayCurrency();

  const rewards = useQuery({
    queryKey: ["rewards", effectiveAddress, current.chainId],
    queryFn: async () => {
      if (effectiveAddress && current.chainId) {
        const rewards =
          queries.cosmos.queryRewards.getQueryBech32Address(effectiveAddress);
        await rewards.waitFreshResponse();

        const stakableRewards = rewards.stakableReward;
        return stakableRewards;
      }
      return null;
    },
    refetchInterval: 3600 * 1000,
    refetchOnMount: false,
    enabled:
      !current?.features?.includes("evm") &&
      !isASIChain &&
      Boolean(effectiveAddress),
    staleTime: accountOrChainChanged ? 0 : 3600 * 1000,
  });

  const allowedTokenList = data?.filter(
    (item: any) =>
      item?.type === "crypto" && (item?.isSellSupported || !item.isSuspended)
  );

  const moonpaySupportedTokens = moonpaySupportedTokensByChainId(
    current.chainId,
    allowedTokenList,
    chainStore.chainInfos
  );

  const stakableReward = rewards?.data || emptyBalance();

  const stakedSum = delegated.add(unbonding);

  const total = stakable.add(stakedSum).add(stakableReward);

  const totalPrice = priceStore.calculatePrice(total, fiatCurrency);

  const { numericPart: totalNumber, denomPart: totalDenom } =
    separateNumericAndDenom(
      total.shrink(true).trim(true).maxDecimals(6).toString()
    );

  const changeInDollarsValue =
    tokenState.type === "positive"
      ? tokenState.diff / 100
      : -tokenState.diff / 100;

  const changeInDollarsClass =
    tokenState.type === "positive"
      ? style["increaseInDollarsGreen"]
      : style["increaseInDollarsOrange"];

  const whitelistedBuySellAddress =
    current.chainId === "1" || current.chainId === "injective-1"
      ? accountInfo.ethereumHexAddress || ""
      : effectiveAddress;

  const isAddressWhitelisted = effectiveAddress
    ? checkAddressIsBuySellWhitelisted(whitelistedBuySellAddress)
    : false;

  const goToPortfolio = () => {
    analyticsStore.logEvent("view_portfolio_click", {
      pageName: "Home",
    });
    navigate("/portfolio");
  };

  return (
    <div className={style["balance-card"]}>
      {isEvm ? (
        <BalanceFieldEvm
          totalNumber={totalNumber}
          totalDenom={totalDenom}
          totalPrice={totalPrice}
          tokenState={tokenState}
          changeInDollarsValue={changeInDollarsValue}
          changeInDollarsClass={changeInDollarsClass}
          priceStore={priceStore}
          fiatCurrency={fiatCurrency}
        />
      ) : (
        <BalanceFieldDefault
          keyRingStoreStatus={keyRingStore.status}
          effectiveAddress={effectiveAddress}
          totalNumber={totalNumber}
          totalDenom={totalDenom}
          totalPrice={totalPrice}
          fiatCurrency={fiatCurrency}
          total={total}
          tokenState={tokenState}
          changeInDollarsValue={changeInDollarsValue}
          changeInDollarsClass={changeInDollarsClass}
          priceStore={priceStore}
        />
      )}
      <div className={style["btnContainer"]}>
        {moonpaySupportedTokens?.length > 0 &&
          !current.beta &&
          isAddressWhitelisted && (
            <button
              className={`${style["portfolio"]} ${style["buy"]}`}
              onClick={() => {
                navigate("/more/token/moonpay");
              }}
            >
              Buy/Sell
            </button>
          )}
        <button className={style["portfolio"]} onClick={goToPortfolio}>
          Portfolio
          <img src={require("@assets/svg/chevron-right.svg")} alt="chevron" />
        </button>
      </div>
    </div>
  );
});
