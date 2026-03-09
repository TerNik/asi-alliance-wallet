import { MultiSelectDropdown } from "@components-v2/multi-select";
import { observer } from "mobx-react-lite";
import React, { useEffect } from "react";
import { Label } from "reactstrap";
import { useStore } from "../../stores";
import style from "./style.module.scss";
import classNames from "classnames";
import {
  filterCosmosChains,
  filterEvmChains,
  filterASIChains,
  excludeTestnets,
} from "@utils/chain-filters";

interface SelectNetworkProps {
  className?: string;
  selectedNetworks: string[];
  disabled: boolean;
  onMultiSelectChange: (items: string[]) => void;
  onSelectAll?: (selected: boolean) => void;
}

export const SelectNetwork: React.FC<SelectNetworkProps> = observer(
  ({
    className,
    selectedNetworks,
    disabled,
    onMultiSelectChange,
    onSelectAll,
  }) => {
    const { chainStore } = useStore();
    const allChainsInUI = chainStore.chainInfosInUI;

    const mainChainList = filterCosmosChains(allChainsInUI);
    const evmChainList = filterEvmChains(allChainsInUI);
    const asiChainList = filterASIChains(allChainsInUI);

    const cosmosList = chainStore.showTestnet
      ? mainChainList
      : excludeTestnets(mainChainList);
    const evmList = chainStore.showTestnet
      ? evmChainList
      : excludeTestnets(evmChainList);

    const networkList = [...cosmosList, ...evmList, ...asiChainList].map(
      (chain) => ({
        id: chain.chainId,
        label: chain.chainName === "fetch" ? "FetchHub" : chain.chainName,
      })
    );

    useEffect(() => {
      const items = networkList.map((item) => item.id);
      onMultiSelectChange?.(items);
    }, []);

    return (
      <div className={classNames(style["networkDropdownContainer"], className)}>
        <Label for="network" className={style["label"]}>
          Select Networks (for which you want to set account name)
        </Label>
        <MultiSelectDropdown
          items={networkList}
          value={selectedNetworks}
          disabled={disabled}
          className={style["networkDropdown"]}
          showSelectAll={true}
          selectAllLabel="Select All Networks"
          onChange={onMultiSelectChange}
          onSelectAll={onSelectAll}
        />
      </div>
    );
  }
);
