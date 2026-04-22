import style from "./style.module.scss";
import React, { Fragment } from "react";
import { Skeleton } from "@components-v2/skeleton-loader";
import { isASIChain } from "@keplr-wallet/asi-chain";

import { useStore } from "../../../stores";

interface BalanceFieldCosmosProps {
  keyRingStoreStatus: number;
  effectiveAddress: string;
  totalNumber: string;
  totalDenom: string;
  totalPrice: any;
  fiatCurrency: string;
  total: any;
  tokenState: any;
  changeInDollarsValue: number;
  changeInDollarsClass: string;
  priceStore: any;
}

interface BalanceDisplayProps {
  isLoading: boolean;
  totalNumber: string;
  totalDenom: string;
}

interface PriceDisplayProps {
  isLoading: boolean;
  totalPrice: any;
  fiatCurrency: string;
  total: any;
}

interface PriceChangesProps {
  tokenState: any;
  changeInDollarsValue: number;
  changeInDollarsClass: string;
  fiatCurrency: string;
  priceStore: any;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  isLoading,
  totalNumber,
  totalDenom,
}) => {
  if (isLoading) {
    return <Skeleton height="37.5px" width="100px" />;
  }

  return (
    <Fragment>
      {Number(totalNumber).toLocaleString("en-US")}{" "}
      <div className={style["denom"]}>{totalDenom}</div>
    </Fragment>
  );
};

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  isLoading,
  totalPrice,
  fiatCurrency,
  total,
}) => {
  if (isLoading) {
    return <Skeleton height="21px" width="100px" />;
  }

  if (totalPrice) {
    return (
      <Fragment>{` ${totalPrice.toString()} ${fiatCurrency.toUpperCase()}`}</Fragment>
    );
  }

  return (
    <Fragment>
      {` ${total
        .shrink(true)
        .trim(true)
        .hideDenom(true)
        .maxDecimals(6)
        .toString()} ${fiatCurrency.toUpperCase()}`}
    </Fragment>
  );
};

const PriceChanges: React.FC<PriceChangesProps> = ({
  tokenState,
  changeInDollarsValue,
  changeInDollarsClass,
  fiatCurrency,
  priceStore,
}) => {
  if (!tokenState?.diff) {
    return null;
  }

  const isPositive = tokenState.type === "positive";
  const changePercentage = parseFloat(tokenState.percentageDiff).toFixed(1);
  const currencySymbol = priceStore.getFiatCurrency(fiatCurrency)?.symbolName;
  const sign = isPositive ? "+" : "-";

  return (
    <div
      className={
        isPositive ? style["priceChangesGreen"] : style["priceChangesOrange"]
      }
    >
      <div className={style["changeInDollars"] + " " + changeInDollarsClass}>
        {`${sign} ${currencySymbol} ${changeInDollarsValue.toFixed(4)}`}
      </div>
      <div className={style["changeInPer"]}>
        ({sign}
        {changePercentage} %)
      </div>
      <div className={style["day"]}>{tokenState.time}</div>
    </div>
  );
};

export const BalanceFieldDefault: React.FC<BalanceFieldCosmosProps> = ({
  keyRingStoreStatus,
  effectiveAddress,
  totalNumber,
  totalDenom,
  totalPrice,
  fiatCurrency,
  total,
  tokenState,
  changeInDollarsValue,
  changeInDollarsClass,
  priceStore,
}) => {
  const { chainStore } = useStore();

  const isLoading = !keyRingStoreStatus || !effectiveAddress;
  const isAsiChainUsed = isASIChain(chainStore.current);

  return (
    <div className={style["balance-field"]}>
      <div className={style["balance"]}>
        <BalanceDisplay
          isLoading={isLoading}
          totalNumber={totalNumber}
          totalDenom={totalDenom}
        />
      </div>
      {!isAsiChainUsed && (
        <Fragment>
          <div className={style["inUsd"]}>
            <PriceDisplay
              isLoading={isLoading}
              totalPrice={totalPrice}
              fiatCurrency={fiatCurrency}
              total={total}
            />
          </div>
          <PriceChanges
            tokenState={tokenState}
            changeInDollarsValue={changeInDollarsValue}
            changeInDollarsClass={changeInDollarsClass}
            fiatCurrency={fiatCurrency}
            priceStore={priceStore}
          />
        </Fragment>
      )}
    </div>
  );
};
