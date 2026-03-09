import { Card } from "@components-v2/card";
import { SearchBar } from "@components-v2/search-bar";
import { TabsPanel } from "@components-v2/tabs/tabsPanel-2";
import { HeaderLayout } from "@layouts-v2/header-layout";
import { observer } from "mobx-react-lite";
import React, { FunctionComponent, useState, useCallback } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useStore } from "../../../stores";
import style from "./style.module.scss";
import { ToggleSwitchButton } from "@components-v2/buttons/toggle-switch-button";
import { ButtonV2 } from "@components-v2/buttons/button";
import { getFilteredChainValues } from "@utils/filters";
import { NoResults } from "@components-v2/no-results";
import {
  filterCosmosChains,
  filterEvmChains,
  filterASIChains,
  filterCardanoChains,
} from "@utils/chain-filters";

/** Map tab id → localization key for the header title. */
const TAB_TITLE_KEYS: Record<string, string> = {
  Cosmos: "chain.manage-networks.cosmos",
  EVM: "chain.manage-networks.evm",
  Cardano: "chain.manage-networks.cardano",
  "ASI Chain": "chain.manage-networks.asi-chain",
};

/** Standard button styles reused across all "Add custom…" buttons. */
const ADD_BUTTON_STYLE = {
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  height: "48px",
  fontSize: "14px",
  fontWeight: 400,
};

export const ManageNetworks: FunctionComponent = observer(() => {
  const intl = useIntl();
  const navigate = useNavigate();

  const { chainStore, analyticsStore } = useStore();

  const [cosmosSearchTerm, setCosmosSearchTerm] = useState("");
  const [evmSearchTerm, setEvmSearchTerm] = useState("");
  const [cardanoSearchTerm, setCardanoSearchTerm] = useState("");
  const [asiChainSearchTerm, setASIChainSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("Cosmos");

  // ── Chain lists (centralised filters) ─────────────────────────────────
  const allChains = chainStore.chainInfos;

  const mainChainList = filterCosmosChains(allChains);
  const evmChainList = filterEvmChains(allChains);
  const cardanoChainList = filterCardanoChains(allChains);
  const asiChainList = filterASIChains(allChains);

  const disabledChainList = chainStore.disabledChainInfosInUI;

  // ── Pre-compute helpers (run before JSX) ──────────────────────────────

  /** Resolve left image for a chain card. */
  const getChainIcon = useCallback((chainInfo: any) => {
    if (chainInfo.raw.chainSymbolImageUrl !== undefined) {
      return chainInfo.raw.chainSymbolImageUrl;
    }
    return chainInfo.chainName ? chainInfo.chainName[0].toUpperCase() : "";
  }, []);

  /** Resolve left image background. */
  const getChainIconStyle = useCallback(
    (chainInfo: any) => ({
      backgroundColor: !chainInfo.raw.chainSymbolImageUrl
        ? "#dddfdf"
        : "transparent",
    }),
    []
  );

  /** Shared card renderer for manage-network lists. */
  const renderManageCard = useCallback(
    (chainInfo: any, index: number) => {
      const icon = getChainIcon(chainInfo);
      const iconStyle = getChainIconStyle(chainInfo);

      return (
        <Card
          key={index}
          leftImage={icon}
          leftImageStyle={iconStyle}
          heading={chainInfo.chainName}
          rightContent={
            <ToggleSwitchButton
              checked={!disabledChainList.includes(chainInfo)}
              onChange={() => {
                chainStore.toggleChainInfoInUI(chainInfo.chainId);
              }}
            />
          }
        />
      );
    },
    [disabledChainList, chainStore, getChainIcon, getChainIconStyle]
  );

  /** Create an "Add custom … network" button for a given route/label. */
  const addCustomButton = useCallback(
    (route: string, label: string) => (
      <ButtonV2
        styleProps={ADD_BUTTON_STYLE}
        onClick={(e: any) => {
          e.preventDefault();
          navigate(route);
        }}
        gradientText={""}
        text={label}
      />
    ),
    [navigate]
  );

  // ── Resolve the header title using a map (not nested ternaries) ───────
  const headerTitleKey =
    TAB_TITLE_KEYS[selectedTab] ?? TAB_TITLE_KEYS.Cosmos;

  // ── Tab definitions ───────────────────────────────────────────────────

  const tabs = [
    {
      id: "Cosmos",
      component: (
        <div className={style["chainListContent"]}>
          <SearchBar
            onSearchTermChange={setCosmosSearchTerm}
            searchTerm={cosmosSearchTerm}
            valuesArray={mainChainList}
            filterFunction={getFilteredChainValues}
            midElement={addCustomButton(
              "/setting/addCosmosChain",
              "Add custom Cosmos network"
            )}
            emptyContent={<NoResults styles={{ height: "200px" }} />}
            renderResult={renderManageCard}
          />
        </div>
      ),
    },
    {
      id: "EVM",
      component: (
        <div className={style["chainListContent"]}>
          <SearchBar
            searchTerm={evmSearchTerm}
            onSearchTermChange={setEvmSearchTerm}
            valuesArray={evmChainList}
            filterFunction={getFilteredChainValues}
            midElement={addCustomButton(
              "/setting/addEvmChain",
              "Add custom EVM network"
            )}
            emptyContent={<NoResults styles={{ height: "200px" }} />}
            renderResult={renderManageCard}
          />
        </div>
      ),
    },
  ];

  // ASI Chain tab
  tabs.push({
    id: "ASI Chain",
    component: (
      <div className={style["chainListContent"]}>
        <SearchBar
          searchTerm={asiChainSearchTerm}
          onSearchTermChange={setASIChainSearchTerm}
          valuesArray={asiChainList}
          filterFunction={getFilteredChainValues}
          midElement={addCustomButton(
            "/setting/addASIChainNetwork",
            "Add custom ASI Chain network"
          )}
          emptyContent={<NoResults styles={{ height: "200px" }} />}
          renderResult={renderManageCard}
        />
      </div>
    ),
  });

  // Cardano tab
  tabs.push({
    id: "Cardano",
    component: (
      <div className={style["chainListContent"]}>
        <SearchBar
          searchTerm={cardanoSearchTerm}
          onSearchTermChange={setCardanoSearchTerm}
          valuesArray={cardanoChainList}
          filterFunction={getFilteredChainValues}
          emptyContent={<NoResults styles={{ height: "200px" }} />}
          renderResult={renderManageCard}
        />
      </div>
    ),
  });

  return (
    <HeaderLayout
      smallTitle={true}
      showTopMenu={true}
      showChainName={false}
      showBottomMenu={false}
      canChangeChainInfo={false}
      alternativeTitle={intl.formatMessage({ id: headerTitleKey })}
      onBackButton={() => {
        navigate("/");
      }}
    >
      <div className={style["chainListContainer"]}>
        <TabsPanel
          onTabChange={(tabId: string) => {
            setSelectedTab(tabId);
            analyticsStore.logEvent(`${tabId.toLowerCase()}_tab_click`, {
              pageName: "Home",
            });
          }}
          tabs={tabs}
        />
      </div>
    </HeaderLayout>
  );
});
