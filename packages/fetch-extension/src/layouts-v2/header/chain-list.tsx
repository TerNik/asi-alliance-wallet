import { ButtonV2 } from "@components-v2/buttons/button";
import { Card } from "@components-v2/card";
import { SearchBar } from "@components-v2/search-bar";
import { TabsPanel } from "@components-v2/tabs/tabsPanel-2";
import { useConfirm } from "@components/confirm";
import { messageAndGroupListenerUnsubscribe } from "@graphQL/messages-api";
import { formatAddress } from "@utils/format";
import {
  walletSupportsCardano,
  filterCosmosChains,
  filterEvmChains,
  filterASIChains,
  filterBetaChains,
  filterCardanoChains,
  excludeTestnets,
} from "@utils/index";
import classnames from "classnames";
import { observer } from "mobx-react-lite";
import React, {
  FunctionComponent,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useStore } from "../../stores";
import style from "./chain-list.module.scss";
import { getFilteredChainValues } from "@utils/filters";
import { NotificationOption } from "@components-v2/notification-option";
import { NoResults } from "@components-v2/no-results";
import { useLoadingIndicator } from "@components/loading-indicator";
import checkIcon from "@assets/svg/wireframe/check.svg";
import closeIcon from "@assets/svg/wireframe/closeImage.svg";

interface ChainListProps {
  showAddress?: boolean;
  setIsSelectNetOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChainList: FunctionComponent<ChainListProps> = observer(
  ({ showAddress, setIsSelectNetOpen }) => {
    const {
      chatStore,
      proposalStore,
      chainStore,
      analyticsStore,
      accountStore,
      keyRingStore,
    } = useStore();

    const [cosmosSearchTerm, setCosmosSearchTerm] = useState("");
    const [evmSearchTerm, setEvmSearchTerm] = useState("");
    const [cardanoSearchTerm, setCardanoSearchTerm] = useState("");
    const [asiChainSearchTerm, setASIChainSearchTerm] = useState("");
    const [clickedChain, setClickedChain] = useState(
      chainStore.current.chainId
    );

    const intl = useIntl();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const loadingIndicator = useLoadingIndicator();

    // ── Chain lists (using centralised filters) ──────────────────────────
    const allChainsInUI = chainStore.chainInfosInUI;

    const mainChainList = filterCosmosChains(allChainsInUI);
    const evmChainList = filterEvmChains(allChainsInUI);
    const asiChainList = filterASIChains(allChainsInUI);
    const betaChainList = filterBetaChains(allChainsInUI);
    const cardanoChainList = filterCardanoChains(allChainsInUI);

    const cosmosList = chainStore.showTestnet
      ? mainChainList
      : excludeTestnets(mainChainList);

    const evmList = chainStore.showTestnet
      ? evmChainList
      : excludeTestnets(evmChainList);

    const cardanoList = chainStore.showTestnet
      ? cardanoChainList
      : excludeTestnets(cardanoChainList);

    const isCardanoSupportedWallet = useMemo(() => {
      const selectedKeyStore = keyRingStore.multiKeyStoreInfo.find(
        (item: any) => item.selected
      );
      return walletSupportsCardano(selectedKeyStore);
    }, [keyRingStore.multiKeyStoreInfo]);

    // ── Pre-computed helpers ─────────────────────────────────────────────

    /** Resolve left image for a chain card (icon URL or first-letter fallback). */
    const getChainIcon = useCallback((chainInfo: any) => {
      if (chainInfo.raw.chainSymbolImageUrl !== undefined) {
        return chainInfo.raw.chainSymbolImageUrl;
      }

      return chainInfo.raw.chainName
        ? chainInfo.raw.chainName[0].toUpperCase()
        : "";
    }, []);

    /** Resolve left image style. */
    const getChainIconStyle = useCallback(
      (chainInfo: any) => ({
        backgroundColor: !chainInfo.raw.chainSymbolImageUrl
          ? "#dddfdf"
          : "transparent",
      }),
      []
    );

    /** Get the formatted bech32 address for display, or null. */
    const getFormattedAddress = useCallback(
      (chainId: string): string | null => {
        if (!showAddress) return null;
        return formatAddress(accountStore.getAccount(chainId).bech32Address);
      },
      [showAddress, accountStore]
    );

    /** Shared chain-select handler for all tabs. */
    const handleChainSelect = useCallback(
      (chainId: string, chainName: string) => {
        setClickedChain(chainId);

        let properties = {};
        if (chainId !== chainStore.current.chainId) {
          properties = {
            chainId: chainStore.current.chainId,
            chainName: chainStore.current.chainName,
            toChainId: chainId,
            toChainName: chainName,
          };
        }

        chainStore.selectChain(chainId);
        chainStore.saveLastViewChainId();
        chatStore.userDetailsStore.resetUser();
        proposalStore.resetProposals();
        chatStore.messagesStore.resetChatList();
        chatStore.messagesStore.setIsChatSubscriptionActive(false);
        messageAndGroupListenerUnsubscribe();

        if (Object.values(properties).length > 0) {
          analyticsStore.logEvent("chain_change_click", properties);
        }

        if (setIsSelectNetOpen) {
          setIsSelectNetOpen(false);
        }
      },
      [chainStore, chatStore, proposalStore, analyticsStore, setIsSelectNetOpen]
    );

    /** Navigate to manage-networks with analytics. */
    const handleManageNetworks = useCallback(
      (e: any) => {
        e.preventDefault();
        analyticsStore.logEvent("manage_networks_click", {
          pageName: "Home",
        });
        navigate("/manage-networks");
      },
      [analyticsStore, navigate]
    );

    // ── Shared render helpers ────────────────────────────────────────────

    const renderManageNetworksButton = () => (
      <ButtonV2
        styleProps={{
          height: "48px",
          marginTop: "0px",
          fontSize: "14px",
        }}
        onClick={handleManageNetworks}
        text={"Manage networks"}
      />
    );

    const renderTestnetToggle = () => (
      <NotificationOption
        name="Show testnet"
        isChecked={chainStore.showTestnet}
        handleOnChange={() =>
          chainStore.toggleShowTestnet(!chainStore.showTestnet)
        }
        cardStyles={{
          background: "transparent",
          padding: "0px",
          marginBottom: "24px",
        }}
      />
    );

    const renderChainCard = useCallback(
      (chainInfo: any, index: number) => {
        const chainId = chainInfo.raw.chainId;
        const chainName = chainInfo.raw.chainName;
        const formattedAddress = getFormattedAddress(chainId);
        const isSelected = clickedChain === chainId;

        return (
          <Card
            key={index}
            leftImage={getChainIcon(chainInfo)}
            heading={chainName}
            isActive={chainId === chainStore.current.chainId}
            leftImageStyle={getChainIconStyle(chainInfo)}
            rightContent={isSelected ? checkIcon : ""}
            onClick={() => handleChainSelect(chainId, chainName)}
            subheading={formattedAddress}
          />
        );
      },
      [
        clickedChain,
        chainStore.current.chainId,
        getChainIcon,
        getChainIconStyle,
        getFormattedAddress,
        handleChainSelect,
      ]
    );

    // ── Tabs ─────────────────────────────────────────────────────────────

    const tabs = [
      {
        id: "Cosmos",
        component: (
          <div className={style["chainTabContent"]}>
            {renderTestnetToggle()}
            <SearchBar
              onSearchTermChange={setCosmosSearchTerm}
              searchTerm={cosmosSearchTerm}
              valuesArray={cosmosList}
              itemsStyleProp={{ height: "100%" }}
              filterFunction={getFilteredChainValues}
              emptyContent={<NoResults styles={{ height: "200px" }} />}
              midElement={renderManageNetworksButton()}
              renderResult={renderChainCard}
            />
            {cosmosSearchTerm === "" && (
              <React.Fragment>
                {betaChainList.length > 0 && (
                  <div className={style["chain-title"]}>Beta support</div>
                )}

                {betaChainList.map((chainInfo: any) => {
                  const chainId = chainInfo.raw.chainId;
                  const chainName = chainInfo.raw.chainName;
                  const formattedAddress = getFormattedAddress(chainId);

                  return (
                    <Card
                      key={chainId}
                      leftImage={getChainIcon(chainInfo)}
                      heading={chainName}
                      isActive={chainId === chainStore.current.chainId}
                      leftImageStyle={getChainIconStyle(chainInfo)}
                      rightContent={closeIcon}
                      rightContentStyle={{ height: "24px", width: "24px" }}
                      rightContentOnClick={async (e: any) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (
                          await confirm.confirm({
                            paragraph: intl.formatMessage(
                              { id: "chain.remove.confirm.paragraph" },
                              { chainName }
                            ),
                          })
                        ) {
                          loadingIndicator.setIsLoading("remove-chain", true);
                          await chainStore.removeChainInfo(chainId);
                          loadingIndicator.setIsLoading("remove-chain", false);
                        }
                      }}
                      onClick={() => handleChainSelect(chainId, chainName)}
                      subheading={formattedAddress}
                    />
                  );
                })}
              </React.Fragment>
            )}

            <a
              href="https://chains.keplr.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "none" }}
            >
              <div
                className={classnames(style["chainName"], style["addChain"])}
              >
                <div>
                  {intl.formatMessage({ id: "main.suggest.chain.link" })}
                </div>
              </div>
            </a>
          </div>
        ),
      },
      {
        id: "EVM",
        component: (
          <div className={style["chainTabContent"]}>
            {renderTestnetToggle()}
            <SearchBar
              searchTerm={evmSearchTerm}
              onSearchTermChange={setEvmSearchTerm}
              valuesArray={evmList}
              itemsStyleProp={{ height: "100%" }}
              filterFunction={getFilteredChainValues}
              emptyContent={<NoResults styles={{ height: "200px" }} />}
              midElement={renderManageNetworksButton()}
              renderResult={renderChainCard}
            />
          </div>
        ),
      },
    ];

    // ASI Chain tab – no testnet toggle (no testnet distinction for ASI yet)
    tabs.push({
      id: "ASI Chain",
      component: (
        <div className={style["chainTabContent"]}>
          <SearchBar
            searchTerm={asiChainSearchTerm}
            onSearchTermChange={setASIChainSearchTerm}
            valuesArray={asiChainList}
            itemsStyleProp={{ height: "100%" }}
            filterFunction={getFilteredChainValues}
            emptyContent={<NoResults styles={{ height: "200px" }} />}
            midElement={renderManageNetworksButton()}
            renderResult={renderChainCard}
          />
        </div>
      ),
    });

    // Cardano tab
    tabs.push({
      id: "Cardano",
      component: (
        <div className={style["chainTabContent"]}>
          {isCardanoSupportedWallet ? (
            <React.Fragment>
              {renderTestnetToggle()}
              <SearchBar
                searchTerm={cardanoSearchTerm}
                onSearchTermChange={setCardanoSearchTerm}
                valuesArray={cardanoList}
                itemsStyleProp={{ height: "100%" }}
                filterFunction={getFilteredChainValues}
                emptyContent={<NoResults styles={{ height: "200px" }} />}
                midElement={renderManageNetworksButton()}
                renderResult={renderChainCard}
              />
            </React.Fragment>
          ) : (
            <div className={style["unsupported-message"]}>
              <div className={style["message-text"]}>
                Cardano networks are not supported with this seed phrase length
              </div>
              <div className={style["message-subtitle"]}>
                Please use a 24-word seed phrase to access Cardano networks
              </div>
            </div>
          )}
        </div>
      ),
    });

    return (
      <div className={style["chainListContainer"]}>
        <TabsPanel
          tabs={tabs}
          onTabChange={(tabId: string) => {
            analyticsStore.logEvent(`${tabId.toLowerCase()}_tab_click`, {
              pageName: "Home",
            });
          }}
        />
      </div>
    );
  }
);
