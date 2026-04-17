import { useNotification } from "@components/notification";
import { WalletStatus } from "@keplr-wallet/stores";
import { formatAddress, separateNumericAndDenom } from "@utils/format";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { Button } from "reactstrap";
import { useStore } from "../../../stores";
import { addressCacheStore } from "../../../utils/address-cache-store";
import { isASIChain as isASIChainPredicate } from "@keplr-wallet/asi-chain";
import { Balances } from "../balances";
import style from "../style.module.scss";
import { WalletConfig } from "@keplr-wallet/stores/build/chat/user-details";
import { observer } from "mobx-react-lite";
import { fetchProposalNodes } from "../../activity/utils";
import { WalletContent } from "./wallet-content";
import { PendingTransactions } from "./pending-transactions";
import { RewardsCard } from "./rewards-card";
import { Skeleton } from "@components-v2/skeleton-loader";
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";

export const WalletDetailsView = observer(
  ({
    setIsSelectNetOpen,
    setIsSelectWalletOpen,
    tokenState,
  }: {
    setIsSelectNetOpen: any;
    setIsSelectWalletOpen?: any;
    tokenState: any;
  }) => {
    const {
      keyRingStore,
      chatStore,
      accountStore,
      chainStore,
      queriesStore,
      uiConfigStore,
      activityStore,
      analyticsStore,
    } = useStore();
    const userState = chatStore.userDetailsStore;

    const { hasFET, enabledChainIds } = userState;
    const config: WalletConfig = userState.walletConfig;
    const current = chainStore.current;
    const [chatTooltip, setChatTooltip] = useState("");
    const [chatDisabled, setChatDisabled] = useState(false);
    const outerDivRef = useRef<HTMLDivElement>(null);
    const outerDivRefEvm = useRef<HTMLDivElement>(null);

    const [currentTxnType, setCurrentTxnType] = useState<string>("");

    useEffect(() => {
      if (keyRingStore.keyRingType === "ledger") {
        setChatTooltip("Coming soon for ledger");
        setChatDisabled(true);

        return;
      }

      if (config.requiredNative && !hasFET) {
        setChatTooltip("You need to have FET balance to use this feature");
        setChatDisabled(true);

        return;
      } else {
        setChatTooltip("");
        setChatDisabled(false);
      }

      if (!enabledChainIds.includes(current.chainId)) {
        setChatDisabled(true);
        setChatTooltip("Feature not available on this network");

        return;
      }

      if (!chatDisabled && chatTooltip === "") {
        setChatDisabled(true);
        setChatTooltip("Feature coming soon.");
      }
    }, [
      hasFET,
      enabledChainIds,
      config.requiredNative,
      keyRingStore.keyRingType,
      current.chainId,
      chatDisabled,
      chatTooltip,
    ]);

    const navigate = useNavigate();
    const accountInfo = accountStore.getAccount(chainStore.current.chainId);

    const icnsPrimaryName = (() => {
      if (
        uiConfigStore.icnsInfo &&
        chainStore.hasChain(uiConfigStore.icnsInfo.chainId)
      ) {
        const queries = queriesStore.get(uiConfigStore.icnsInfo.chainId);
        const icnsQuery = queries.icns.queryICNSNames.getQueryContract(
          uiConfigStore.icnsInfo.resolverContractAddress,
          accountStore.getAccount(chainStore.current.chainId).bech32Address
        );

        return icnsQuery.primaryName;
      }
    })();

    const intl = useIntl();
    const notification = useNotification();

    const isEvm = chainStore.current.features?.includes("evm") ?? false;
    const isASIChain = isASIChainPredicate(chainStore.current);
    const selectedKeyStore = keyRingStore.multiKeyStoreInfo.find(
      (ks) => ks.selected
    );
    const selectedWalletId = selectedKeyStore?.meta?.["__id__"] || "";
    const cachedSelectedAddress =
      selectedWalletId && chainStore.current.chainId
        ? addressCacheStore.getCache(chainStore.current.chainId)[
            selectedWalletId
          ] || ""
        : "";
    const asiChainAddress =
      (isASIChain && selectedKeyStore?.meta?.["asiChainAddress"]) || "";
    const displayAccountName = (() => {
      const meta = selectedKeyStore?.meta;
      if (!meta) return "";
      try {
        const nameByChain = meta["nameByChain"]
          ? JSON.parse(meta["nameByChain"])
          : {};
        return (
          nameByChain?.[chainStore.current.chainId] ||
          meta["name"] ||
          intl.formatMessage({ id: "setting.keyring.unnamed-account" })
        );
      } catch {
        return (
          meta["name"] ||
          intl.formatMessage({ id: "setting.keyring.unnamed-account" })
        );
      }
    })();

    const displayBech32Address =
      accountInfo.walletStatus === WalletStatus.Loaded
        ? accountInfo.bech32Address
        : cachedSelectedAddress;

    const displayEvmAddress =
      isEvm || accountInfo.hasEthereumHexAddress
        ? accountInfo.walletStatus === WalletStatus.Loaded
          ? accountInfo.ethereumHexAddress
          : cachedSelectedAddress || accountInfo.ethereumHexAddress
        : "";

    const copyAddress = useCallback(
      async (address: string) => {
        if (accountInfo.walletStatus === WalletStatus.Loaded) {
          await navigator.clipboard.writeText(address);
          notification.push({
            placement: "top-center",
            type: "success",
            duration: 2,
            content: intl.formatMessage({
              id: "main.address.copied",
            }),
            canDelete: true,
            transition: {
              duration: 0.25,
            },
          });
        }
      },
      [accountInfo.walletStatus, notification, intl]
    );

    const effectiveAddress = isASIChain
      ? asiChainAddress
      : accountInfo.bech32Address;

    const accountOrChainChanged =
      activityStore.getAddress !== effectiveAddress ||
      activityStore.getChainId !== current.chainId;

    const loadProposalNodesIfEmpty = useCallback(async () => {
      const nodes = activityStore.sortedNodesProposals;
      if (!nodes?.length) {
        const fetchedNodes = await fetchProposalNodes(
          "",
          current.chainId,
          effectiveAddress
        );

        if (fetchedNodes.length) {
          fetchedNodes.forEach((node: any) =>
            activityStore.addProposalNode(node)
          );
        }
      }
    }, [activityStore, current.chainId, effectiveAddress]);

    useEffect(() => {
      if (!isEvm && !isASIChain) {
        const timeout = setTimeout(loadProposalNodesIfEmpty, 100);

        return () => {
          clearTimeout(timeout);
        };
      }
    }, [
      effectiveAddress,
      current.chainId,
      accountOrChainChanged,
      activityStore,
      isEvm,
      isASIChain,
      loadProposalNodesIfEmpty,
    ]);

    useEffect(() => {
      if (accountOrChainChanged) {
        activityStore.setAddress(effectiveAddress);
        activityStore.setChainId(current.chainId);
      }

      if (effectiveAddress !== "" && !isEvm && !isASIChain) {
        activityStore.accountInit();
      }
    }, [
      effectiveAddress,
      current.chainId,
      accountOrChainChanged,
      activityStore,
      isEvm,
      isASIChain,
    ]);

    useEffect(() => {
      if (Object.values(activityStore.getPendingTxn).length > 0) {
        const txns: any = Object.values(activityStore.getPendingTxn);
        setCurrentTxnType(txns[0].type);
      }
    }, [activityStore.getPendingTxn]);

    const queries = queriesStore.get(current.chainId);

    const rewards = !isASIChain
      ? queries.cosmos.queryRewards.getQueryBech32Address(
          accountInfo.bech32Address
        )
      : undefined;

    const stakableReward = rewards?.stakableReward;
    const rewardsBal = stakableReward?.toString() ?? "0";

    const { numericPart: rewardsBalNumber } =
      separateNumericAndDenom(rewardsBal);

    const getDisplayName = useMemo(() => {
      if (accountInfo.walletStatus === WalletStatus.Loaded) {
        if (icnsPrimaryName) {
          return icnsPrimaryName;
        }

        if (accountInfo.name) {
          return accountInfo.name;
        }

        return intl.formatMessage({
          id: "setting.keyring.unnamed-account",
        });
      }

      if (accountInfo.walletStatus === WalletStatus.Rejected) {
        return "Unable to Load Key";
      }

      if (displayAccountName) {
        return displayAccountName;
      }

      return <Skeleton height="21px" />;
    }, [
      accountInfo.walletStatus,
      icnsPrimaryName,
      accountInfo.name,
      intl,
      displayAccountName,
    ]);

    return (
      <div>
        <div className={style["header-container"]}>
          <button
            onClick={() => {
              setIsSelectNetOpen(true);
            }}
            className={style["chain-select"]}
          >
            {formatAddress(current.chainName)}
            <img
              src={require("@assets/svg/wireframe/chevron-down.svg")}
              alt=""
            />
          </button>
        </div>
        <div className={style["wallet-detail-card"]}>
          <div
            className={
              accountInfo.walletStatus === WalletStatus.Rejected
                ? style["wallet-container-rejected"]
                : style["wallet-container"]
            }
          >
            <div className={style["wallet-address"]}>{getDisplayName}</div>
            <WalletContent
              walletStatus={accountInfo.walletStatus}
              rejectionReason={accountInfo.rejectionReason}
              isASIChain={isASIChain}
              isEvm={isEvm}
              asiChainAddress={asiChainAddress}
              displayBech32Address={displayBech32Address}
              displayEvmAddress={displayEvmAddress}
              onCopy={copyAddress}
              outerDivRef={outerDivRef}
              outerDivRefEvm={outerDivRefEvm}
            />
          </div>
          <Button
            onClick={() => {
              setIsSelectWalletOpen(true);
              analyticsStore.logEvent("change_wallet_click", {
                pageName: "Home",
              });
            }}
            className={style["change-net"]}
          >
            <img
              style={{ width: "14px", height: "16px" }}
              src={require("@assets/svg/wireframe/chevron-down.svg")}
              alt=""
            />
          </Button>
        </div>
        {icnsPrimaryName && (
          <div className={style["icns-mark-container"]}>
            <img
              className={style["icns-mark-image"]}
              src={require("../../../public/assets/img/icns-mark.png")}
              alt="icns-registered"
            />
          </div>
        )}

        {Object.values(activityStore.getPendingTxn).length > 0 && (
          <PendingTransactions
            pendingTxns={activityStore.getPendingTxn}
            currentTxnType={currentTxnType}
          />
        )}

        <RewardsCard
          rewardsBalance={rewardsBalNumber}
          onNavigate={() => {
            analyticsStore.logEvent("claim_all_staking_reward_click", {
              pageName: "Home",
            });
            navigate("/stake");
          }}
        />

        <Balances tokenState={tokenState} />
      </div>
    );
  }
);
