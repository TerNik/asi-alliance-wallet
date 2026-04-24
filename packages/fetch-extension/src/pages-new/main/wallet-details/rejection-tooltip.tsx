import React from "react";
import { WalletError } from "@keplr-wallet/router";
import { ToolTip } from "@components/tooltip";
import style from "../style.module.scss";

interface RejectionReasonTooltipProps {
  rejectionReason?: Error;
}

const getRejectionMessage = (rejectionReason?: Error): string => {
  if (!rejectionReason) {
    return "Failed to load account by unknown reason";
  }

  if (
    rejectionReason instanceof WalletError &&
    rejectionReason.module === "keyring" &&
    rejectionReason.code === 152
  ) {
    return "Ledger is not supported for this chain";
  }

  return `Failed to load account by unknown reason: ${rejectionReason.toString()}`;
};

export const RejectionReasonTooltip: React.FC<RejectionReasonTooltipProps> = ({
  rejectionReason,
}) => {
  return (
    <ToolTip
      tooltip={getRejectionMessage(rejectionReason)}
      theme="dark"
      trigger="hover"
      options={{
        placement: "top",
      }}
    >
      <i
        className={`fas fa-exclamation-triangle text-danger ${style["unsupportedKeyIcon"]}`}
      />
    </ToolTip>
  );
};
