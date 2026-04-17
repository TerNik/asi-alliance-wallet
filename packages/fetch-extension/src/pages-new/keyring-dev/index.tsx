import React, {
  Dispatch,
  SetStateAction,
  FunctionComponent,
  useState,
  useEffect,
  useRef,
  useMemo,
  Fragment,
} from "react";

import keyringStyle from "./style.module.scss";

import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";

import { useLoadingIndicator } from "@components/loading-indicator";
import { messageAndGroupListenerUnsubscribe } from "@graphQL/messages-api";
import { Card } from "@components-v2/card";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { formatAddress } from "@utils/format";
import { CHAIN_ID_FETCHHUB } from "../../config.ui.var";
import { isCardanoChain, walletSupportsCardano } from "../../utils";
import { InExtensionMessageRequester } from "@keplr-wallet/router-extension";
import { BACKGROUND_PORT } from "@keplr-wallet/router";
import {
  ListAccountsMsg,
  MultiKeyStoreInfoWithSelectedElem,
} from "@keplr-wallet/background";
import { Skeleton } from "@components-v2/skeleton-loader";
import {
  normalizeCacheData,
  mergePartialCacheData,
  hasRequiredAddresses,
} from "@utils/cache-validation";
import { addressCacheStore } from "@utils/address-cache-store";
// import { App, AppCoinType } from "@keplr-wallet/ledger-cosmos";

interface SetKeyRingProps {
  navigateTo?: any;
  onItemSelect?: () => void;
  setIsOptionsOpen?: Dispatch<SetStateAction<boolean>>;
  setIsSelectWalletOpen?: Dispatch<SetStateAction<boolean>>;
}

interface WalletCardHeadingProps {
  accountName: string;
  optionIcon?: string;
}

interface WalletCardRightContentProps {
  isSelected: boolean;
  onEditClick: () => void;
}

interface WalletCardSubheadingProps {
  isSelected: boolean;
  isCardanoNetwork: boolean;
  isCardanoSupportedWallet: boolean;
  isLoadingAddresses: boolean;
  walletId: string;
  addressesById: Record<string, string>;
  accountInfo: any;
  chainStore: any;
}

interface WalletCardItemProps {
  keyStore: MultiKeyStoreInfoWithSelectedElem;
  index: number;
  nameByChainOverride: Record<string, string>;
  isCardanoNetwork: boolean;
  addressesById: Record<string, string>;
  isLoadingAddresses: boolean;
  accountInfo: any;
  chainStore: any;
  onCardClick: (
    e: any,
    keyStore: MultiKeyStoreInfoWithSelectedElem,
    index: number
  ) => void;
  onEditClick: () => void;
  intl: any;
}

const getAccountName = (
  keyStore: MultiKeyStoreInfoWithSelectedElem,
  chainId: string,
  nameByChainOverride: Record<string, string>,
  intl: any
): string => {
  return (
    nameByChainOverride[chainId] ||
    keyStore.meta?.["name"] ||
    intl.formatMessage({
      id: "setting.keyring.unnamed-account",
    })
  );
};

const getIsClickable = (
  keyStore: MultiKeyStoreInfoWithSelectedElem,
  isCardanoNetwork: boolean,
  isCardanoSupportedWallet: boolean,
  addressesById: Record<string, string>
): boolean => {
  if (keyStore.selected) {
    return false;
  }

  if (!isCardanoNetwork) {
    return true;
  }

  const walletId = keyStore.meta?.["__id__"] || "";
  const hasAddressForWallet = Boolean(addressesById[walletId]);

  return isCardanoSupportedWallet && hasAddressForWallet;
};

const WalletCardItem: React.FC<WalletCardItemProps> = ({
  keyStore,
  index,
  nameByChainOverride,
  isCardanoNetwork,
  addressesById,
  isLoadingAddresses,
  accountInfo,
  chainStore,
  onCardClick,
  onEditClick,
  intl,
}) => {
  const accountName = useMemo(
    () =>
      getAccountName(
        keyStore,
        chainStore.current.chainId,
        nameByChainOverride,
        intl
      ),
    [keyStore, chainStore, nameByChainOverride, intl]
  );

  const isCardanoSupportedWallet = useMemo(
    () => walletSupportsCardano(keyStore),
    [keyStore]
  );

  const isClickable = useMemo(
    () =>
      getIsClickable(
        keyStore,
        isCardanoNetwork,
        isCardanoSupportedWallet,
        addressesById
      ),
    [keyStore, isCardanoNetwork, isCardanoSupportedWallet, addressesById]
  );

  const optionIcon = useMemo(() => getOptionIcon(keyStore), [keyStore]);

  const cardPadding = useMemo(
    () => (keyStore.selected ? "18px 18px" : "18px 16px"),
    [keyStore.selected]
  );

  const cardOpacity = useMemo(
    () => (isCardanoNetwork && !isCardanoSupportedWallet ? 0.6 : undefined),
    [isCardanoNetwork, isCardanoSupportedWallet]
  );

  const walletId = useMemo(() => keyStore.meta?.["__id__"] || "", [keyStore]);

  return (
    <Card
      key={keyStore.meta?.["__id__"] || index}
      heading={
        <WalletCardHeading accountName={accountName} optionIcon={optionIcon} />
      }
      rightContent={
        <WalletCardRightContent
          isSelected={keyStore.selected}
          onEditClick={onEditClick}
        />
      }
      subheading={
        <WalletCardSubheading
          isSelected={keyStore.selected}
          isCardanoNetwork={isCardanoNetwork}
          isCardanoSupportedWallet={isCardanoSupportedWallet}
          isLoadingAddresses={isLoadingAddresses}
          walletId={walletId}
          addressesById={addressesById}
          accountInfo={accountInfo}
          chainStore={chainStore}
        />
      }
      style={{
        padding: cardPadding,
        cursor: isClickable ? undefined : "default",
        opacity: cardOpacity,
      }}
      isActive={keyStore.selected}
      onClick={
        keyStore.selected || !isClickable
          ? undefined
          : (e: any) => onCardClick(e, keyStore, index)
      }
    />
  );
};

// const getWalletParagraph = (
//   keyStore: MultiKeyStoreInfoWithSelectedElem
// ): string | undefined => {
//   if (keyStore.meta?.["email"]) {
//     return keyStore.meta["email"];
//   }

//   if (keyStore.type === "keystone") {
//     return "Keystone";
//   }

//   if (keyStore.type === "ledger") {
//     const bip44HDPath = keyStore.bip44HDPath || {
//       account: 0,
//       change: 0,
//       addressIndex: 0,
//     };

//     const coinType = (() => {
//       if (
//         keyStore.meta?.["__ledger__cosmos_app_like__"] &&
//         keyStore.meta["__ledger__cosmos_app_like__"] !== "Cosmos"
//       ) {
//         return (
//           AppCoinType[keyStore.meta["__ledger__cosmos_app_like__"] as App] ||
//           118
//         );
//       }
//       return 118;
//     })();

//     let paragraph = `Ledger - m/44'/${coinType}'/${bip44HDPath.account}'${
//       bip44HDPath.change !== 0 || bip44HDPath.addressIndex !== 0
//         ? `/${bip44HDPath.change}/${bip44HDPath.addressIndex}`
//         : ""
//     }`;

//     if (
//       keyStore.meta?.["__ledger__cosmos_app_like__"] &&
//       keyStore.meta["__ledger__cosmos_app_like__"] !== "Cosmos"
//     ) {
//       paragraph += ` (${keyStore.meta["__ledger__cosmos_app_like__"]})`;
//     }

//     return paragraph;
//   }

//   return undefined;
// };

const getOptionIcon = (keyStore: any): string | undefined => {
  if (keyStore.type === "ledger") {
    return require("@assets/svg/wireframe/ledger-indicator.svg");
  }

  if (keyStore.type === "privateKey") {
    if (keyStore.meta?.["email"] && keyStore.meta?.["socialType"] === "apple") {
      return require("@assets/svg/wireframe/apple-logo.svg");
    }

    if (
      keyStore.meta?.["email"] &&
      keyStore.meta?.["socialType"] === "google"
    ) {
      return require("@assets/svg/wireframe/google-logo.svg");
    }
  }

  return undefined;
};

const WalletCardHeading: React.FC<WalletCardHeadingProps> = ({
  accountName,
  optionIcon,
}) => {
  return (
    <React.Fragment>
      {accountName}
      {optionIcon && (
        <span className={keyringStyle["rightIconContainer"]}>
          <img
            src={optionIcon}
            alt="Right Section"
            className={keyringStyle["rightIcon"]}
          />
        </span>
      )}
    </React.Fragment>
  );
};

const WalletCardRightContent: React.FC<WalletCardRightContentProps> = ({
  isSelected,
  onEditClick,
}) => {
  if (!isSelected) {
    return null;
  }

  return (
    <div className={keyringStyle["rightContentContainer"]}>
      <img
        className={keyringStyle["checkIcon"]}
        src={require("@assets/svg/wireframe/check.svg")}
        alt=""
      />
      <img
        className={keyringStyle["editIcon"]}
        onClick={onEditClick}
        src={require("@assets/svg/edit-icon.svg")}
        alt=""
      />
    </div>
  );
};

const WalletCardSubheading: React.FC<WalletCardSubheadingProps> = ({
  isSelected,
  isCardanoNetwork,
  isCardanoSupportedWallet,
  isLoadingAddresses,
  walletId,
  addressesById,
  accountInfo,
  chainStore,
}) => {
  if (isSelected) {
    const isEvm = chainStore.current.features?.includes("evm") ?? false;
    const addr = isEvm
      ? (accountInfo as any).ethereumHexAddress || accountInfo.bech32Address
      : accountInfo.bech32Address;
    return <Fragment>{formatAddress(addr)}</Fragment>;
  }

  if (addressesById[walletId]) {
    return <Fragment>{formatAddress(addressesById[walletId])}</Fragment>;
  }

  if (isCardanoNetwork && !isCardanoSupportedWallet) {
    return <Fragment>Not supported on Cardano</Fragment>;
  }

  if (isLoadingAddresses) {
    return <Skeleton height="14px" width="120px" />;
  }

  if (isCardanoNetwork) {
    return <Fragment>Not supported on Cardano</Fragment>;
  }

  return null;
};

export const SetKeyRingPage: FunctionComponent<SetKeyRingProps> = observer(
  ({ navigateTo, onItemSelect, setIsOptionsOpen, setIsSelectWalletOpen }) => {
    const intl = useIntl();
    const navigate = useNavigate();
    const {
      chainStore,
      accountStore,
      keyRingStore,
      analyticsStore,
      chatStore,
      proposalStore,
    } = useStore();

    const accountInfo = accountStore.getAccount(chainStore.current.chainId);
    const loadingIndicator = useLoadingIndicator();
    const [addressesById, setAddressesById] = useState<Record<string, string>>(
      {}
    );
    const [isLoadingAddresses, setIsLoadingAddresses] =
      useState<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isLoadingRef = useRef<boolean>(false);

    const currentWalletIds = React.useMemo(
      () =>
        keyRingStore.multiKeyStoreInfo.map((ks) => ks.meta?.["__id__"] || ""),
      [keyRingStore.multiKeyStoreInfo]
    );

    const handleWalletClick = async (
      e: any,
      keyStore: MultiKeyStoreInfoWithSelectedElem,
      index: number
    ) => {
      e.preventDefault();
      loadingIndicator.setIsLoading("keyring", true);

      try {
        await keyRingStore.changeKeyRing(index);
        analyticsStore.logEvent("change_wallet_click");

        const isCardanoSupportedWallet = walletSupportsCardano(keyStore);
        const isCurrentChainCardano = isCardanoChain(chainStore.current);

        if (isCurrentChainCardano && !isCardanoSupportedWallet) {
          chainStore.selectChain(CHAIN_ID_FETCHHUB);
          chainStore.saveLastViewChainId();
        }

        loadingIndicator.setIsLoading("keyring", false);
        chatStore.userDetailsStore.resetUser();
        proposalStore.resetProposals();
        chatStore.messagesStore.resetChatList();
        chatStore.messagesStore.setIsChatSubscriptionActive(false);
        messageAndGroupListenerUnsubscribe();
        navigate(navigateTo);
        onItemSelect?.();
      } catch (e: any) {
        console.warn(`Failed to change keyring: ${e.message}`);
        loadingIndicator.setIsLoading("keyring", false);
      }
    };

    const getAllWalletAddresses = React.useCallback(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      const currentChainId = chainStore.current.chainId;

      try {
        const existingCache = addressCacheStore.getCache(currentChainId);
        const hasAnyCachedAddress =
          Object.keys(existingCache).length > 0 &&
          Object.values(existingCache).some((addr) => Boolean(addr));
        setAddressesById(existingCache);

        const isCurrentChainCardano = isCardanoChain(
          chainStore.getChain(currentChainId)
        );

        const requiredWalletIds: string[] = isCurrentChainCardano
          ? keyRingStore.multiKeyStoreInfo
              .filter((ks) => walletSupportsCardano(ks))
              .map((ks) => ks.meta?.["__id__"] || "")
          : currentWalletIds;

        const shouldSyncFromBackend =
          Object.keys(existingCache).length === 0 ||
          !hasRequiredAddresses(existingCache, requiredWalletIds);

        if (!shouldSyncFromBackend) {
          isLoadingRef.current = false;
          setIsLoadingAddresses(false);
          return;
        }

        setIsLoadingAddresses(!hasAnyCachedAddress);
        const requester = new InExtensionMessageRequester();

        const msg = new ListAccountsMsg();
        const accounts = await requester.sendMessage(BACKGROUND_PORT, msg);

        const isEvm = chainStore.current.features?.includes("evm") ?? false;
        const snapshotWalletIds = [...currentWalletIds];

        const fetchedById: Record<string, string> = {};
        snapshotWalletIds.forEach((id, idx) => {
          const acc = accounts[idx];
          fetchedById[id] = acc
            ? isEvm
              ? acc.EVMAddress
              : acc.bech32Address
            : "";
        });

        await addressCacheStore.atomicCacheUpdate(
          currentChainId,
          (currentCache) => {
            const normalizedCache = normalizeCacheData(
              currentCache,
              snapshotWalletIds
            );
            const fetchedAddresses = snapshotWalletIds.map(
              (id) => fetchedById[id] || ""
            );
            const mergedCache = mergePartialCacheData(
              normalizedCache,
              snapshotWalletIds,
              fetchedAddresses
            );

            return {
              newCache: mergedCache,
              result: mergedCache,
            };
          }
        );

        const syncedCache = addressCacheStore.getCache(currentChainId);
        setAddressesById(syncedCache);

        isLoadingRef.current = false;
        setIsLoadingAddresses(false);
      } catch (error) {
        if (error.name === "AbortError") {
          isLoadingRef.current = false;
          setIsLoadingAddresses(false);
          return;
        }

        console.warn(
          "Failed to fetch addresses, keeping cached values:",
          error
        );

        isLoadingRef.current = false;
        setIsLoadingAddresses(false);
      }
    }, [chainStore, currentWalletIds, keyRingStore.multiKeyStoreInfo]);

    const walletIdsKey = currentWalletIds.join(",");

    useEffect(() => {
      let isMounted = true;

      const loadAddresses = async () => {
        if (isMounted) {
          await getAllWalletAddresses();
        }
      };

      loadAddresses();

      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainStore.current.chainId, walletIdsKey]);

    return (
      <div>
        {keyRingStore.multiKeyStoreInfo.map(
          (keyStore: MultiKeyStoreInfoWithSelectedElem, i: number) => {
            const nameByChain = keyStore.meta?.["nameByChain"]
              ? JSON.parse(keyStore.meta["nameByChain"])
              : {};

            const isCardanoNetwork = isCardanoChain(chainStore.current);

            return (
              <WalletCardItem
                key={keyStore.meta?.["__id__"] || i}
                keyStore={keyStore}
                index={i}
                nameByChainOverride={nameByChain}
                isCardanoNetwork={isCardanoNetwork}
                addressesById={addressesById}
                isLoadingAddresses={isLoadingAddresses}
                accountInfo={accountInfo}
                chainStore={chainStore}
                onCardClick={handleWalletClick}
                onEditClick={() => {
                  setIsSelectWalletOpen?.(false);
                  setIsOptionsOpen?.(true);
                }}
                intl={intl}
              />
            );
          }
        )}
      </div>
    );
  }
);
