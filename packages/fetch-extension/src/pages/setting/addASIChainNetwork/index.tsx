import { HeaderLayout } from "@layouts-v2/header-layout";
import { Input } from "@components-v2/form/input";
import React, { FunctionComponent, useState } from "react";
import { useNavigate } from "react-router";
import { Form } from "reactstrap";
import { ButtonV2 } from "@components-v2/buttons/button";
import style from "./style.module.scss";
import { useStore } from "../../../stores";
import { Bech32Address } from "@keplr-wallet/cosmos";
import axios from "axios";
import { useLoadingIndicator } from "@components/loading-indicator";
import { INITIAL_ASI_CHAIN_CONFIG } from "./constants";
import { useNotification } from "@components/notification";
import { ASI_CHAIN_FEATURE } from "../../../config.asi-chain";

type EndpointCheckResult = {
  valid: boolean;
  reason?: string;
};

/**
 * ASI Chain uses HTTP nodes, so we accept both http: and https: URLs.
 */
const isUrlValid = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

export const AddASIChainNetwork: FunctionComponent = () => {
  const navigate = useNavigate();
  const loadingIndicator = useLoadingIndicator();
  const notification = useNotification();
  const { chainStore, analyticsStore } = useStore();
  const [info, setInfo] = useState("");
  const [hasErrors, setHasErrors] = useState(false);
  const [newChainInfo, setNewChainInfo] = useState(INITIAL_ASI_CHAIN_CONFIG);
  const chainList = chainStore.chainInfos;

  // ── Uniqueness checks ─────────────────────────────────────────────────
  const isChainIdExist = chainList.some(
    (chain) => chain.chainId === newChainInfo.chainId
  );
  const isChainNameExist = chainList.some(
    (chain) =>
      chain.chainName.toLowerCase() === newChainInfo.chainName.toLowerCase()
  );
  const isRPCExist = chainList.some(
    (chain) => chain.rpc === newChainInfo.rpc
  );
  const isChainUnique = !isChainNameExist && !isRPCExist && !isChainIdExist;

  // ── Currency field updater ────────────────────────────────────────────
  const updateCurrencyFields = (
    field: "coinMinimalDenom" | "coinDenom" | "coinDecimals",
    val: string | number
  ) => {
    setNewChainInfo((prev) => ({
      ...prev,
      stakeCurrency: { ...prev.stakeCurrency, [field]: val },
      currencies: [{ ...prev.currencies[0], [field]: val }],
      feeCurrencies: [{ ...prev.feeCurrencies[0], [field]: val }],
    }));
  };

  const cleanDecimalInput = (value: string): string => {
    if (value.trim() === "") return "";
    const cleaned = value.replace(/\..*$/, "").replace(/^0+(?=\d)/, "");
    if (!/^\d+$/.test(cleaned)) return "";
    return Math.min(Number(cleaned), 18).toString();
  };

  // ── Field handlers (table/map approach) ───────────────────────────────
  type FieldHandler = (value: string) => void;

  const fieldHandlers: Record<string, FieldHandler> = {
    chainId: (value) =>
      setNewChainInfo((prev) => ({ ...prev, chainId: value })),

    chainName: (value) =>
      setNewChainInfo((prev) => ({ ...prev, chainName: value })),

    rpc: (value) =>
      setNewChainInfo((prev) => ({ ...prev, rpc: value })),

    rest: (value) =>
      setNewChainInfo((prev) => ({ ...prev, rest: value })),

    prefix: (value) =>
      setNewChainInfo((prev) => ({
        ...prev,
        bech32Config: Bech32Address.defaultBech32Config(value.trim()),
      })),

    denom: (value) =>
      updateCurrencyFields("coinMinimalDenom", value.trim().toLowerCase()),

    symbol: (value) =>
      updateCurrencyFields("coinDenom", value.trim()),

    decimal: (value) => {
      const cleaned = cleanDecimalInput(value);
      const decimals = parseInt(cleaned) || 0;
      updateCurrencyFields("coinDecimals", decimals);
    },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasErrors(false);
    setInfo("");
    const { name, value } = e.target;

    // Prevent spaces in all fields except chainName and decimal
    if (name !== "chainName" && name !== "decimal" && /\s/.test(value)) {
      return;
    }

    const handler = fieldHandlers[name];
    if (handler) {
      handler(value);
    } else {
      setNewChainInfo((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ── Endpoint validation ───────────────────────────────────────────────
  const checkEndpointValidity = async (
    url: string,
    type: "rpc" | "rest"
  ): Promise<EndpointCheckResult> => {
    if (!isUrlValid(url)) return { valid: false, reason: "URL is invalid" };

    const path =
      type === "rpc" ? "/status" : "/cosmos/base/tendermint/v1beta1/node_info";

    try {
      const fullUrl = `${url.replace(/\/$/, "")}${path}`;
      const res = await axios.get(fullUrl, { timeout: 4000 });

      if (!res || res.status !== 200 || typeof res.data !== "object") {
        return { valid: false, reason: "Endpoint not reachable" };
      }

      const expectedChainId = newChainInfo.chainId;
      const network =
        type === "rpc"
          ? res.data?.result?.node_info?.network
          : res.data?.default_node_info?.network ||
            res.data?.node_info?.network;

      if (!network) {
        return {
          valid: false,
          reason: "Endpoint did not return network info",
        };
      }
      if (network.trim() !== expectedChainId) {
        return {
          valid: false,
          reason: `Endpoint network (${network}) does not match chain ID (${expectedChainId})`,
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, reason: "Endpoint unreachable or request failed" };
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      loadingIndicator.setIsLoading("chain-details-adding", true);

      const [rpcResult, restResult] = await Promise.all([
        checkEndpointValidity(newChainInfo.rpc, "rpc"),
        checkEndpointValidity(newChainInfo.rest, "rest"),
      ]);

      const errors: string[] = [];
      if (!rpcResult.valid) errors.push(`RPC: ${rpcResult.reason}`);
      if (!restResult.valid) errors.push(`REST: ${restResult.reason}`);

      errors.forEach((err) =>
        notification.push({
          type: "danger",
          placement: "top-center",
          duration: 5,
          content: err,
          canDelete: true,
          transition: { duration: 0.25 },
        })
      );

      if (errors.length > 0) {
        setHasErrors(true);
        setInfo(
          "Invalid REST or RPC endpoint. Please provide a valid endpoint."
        );
        loadingIndicator.setIsLoading("chain-details-adding", false);
        return;
      }

      // Ensure the asi-chain feature flag is always present
      const features = newChainInfo.features?.includes(ASI_CHAIN_FEATURE)
        ? newChainInfo.features
        : [...(newChainInfo.features || []), ASI_CHAIN_FEATURE];

      chainStore.addCustomChainInfo({ ...newChainInfo, features });
      chainStore.selectChain(newChainInfo.chainId);
      loadingIndicator.setIsLoading("chain-details-adding", false);
      analyticsStore.logEvent("add_chain_click", {
        pageName: "Add new ASI Chain network",
      });
    } catch (error) {
      console.error(error);
      loadingIndicator.setIsLoading("chain-details-adding", false);
      setInfo("Error adding chain.");
      setHasErrors(true);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────
  const isChainNameValid =
    /^[a-z0-9-_ ()]{1,64}$/i.test(newChainInfo.chainName) &&
    (newChainInfo.chainName.match(/\(/g)?.length || 0) ===
      (newChainInfo.chainName.match(/\)/g)?.length || 0);
  const isChainIdValid = /^[a-z0-9-_]{3,64}$/.test(newChainInfo.chainId);
  const isValidBech32Prefix = /^[a-z][a-z0-9]{1,15}$/.test(
    newChainInfo.bech32Config.bech32PrefixAccAddr
  );
  const isValidDecimals =
    newChainInfo.stakeCurrency.coinDecimals >= 0 &&
    newChainInfo.stakeCurrency.coinDecimals <= 18;
  const denom = newChainInfo.stakeCurrency.coinMinimalDenom.trim();
  const symbol = newChainInfo.stakeCurrency.coinDenom.trim();
  const isValidDenom = /^([A-Za-z]{2,10}|ibc\/[A-Fa-f0-9]{32,64})$/.test(
    denom
  );
  const isValidSymbol = /^([a-zA-Z0-9]{2,10}|ibc\/[A-Fa-f0-9]{32,64})$/.test(
    symbol
  );

  const hasValidInputs =
    isChainIdValid &&
    isChainNameValid &&
    isValidBech32Prefix &&
    isValidDenom &&
    isValidSymbol &&
    isValidDecimals;

  const isValid =
    isUrlValid(newChainInfo.rpc) &&
    isUrlValid(newChainInfo.rest) &&
    !hasErrors &&
    isChainUnique &&
    hasValidInputs;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <HeaderLayout
      showBottomMenu={false}
      showTopMenu={true}
      showChainName={false}
      canChangeChainInfo={false}
      smallTitle={true}
      alternativeTitle="Add Custom ASI Chain Network"
      onBackButton={() => navigate(-1)}
    >
      <Form onSubmit={handleSubmit} className={style["container"]}>
        <Input
          label="Network Name"
          placeholder="ASI Chain"
          type="text"
          name="chainName"
          error={
            isChainNameExist
              ? "Network with this name already exists."
              : !isChainNameValid && newChainInfo.chainName !== ""
              ? "Please enter valid network name. Use only letters, numbers and basic symbols."
              : ""
          }
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          value={newChainInfo.chainName}
          onChange={handleChange}
          required
        />
        <Input
          label="Chain ID"
          type="text"
          name="chainId"
          placeholder="asi-dev-1"
          value={newChainInfo.chainId}
          error={
            isChainIdExist
              ? "Network with this chainId already exists."
              : !isChainIdValid && newChainInfo.chainId !== ""
              ? "Please enter a valid chain ID using only lowercase letters, numbers, and hyphen."
              : ""
          }
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          onChange={handleChange}
          required
        />
        <Input
          label="RPC URL"
          type="text"
          name="rpc"
          placeholder="http://rpc-asi-dev.fetch.ai"
          value={newChainInfo.rpc}
          error={
            newChainInfo.rpc !== "" && !isUrlValid(newChainInfo.rpc)
              ? "Invalid RPC URL"
              : isRPCExist
              ? "Network with this RPC URL already exists."
              : ""
          }
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          onChange={handleChange}
          required
        />
        <Input
          label="REST URL"
          type="text"
          name="rest"
          placeholder="http://rest-asi-dev.fetch.ai"
          value={newChainInfo.rest}
          error={
            newChainInfo.rest !== "" && !isUrlValid(newChainInfo.rest)
              ? "Invalid REST URL"
              : ""
          }
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          onChange={handleChange}
          required
        />
        <Input
          label="Address Prefix"
          type="text"
          name="prefix"
          placeholder="asi"
          value={newChainInfo.bech32Config.bech32PrefixAccAddr}
          error={
            !isValidBech32Prefix &&
            newChainInfo.bech32Config.bech32PrefixAccAddr
              ? "Please enter a valid address prefix"
              : ""
          }
          onChange={handleChange}
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          required
        />
        <Input
          label="Denom"
          type="text"
          name="denom"
          placeholder="atestasi"
          value={newChainInfo.stakeCurrency.coinMinimalDenom}
          error={
            !isValidDenom && denom !== "" ? "Please enter a valid denom" : ""
          }
          onChange={handleChange}
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          required
        />
        <Input
          label="Symbol"
          type="text"
          name="symbol"
          placeholder="TESTASI"
          value={newChainInfo.stakeCurrency.coinDenom}
          error={
            !isValidSymbol && symbol !== ""
              ? "Please enter a valid symbol"
              : ""
          }
          onChange={handleChange}
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          required
        />
        <Input
          label="Decimals"
          type="number"
          name="decimal"
          placeholder="18"
          formGroupClassName={style["formGroupDecimals"]}
          formFeedbackClassName={style["formFeedback"]}
          value={newChainInfo.stakeCurrency.coinDecimals}
          error={
            !isValidDecimals &&
            newChainInfo.stakeCurrency.coinDecimals !== undefined
              ? "Please enter a valid integer between 0 and 18"
              : ""
          }
          onChange={handleChange}
          required
        />
        {hasErrors && info && <p className={style["infoMessage"]}>{info}</p>}
        <ButtonV2
          variant="dark"
          styleProps={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "48px",
            fontSize: "14px",
            fontWeight: 400,
          }}
          disabled={!isValid}
          text={
            loadingIndicator.isLoading("chain-details-adding")
              ? "Loading..."
              : "Add Chain"
          }
        />
      </Form>
    </HeaderLayout>
  );
};
