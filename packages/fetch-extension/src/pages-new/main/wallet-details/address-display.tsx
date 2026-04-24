import React from "react";
import { Address } from "@components/address";
import { Skeleton } from "@components-v2/skeleton-loader";
import { splitBech32 } from "@utils/format";
import { ResponsiveAddressView } from "./address-view";
import style from "../style.module.scss";

interface AddressDisplayProps {
  address: string;
  onCopy: (address: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isBech32?: boolean;
}

export const ASIChainAddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  onCopy,
  containerRef,
}) => {
  if (!address) {
    return <Skeleton height="21px" />;
  }

  return (
    <div
      className={style["address-item"]}
      ref={containerRef}
      onClick={() => onCopy(address)}
    >
      <Address
        maxCharacters={16}
        lineBreakBeforePrefix={false}
        tooltipAddress={address}
        childrenStyle={{ opacity: 1 }}
      >
        <span style={{ display: "flex" }}>
          <span className={style["wallet-address-text"]}>
            <ResponsiveAddressView
              containerRef={containerRef}
              address={address}
            />
          </span>
        </span>
      </Address>
      <img
        className={style["copy-icon"]}
        src={require("@assets/svg/wireframe/copyGrey.svg")}
        alt=""
      />
    </div>
  );
};

export const Bech32AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  onCopy,
  containerRef,
}) => {
  if (!address) {
    return <Skeleton height="21px" />;
  }

  const { prefix, rest } = splitBech32(address);

  return (
    <div
      className={style["address-item"]}
      ref={containerRef}
      onClick={() => onCopy(address)}
    >
      <Address
        maxCharacters={16}
        lineBreakBeforePrefix={false}
        tooltipAddress={address}
        childrenStyle={{ opacity: 1 }}
      >
        <span style={{ display: "flex" }}>
          {prefix}
          <span className={style["wallet-address-text"]}>
            <ResponsiveAddressView containerRef={containerRef} address={rest} />
          </span>
        </span>
      </Address>
      <img
        className={style["copy-icon"]}
        src={require("@assets/svg/wireframe/copyGrey.svg")}
        alt=""
      />
    </div>
  );
};

interface EVMAddressDisplayProps {
  address: string;
  onCopy: (address: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const EVMAddressDisplay: React.FC<EVMAddressDisplayProps> = ({
  address,
  onCopy,
  containerRef,
}) => {
  if (!address) {
    return <span>...</span>;
  }

  if (address.length !== 42) {
    return <span>{address}</span>;
  }

  return (
    <div
      className={style["evm-address-container"]}
      ref={containerRef}
      onClick={() => onCopy(address)}
    >
      <Address
        isRaw={true}
        placement="bottom-end"
        tooltipAddress={address}
        childrenStyle={{ opacity: 1 }}
      >
        <span style={{ display: "flex" }}>
          {address.slice(0, 2)}
          <span className={style["wallet-address-text"]}>
            <ResponsiveAddressView
              containerRef={containerRef}
              address={address.slice(2)}
            />
          </span>
        </span>
      </Address>
      <img
        className={style["copy-icon"]}
        src={require("@assets/svg/wireframe/copy.svg")}
        alt=""
      />
    </div>
  );
};
