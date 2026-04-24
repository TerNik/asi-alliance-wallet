import React from "react";
import { txType } from "./constants";
import style from "../style.module.scss";

interface PendingTransactionsProps {
  pendingTxns: Record<string, any>;
  currentTxnType: string;
}

export const PendingTransactions: React.FC<PendingTransactionsProps> = ({
  pendingTxns,
  currentTxnType,
}) => {
  const txnCount = Object.values(pendingTxns).length;

  if (txnCount === 0) {
    return null;
  }

  return (
    <div
      className={`${style["wallet-detail-card"]} ${style["pending-txn-card"]}`}
    >
      <div className={style["pending-txn-spinner"]}>
        <i className="fas fa-spinner fa-spin ml-2 mr-2" />
        {txnCount > 1 ? (
          <div>{txnCount} transactions in progress</div>
        ) : (
          <div>{txType[currentTxnType]} in progress</div>
        )}
      </div>
    </div>
  );
};
