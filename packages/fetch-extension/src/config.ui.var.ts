import { IntlMessages } from "./languages";
import { RegisterOption } from "@keplr-wallet/hooks";
import sendTokenIcon from "@assets/icon/send-token.png";
import claimTokenIcon from "@assets/icon/claim-token.png";
import autoCompoundIcon from "@assets/icon/auto-compound.png";
import closeIcon from "@assets/icon/close-grey.png";
import restartIcon from "@assets/icon/undo.png";

export const DEV_AUTH_CLIENT_ID = process.env["DEV_AUTH_CLIENT_ID"] || "";
export const PROD_AUTH_CLIENT_ID = process.env["PROD_AUTH_CLIENT_ID"] || "";
export const PROD_AMPLITUDE_API_KEY =
  process.env["PROD_AMPLITUDE_API_KEY"] || "";
export const DEV_AMPLITUDE_API_KEY = process.env["DEV_AMPLITUDE_API_KEY"] || "";
export const ETHEREUM_ENDPOINT =
  "https://mainnet.infura.io/v3/eeb00e81cdb2410098d5a270eff9b341";
export const DEV_MOONPAY_API_KEY = process.env["DEV_MOONPAY_API_KEY"] || "";
export const PROD_MOONPAY_API_KEY = process.env["PROD_MOONPAY_API_KEY"] || "";

export const ADDITIONAL_SIGN_IN_PREPEND: RegisterOption[] | undefined =
  undefined;

export const ADDITIONAL_INTL_MESSAGES: IntlMessages = {};

// export const MESSAGING_SERVER = "http://localhost:4000/graphql";
// export const SUBSCRIPTION_SERVER = "ws://localhost:4000/subscription";
// export const AUTH_SERVER = "http://localhost:5500";

export const AUTH_SERVER = "https://accounts.fetch.ai/v1";
export const EXPLORER_URL = "https://hub.fetch.ai";

export const FNS_TEST_ADDRESS = "fetch1s84mudgmjfjmkef7ludqnwy0fchh3mf4p4rmll";

export const CHAIN_ID_DORADO = "dorado-1";
export const CHAIN_ID_ERIDANUS = "eridanus-1";
export const CHAIN_ID_FETCHHUB = "fetchhub-4";
export const CHAIN_ID_LOCAL_TEST_NETWORK = "test-local";
export const CHAIN_ID_REMOTE_TEST_NETWORK = "test";
export const GROUP_PAGE_COUNT = 30;
export const CHAT_PAGE_COUNT = 30;

let SUBSCRIPTION_SERVER, MESSAGING_SERVER;
export let NOTYPHI_BASE_URL: string;

if (process.env.NODE_ENV === "production") {
  SUBSCRIPTION_SERVER = "wss://messaging-server.prod.fetch-ai.com/subscription";
  MESSAGING_SERVER = "https://messaging-server.prod.fetch-ai.com/graphql";
  NOTYPHI_BASE_URL = "https://api.notyphi.com/v1";
} else {
  SUBSCRIPTION_SERVER =
    "wss://messaging-server.sandbox-london-b.fetch-ai.com/subscription";
  MESSAGING_SERVER =
    "https://messaging-server.sandbox-london-b.fetch-ai.com/graphql";
  NOTYPHI_BASE_URL = "https://api-staging.notyphi.com/v1";
}

const ACTIVITY_SERVER: { [key: string]: string } = {
  [CHAIN_ID_DORADO]: "https://subquery-dorado.fetch.ai/",
  [CHAIN_ID_FETCHHUB]: "https://subquery.fetch.ai/",
};

export const GRAPHQL_URL = {
  SUBSCRIPTION_SERVER,
  MESSAGING_SERVER,
  ACTIVITY_SERVER,
};

let FETCHHUB_AGENT, DORADO_AGENT;
let FETCHHUB_FEEDBACK, DORADO_FEEDBACK;

if (process.env.NODE_ENV === "production") {
  FETCHHUB_AGENT =
    "agent1qvmfez9k6fycllzqc6p7telhwyzzj709n32sc5x2q0ss62ehqc3e52qgna7";
  DORADO_AGENT =
    "agent1qdhydny2mmdntqn6dx3d3wpyukaq855j2yexl2f0z07d5esl76932mctpvf";
  FETCHHUB_FEEDBACK = "https://fetchbot.prod.fetch-ai.com/";
  DORADO_FEEDBACK = "https://fetchbot-dorado.prod.fetch-ai.com/";
} else {
  FETCHHUB_AGENT =
    "agent1qv5rmumv0xe0fqlmm3k4lxu4mhmz9aluy07tgp5lmzr2z0mccttcyjksf7r";
  DORADO_AGENT =
    "agent1qtvyuq8gkywtymym00n83llwcj6dscwfaz9dgdhm2dw0e9tqmkzq7tesse9";
  FETCHHUB_FEEDBACK =
    "https://fetchbot-uagent-staging-mainnet.sandbox-london-b.fetch-ai.com";
  DORADO_FEEDBACK =
    "https://fetchbot-uagent-staging.sandbox-london-b.fetch-ai.com";
}

export const AGENT_FEEDBACK_URL: { [key: string]: string } = {
  [CHAIN_ID_DORADO]: DORADO_FEEDBACK,
  [CHAIN_ID_FETCHHUB]: FETCHHUB_FEEDBACK,
};

export const AGENT_ADDRESS: { [key: string]: string } = {
  [CHAIN_ID_FETCHHUB]: FETCHHUB_AGENT,
  [CHAIN_ID_DORADO]: DORADO_AGENT,
};
// export const AGENT_ADDRESS =
//   "agent1qdh7x8k7se255j44dmt2yrpnxqdyn9qqt3dvcn4zy3dwq5qthl577v7njct";

export const AGENT_COMMANDS = [
  {
    command: "/transferFET",
    eventName: "bot_transfer_fet_click",
    label: "transferFET (Transfer FET)",
    icon: sendTokenIcon,
    enabled: true,
  },
  {
    command: "/sendAsset",
    eventName: "bot_send_asset_click",
    label: "sendAsset (Send a native or CW20 Asset)",
    icon: sendTokenIcon,
    enabled: true,
  },
  {
    command: "/ibcTransfer",
    eventName: "bot_ibc_transfer_click",
    label: "IBC Transfer (Transfer IBC assets cross chain)",
    icon: sendTokenIcon,
    enabled: true,
  },
  {
    command: "/autocompound",
    eventName: "bot_auto_compound_click",
    label: "autocompound (Auto-Compound Rewards)",
    icon: autoCompoundIcon,
    enabled: true,
  },
  {
    command: "/redeemFET",
    eventName: "bot_redeem_fet_click",
    label: "redeemFET (Redeem Stake Rewards)",
    icon: claimTokenIcon,
    enabled: true,
  },
  {
    command: "/recurringPayments",
    eventName: "bot_recurring_payments_click",
    label: "recurringPayments (schedule payments)",
    icon: restartIcon,
    enabled: true,
  },
  {
    command: "/recurringStakes",
    eventName: "bot_recurring_stakes_click",
    label: "recurringStakes (schedule stakes)",
    icon: restartIcon,
    enabled: true,
  },
  {
    command: "/tweet",
    eventName: "bot_share_tweet_click",
    label: "tweet (Share your tweet)",
    icon: require("@assets/icon/agent-tweet.svg"),
    enabled: false,
  },
  {
    command: "/cancelRecurringTransfer",
    eventName: "bot_cancel_recurring_transfer_click",
    label: "cancelRecurringTransfer (Cancel Automation)",
    icon: closeIcon,
    enabled: true,
  },
  {
    command: "/cancelRecurringStake",
    eventName: "bot_cancel_recurring_stakes_click",
    label: "cancelRecurringStake (Cancel Automation)",
    icon: closeIcon,
    enabled: true,
  },
  {
    command: "/cancelAutocompound",
    eventName: "bot_cancel_autocompound_click",
    label: "cancelAutocompound (Cancel Automation)",
    icon: closeIcon,
    enabled: true,
  },
  {
    command: "/cancel",
    eventName: "bot_cancel_automation_click",
    label: "cancel (Cancel Automation)",
    icon: closeIcon,
    enabled: true,
  },
];

export const FNS_CONFIG: {
  [key: string]: {
    network: "mainnet" | "testnet";
    rpc: string;
    contractAddress: string;
    isEditable: boolean;
  };
} = {
  [CHAIN_ID_DORADO]: {
    network: "testnet",
    rpc: "https://rpc-dorado.fetch.ai:443",
    contractAddress:
      "fetch15hq5u4susv7d064llmupeyevx6hmskkc3p8zvt8rwn0lj02yt72s88skrf",
    isEditable: true,
  },
  [CHAIN_ID_FETCHHUB]: {
    network: "mainnet",
    rpc: "https://rpc-fetchhub.fetch.ai:443",
    contractAddress:
      "fetch1cj7pfh3aqut6p2ursuqsgceadd2p09cqjklur485sce85tvw3zusy0fpy8",
    isEditable: true,
  },
};

export const TRANSACTION_APPROVED = "Transaction approved";
export const TRANSACTION_SENT = "Transaction sent";
export const TRANSACTION_SIGNED = "Transaction signed";
export const TRANSACTION_FAILED = "Transaction failed";

export const AXL_BRIDGE_EVM_TRNSX_FEE = {
  gas: "2730000",
  amount: [{ denom: "eth", amount: "4000000000000000" }],
};

export const VALIDATOR_URL: { [key in string]: string } = {
  [CHAIN_ID_DORADO]: "https://explore-dorado.fetch.ai/validators",
  [CHAIN_ID_FETCHHUB]: "https://www.mintscan.io/fetchai/validators",
  [CHAIN_ID_ERIDANUS]: "https://explore-eridanus-1.fetch.ai/validators",
};
