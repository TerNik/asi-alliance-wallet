import React, { Fragment } from "react";
import style from "./style.module.scss";

interface BalanceFieldEvmProps {
  totalNumber: string;
  totalDenom: string;
  totalPrice: any;
  tokenState: any;
  changeInDollarsValue: number;
  changeInDollarsClass: string;
  priceStore: any;
  fiatCurrency: string;
}

interface PriceDisplayProps {
  totalPrice: any;
}

interface EVMPriceChangesProps {
  tokenState: any;
  changeInDollarsValue: number;
  changeInDollarsClass: string;
  priceStore: any;
  fiatCurrency: string;
  totalDenom: string;
}

const EvmPriceDisplay: React.FC<PriceDisplayProps> = ({ totalPrice }) => {
  if (!totalPrice) {
    return null;
  }

  return <Fragment>{` ${totalPrice.toString()} `}</Fragment>;
};

const EVMPriceChanges: React.FC<EVMPriceChangesProps> = ({
  tokenState,
  changeInDollarsValue,
  changeInDollarsClass,
  priceStore,
  fiatCurrency,
  totalDenom,
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
        {`${currencySymbol}${changeInDollarsValue.toFixed(4)} ${totalDenom}`}
      </div>
      <div className={style["changeInPer"]}>
        ({sign}
        {changePercentage} %)
      </div>
      <div className={style["day"]}>{tokenState.time}</div>
    </div>
  );
};

export const BalanceFieldEvm: React.FC<BalanceFieldEvmProps> = ({
  totalNumber,
  totalDenom,
  totalPrice,
  tokenState,
  changeInDollarsValue,
  changeInDollarsClass,
  priceStore,
  fiatCurrency,
}) => {
  return (
    <div className={style["balance-field"]}>
      <div className={style["balance"]}>
        {Number(totalNumber).toLocaleString("en-US")}{" "}
        <div className={style["denom"]}>{totalDenom}</div>
      </div>
      <div className={style["inUsd"]}>
        <EvmPriceDisplay totalPrice={totalPrice} />
      </div>
      <EVMPriceChanges
        tokenState={tokenState}
        changeInDollarsValue={changeInDollarsValue}
        changeInDollarsClass={changeInDollarsClass}
        priceStore={priceStore}
        fiatCurrency={fiatCurrency}
        totalDenom={totalDenom}
      />
    </div>
  );
};
