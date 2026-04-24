import { HeaderLayout } from "@layouts-v2/header-layout";
import { Input } from "@components-v2/form/input";
import React, { FunctionComponent, useState } from "react";
import { useNavigate } from "react-router";
import { Form } from "reactstrap";
import { ButtonV2 } from "@components-v2/buttons/button";
import style from "./style.module.scss";
import { useStore } from "../../../stores";
import axios from "axios";
import { useLoadingIndicator } from "@components/loading-indicator";
import { INITIAL_ASI_CHAIN_CONFIG, ASI_CHAIN_FEATURE } from "./constants";
import { useNotification } from "@components/notification";

type EndpointCheckResult = {
  valid: boolean;
  reason?: string;
};

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

  const validatorUrl = newChainInfo.asi?.validator ?? "";
  const observerUrl = newChainInfo.asi?.observer ?? "";

  // ── Uniqueness checks ─────────────────────────────────────────────────
  const isChainIdExist = chainList.some(
    (chain) => chain.chainId === newChainInfo.chainId
  );
  const isChainNameExist = chainList.some(
    (chain) =>
      chain.chainName.toLowerCase() === newChainInfo.chainName.toLowerCase()
  );
  const isValidatorExist = chainList.some(
    (chain) => chain.asi?.validator === validatorUrl && validatorUrl !== ""
  );
  const isChainUnique =
    !isChainNameExist && !isValidatorExist && !isChainIdExist;

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

  // ── Field handlers ──────────────────────────────────────────────────
  type FieldHandler = (value: string) => void;

  const fieldHandlers: Record<string, FieldHandler> = {
    chainId: (value) =>
      setNewChainInfo((prev) => ({ ...prev, chainId: value })),

    chainName: (value) =>
      setNewChainInfo((prev) => ({ ...prev, chainName: value })),

    validator: (value) =>
      setNewChainInfo((prev) => ({
        ...prev,
        rpc: value,
        asi: { validator: value, observer: prev.asi?.observer ?? "" },
      })),

    observer: (value) =>
      setNewChainInfo((prev) => ({
        ...prev,
        rest: value,
        asi: { validator: prev.asi?.validator ?? "", observer: value },
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
  const checkEndpointReachable = async (
    url: string,
    label: string
  ): Promise<EndpointCheckResult> => {
    if (!isUrlValid(url)) return { valid: false, reason: `${label} URL is invalid` };

    try {
      const res = await axios.get(url.replace(/\/$/, ""), { timeout: 4000 });
      if (!res || res.status !== 200) {
        return { valid: false, reason: `${label} endpoint not reachable` };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: `${label} endpoint unreachable or request failed` };
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      loadingIndicator.setIsLoading("chain-details-adding", true);

      const [validatorResult, observerResult] = await Promise.all([
        checkEndpointReachable(validatorUrl, "Validator"),
        checkEndpointReachable(observerUrl, "Observer"),
      ]);

      const errors: string[] = [];
      if (!validatorResult.valid)
        errors.push(validatorResult.reason ?? "Validator error");
      if (!observerResult.valid)
        errors.push(observerResult.reason ?? "Observer error");

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
          "Invalid Validator or Observer endpoint. Please provide valid endpoints."
        );
        loadingIndicator.setIsLoading("chain-details-adding", false);
        return;
      }

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
    isValidDenom &&
    isValidSymbol &&
    isValidDecimals;

  const isValid =
    isUrlValid(validatorUrl) &&
    isUrlValid(observerUrl) &&
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
          label="Validator URL"
          type="text"
          name="validator"
          placeholder="http://validator-asi-dev.fetch.ai:40403"
          value={validatorUrl}
          error={
            validatorUrl !== "" && !isUrlValid(validatorUrl)
              ? "Invalid Validator URL"
              : isValidatorExist
              ? "Network with this Validator URL already exists."
              : ""
          }
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          onChange={handleChange}
          required
        />
        <Input
          label="Observer URL"
          type="text"
          name="observer"
          placeholder="http://observer-asi-dev.fetch.ai:40403"
          value={observerUrl}
          error={
            observerUrl !== "" && !isUrlValid(observerUrl)
              ? "Invalid Observer URL"
              : ""
          }
          formGroupClassName={style["formGroup"]}
          formFeedbackClassName={style["formFeedback"]}
          onChange={handleChange}
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
