import React, { Dispatch, SetStateAction } from "react";
import { Dropdown } from "@components-v2/dropdown";
import { ChainList } from "@layouts-v2/header/chain-list";

interface ChainNetworkDropdownProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export const ChainNetworkDropdown: React.FC<ChainNetworkDropdownProps> = ({
  isOpen,
  setIsOpen,
}) => {
  return (
    <Dropdown
      styleProp={{ height: "595px", maxHeight: "595px" }}
      setIsOpen={setIsOpen}
      isOpen={isOpen}
      title="Change Network"
      closeClicked={() => setIsOpen(false)}
    >
      <ChainList setIsSelectNetOpen={setIsOpen} />
    </Dropdown>
  );
};
