import { NameAddress } from "@chatTypes";
import {
  CHAIN_ID_DORADO,
  CHAIN_ID_FETCHHUB,
  CHAIN_ID_GEMINI,
  CHAIN_ID_LOCAL_TEST_NETWORK,
  CHAIN_ID_REMOTE_TEST_NETWORK,
  EXPLORER_URL,
  GEMINI_EXPLORER_URL,
} from "../config.ui.var";
import { formatAddress } from "./format";
import { GroupEvent } from "./group-events";
import {
  MultiKeyStoreInfoWithSelected,
  walletShouldLeaveCardanoChain,
  walletSupportsCardano,
} from "@keplr-wallet/background";
export { isCardanoChain } from "./is-cardano-chain";

export {
  ensureCompatibleChainForUpcomingWallet,
  ensureChainCompatibleBeforeSelectKeyStore,
  type ChainStoreForCardanoAwaitableSwitch,
} from "./cardano-awaitable-alignment";

export { walletShouldLeaveCardanoChain, walletSupportsCardano };

export {
  requestKeyringSurfacesSyncBroadcast,
  syncKeyringSurfacesFromBackground,
  KEYRING_SURFACES_SYNC_MESSAGE_TYPE,
} from "./keyring-surfaces-sync";
import { RegisterMode } from "@keplr-wallet/hooks";

/** Pre-keystore UI: word count that will yield Cardano-capable mnemonic after import (matches persisted `mnemonicLength` / `walletSupportsCardano`). */
export function supportsCardanoFromMnemonicWordCount(
  wordCount: number
): boolean {
  return wordCount === 24;
}

// translate the contact address into the address book name if it exists
export function getUserName(
  walletAddress: string,
  addressBook: NameAddress,
  address: string
): string {
  if (walletAddress === address) {
    return "You";
  }

  const contactAddressBookName = addressBook[address];
  return contactAddressBookName
    ? formatAddress(contactAddressBookName)
    : formatAddress(address);
}

export function getEventMessage(
  walletAddress: string,
  addressBook: NameAddress,
  message: string
): string {
  let data: GroupEvent = { action: "NA", message: "Event cant be translated" };
  try {
    data = JSON.parse(message);
  } catch (e) {
    console.log("Older group evnet cant be translated");
  }

  let eventMessage = data.message;
  if (data.createdBy) {
    eventMessage = eventMessage.replace(
      "[createdBy]",
      getUserName(walletAddress, addressBook, data.createdBy)
    );
  }
  if (data.performedOn) {
    let address = data.performedOn;
    if (address.includes(",")) {
      const addresses = address.split(",");
      const updatedAddresses = addresses.map((address) =>
        getUserName(walletAddress, addressBook, address)
      );
      address = updatedAddresses.join(",");
    } else address = getUserName(walletAddress, addressBook, address);
    eventMessage = eventMessage.replace("[performedOn]", address);
  }

  return eventMessage;
}

export const validateWalletName = (
  value: string,
  multiKeyStoreInfo: MultiKeyStoreInfoWithSelected,
  registerConfigMode?: RegisterMode
) => {
  const alreadyImportedWalletNames = [
    ...new Set(
      multiKeyStoreInfo?.flatMap((item) => {
        const defaultName = item?.meta?.["name"];
        const chainNames = item?.meta?.["nameByChain"]
          ? Object.values(JSON.parse(item?.meta?.["nameByChain"]))
          : [];
        return [defaultName, ...chainNames].filter(Boolean);
      }) ?? []
    ),
  ];

  let nameAlreadyExists = false;

  // if create mode then wallet list is empty
  if (!registerConfigMode || registerConfigMode !== "create") {
    nameAlreadyExists = alreadyImportedWalletNames.includes(value);
  }

  // Allow only alphanumeric and basic symbols
  const allowedPattern = /^[a-zA-Z0-9 @_\-\.\(\)]*$/;
  const isValidFormat = allowedPattern.test(value);

  const containsLetterOrNumber = /[a-zA-Z0-9]/.test(value);

  return {
    isValidFormat,
    nameAlreadyExists,
    containsLetterOrNumber,
    isValid: isValidFormat && !nameAlreadyExists && containsLetterOrNumber,
  };
};

export const getNextDefaultAccountName = (
  items: MultiKeyStoreInfoWithSelected,
  prefix = "account"
) => {
  if (items.length === 0) {
    return `${prefix}-1`;
  }

  const lastName = items[items.length - 1]?.meta?.["name"] || "";
  const match = lastName.match(new RegExp(`^${prefix}-(\\d+)$`));
  const lastNum = match ? Number(match[1]) : 0;

  return `${prefix}-${lastNum + 1}`;
};

export const validateAccountName = (
  value: string,
  multiKeyStoreInfo: MultiKeyStoreInfoWithSelected,
  mode: RegisterMode
): string | undefined => {
  const trimmedValue = value.trimStart();
  const isEmpty = trimmedValue === "";
  const { isValid, isValidFormat, containsLetterOrNumber } = validateWalletName(
    trimmedValue,
    multiKeyStoreInfo,
    mode
  );

  if (!isValid || isEmpty) {
    if (!isValidFormat) {
      return "Only letters, numbers and basic symbols (_-.@#()) are allowed.";
    }

    if (isEmpty) {
      return "Account name cannot be empty";
    }

    if (!containsLetterOrNumber) {
      return "Account name must contain at least one letter or number.";
    }

    return "Account name already exists, please try different name";
  }
};

export function isFeatureAvailable(chainId: string): boolean {
  return [
    CHAIN_ID_FETCHHUB,
    CHAIN_ID_DORADO,
    CHAIN_ID_LOCAL_TEST_NETWORK,
    CHAIN_ID_REMOTE_TEST_NETWORK,
    CHAIN_ID_GEMINI,
  ].includes(chainId);
}

export const checkWebSocket = (
  url: string,
  timeout = 5000
): Promise<boolean> => {
  return new Promise((resolve) => {
    let socket: WebSocket;
    let settled = false;

    try {
      socket = new WebSocket(url);
    } catch (e) {
      return resolve(false);
    }

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.close();
        resolve(false);
      }
    }, timeout);

    socket.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      resolve(true);
    };

    socket.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(false);
    };
  });
};

export function toWssUrl(input: string): string {
  if (!input) return "";

  const stripped = input
    .trim()
    .replace(/^(https?:\/\/|wss?:\/\/)/i, "")
    .replace(/\/+$/, "");

  return `wss://${stripped}/websocket`;
}

export const explorerBaseURL = (chainId: string) => {
  if (chainId === CHAIN_ID_GEMINI) {
    return GEMINI_EXPLORER_URL;
  } else if (chainId === CHAIN_ID_DORADO || chainId === CHAIN_ID_FETCHHUB) {
    return `${EXPLORER_URL}/${chainId}`;
  }
};

// ── Centralised chain-list filters ──────────────────────────────────────────
// Every component that splits chains by network type should use these instead
// of writing inline `.filter()` calls.

/** Feature flag used to identify ASI Chain networks. */
export const ASI_CHAIN_FEATURE = "asi-chain";

const hasFeature = (chain: any, feature: string): boolean => {
  const features = chain.raw?.features ?? chain.features;
  return features?.includes(feature) ?? false;
};

/** Cosmos chains – excludes EVM, Cardano, ASI-Chain and beta chains. */
export const filterCosmosChains = (chains: any[]): any[] =>
  chains.filter(
    (c) =>
      !(c.raw?.beta ?? c.beta) &&
      !hasFeature(c, "evm") &&
      !hasFeature(c, "cardano") &&
      !hasFeature(c, ASI_CHAIN_FEATURE)
  );

/** EVM chains. */
export const filterEvmChains = (chains: any[]): any[] =>
  chains.filter((c) => hasFeature(c, "evm"));

/** Cardano chains. */
export const filterCardanoChains = (chains: any[]): any[] =>
  chains.filter((c) => hasFeature(c, "cardano"));

/** ASI Chain networks. */
export const filterASIChains = (chains: any[]): any[] =>
  chains.filter((c) => hasFeature(c, ASI_CHAIN_FEATURE));

/** Beta chains. */
export const filterBetaChains = (chains: any[]): any[] =>
  chains.filter((c) => c.raw?.beta ?? c.beta);

/** Exclude testnet chains. */
export const excludeTestnets = (chains: any[]): any[] =>
  chains.filter((c) => (c.raw?.type ?? c.type) !== "testnet");
