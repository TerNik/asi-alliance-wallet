import React from "react";
import { Dropdown } from "@components-v2/dropdown";
import { WalletOptions } from "../wallet-options";

interface OptionsDropdownProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const OptionsDropdown: React.FC<OptionsDropdownProps> = ({
  isOpen,
  setIsOpen,
}) => {
  return (
    <Dropdown
      setIsOpen={setIsOpen}
      isOpen={isOpen}
      title="Manage Wallet"
      closeClicked={() => setIsOpen(false)}
    >
      <WalletOptions />
    </Dropdown>
  );
};
