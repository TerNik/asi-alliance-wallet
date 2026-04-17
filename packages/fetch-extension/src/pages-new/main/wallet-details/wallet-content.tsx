import React from "react";
import { WalletStatus } from "@keplr-wallet/stores";
import { Skeleton } from "@components-v2/skeleton-loader";
import { ASIChainAddressDisplay, Bech32AddressDisplay, EVMAddressDisplay } from "./address-display";
import { RejectionReasonTooltip } from "./rejection-tooltip";
import style from "../style.module.scss";

interface WalletContentProps {
  walletStatus: WalletStatus;
  rejectionReason?: Error;
  isASIChain: boolean;
  isEvm: boolean;
  asiChainAddress: string;
  displayBech32Address: string;
  displayEvmAddress: string;
  onCopy: (address: string) => void;
  outerDivRef: React.RefObject<HTMLDivElement>;
  outerDivRefEvm: React.RefObject<HTMLDivElement>;
}

export const WalletContent: React.FC<WalletContentProps> = ({
  walletStatus,
  rejectionReason,
  isASIChain,
  isEvm,
  asiChainAddress,
  displayBech32Address,
  displayEvmAddress,
  onCopy,
  outerDivRef,
  outerDivRefEvm,
}) => {
  const isRejected = walletStatus === WalletStatus.Rejected;

  return (
    <div style={{ width: "100%" }}>
      {/* Rejection Reason */}
      <div className={style["walletRejected"]}>
        {isRejected && <RejectionReasonTooltip rejectionReason={rejectionReason} />}
      </div>

      {/* ASI Chain Address */}
      {!isRejected && !isEvm && isASIChain && (
        <ASIChainAddressDisplay
          address={asiChainAddress}
          onCopy={onCopy}
          containerRef={outerDivRef}
        />
      )}

      {/* Bech32 Address */}
      {!isRejected && !isEvm && !isASIChain && (
        <Bech32AddressDisplay
          address={displayBech32Address}
          onCopy={onCopy}
          containerRef={outerDivRef}
        />
      )}

      {/* EVM Address */}
      {!isRejected && !isASIChain && (isEvm || displayEvmAddress) && (
        <EVMAddressDisplay
          address={displayEvmAddress}
          onCopy={onCopy}
          containerRef={outerDivRefEvm}
        />
      )}
    </div>
  );
};
