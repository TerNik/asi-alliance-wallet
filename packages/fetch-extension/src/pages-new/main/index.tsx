import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { HeaderLayout } from "@layouts-v2/header-layout";
import { observer } from "mobx-react-lite";
import { useIntl } from "react-intl";

import { getWalletConfig } from "@graphQL/config-api";
import { getJWT } from "@utils/auth";
import { isASIChain } from "@keplr-wallet/asi-chain";

import { useConfirm } from "@components/confirm";
import { useLanguage } from "../../languages";
import { useLoadingIndicator } from "@components/loading-indicator";
import { useStore } from "../../stores";

import { AUTH_SERVER } from "../../config.ui.var";
import { LedgerAppModal } from "./ledger-app-modal";
import { WalletDetailsView } from "./wallet-details";

import { LineGraphOrNoData } from "./components/line-graph-or-no-data";
import { ChainNetworkDropdown } from "./components/chain-network-dropdown";
import { WalletDropdown } from "./components/wallet-dropdown";
import { OptionsDropdown } from "./components/options-dropdown";

export const MainPage: FunctionComponent = observer(() => {
  const [isSelectNetOpen, setIsSelectNetOpen] = useState(false);
  const [isSelectWalletOpen, setIsSelectWalletOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [tokenState, setTokenState] = useState({});
  const intl = useIntl();
  const language = useLanguage();
  const loadingIndicator = useLoadingIndicator();
  const fiatCurrency = language.fiatCurrency;
  const {
    chainStore,
    accountStore,
    keyRingStore,
    analyticsStore,
    chatStore,
    priceStore,
  } = useStore();

  const userState = chatStore.userDetailsStore;
  useEffect(() => {
    analyticsStore.logEvent("home_tab_click");
    analyticsStore.setUserProperties({
      totalAccounts: keyRingStore.multiKeyStoreInfo.length,
    });
  }, [analyticsStore, keyRingStore.multiKeyStoreInfo.length]);

  const confirm = useConfirm();

  const current = chainStore.current;
  const currentChainId = current.chainId;

  const prevChainId = useRef<string | undefined>();
  useEffect(() => {
    if (!chainStore.isInitializing && prevChainId.current !== currentChainId) {
      (async () => {
        try {
          await chainStore.tryUpdateChain(chainStore.current.chainId);
        } catch (e) {
          console.log(e);
        }
      })();

      prevChainId.current = currentChainId;
    }
  }, [chainStore, confirm, chainStore.isInitializing, currentChainId, intl]);

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const currentCoinGeckoId = chainStore.current.feeCurrencies?.[0]?.coinGeckoId;

  const priceInVsCurrency = currentCoinGeckoId
    ? priceStore.getPrice(currentCoinGeckoId, fiatCurrency)
    : undefined;

  useEffect(() => {
    if (keyRingStore.keyRingType === "ledger") {
      return;
    }
    if (isASIChain(chainStore.current)) {
      return;
    }
    getJWT(chainStore.current.chainId, AUTH_SERVER).then((res) => {
      chatStore.userDetailsStore.setAccessToken(res);
      getWalletConfig(userState.accessToken)
        .then((config) => chatStore.userDetailsStore.setWalletConfig(config))
        .catch((error) => {
          console.log(error);
        });
    });
  }, [
    chainStore,
    chainStore.current.chainId,
    accountInfo.bech32Address,
    keyRingStore.keyRingType,
    chatStore.userDetailsStore,
    userState.accessToken,
  ]);

  useEffect(() => {
    if (chainStore.selectedChainId === chainStore.current.chainId) {
      loadingIndicator.setIsLoading("chain-suggest-switch", false);
    }
  }, [chainStore.selectedChainId, chainStore, loadingIndicator]);

  return (
    <HeaderLayout
      innerStyle={{
        marginBottom: "0px",
      }}
    >
      <LedgerAppModal />
      <WalletDetailsView
        setIsSelectNetOpen={setIsSelectNetOpen}
        setIsSelectWalletOpen={setIsSelectWalletOpen}
        tokenState={tokenState}
      />
      <LineGraphOrNoData
        chainName={current.chainName}
        feeCurrencies={current.feeCurrencies}
        isASIChain={isASIChain(current)}
        tokenState={tokenState}
        setTokenState={setTokenState}
        priceInVsCurrency={priceInVsCurrency}
        vsCurrencySymbol={
          priceStore.supportedVsCurrencies[fiatCurrency]?.symbol || ""
        }
      />
      <ChainNetworkDropdown
        isOpen={isSelectNetOpen}
        setIsOpen={setIsSelectNetOpen}
      />
      <WalletDropdown
        isOpen={isSelectWalletOpen}
        setIsOpen={setIsSelectWalletOpen}
        onItemSelect={() => setIsSelectWalletOpen(false)}
        setIsOptionsOpen={setIsOptionsOpen}
        onAnalyticsEvent={analyticsStore.logEvent.bind(analyticsStore)}
      />
      <OptionsDropdown isOpen={isOptionsOpen} setIsOpen={setIsOptionsOpen} />
    </HeaderLayout>
  );
});
