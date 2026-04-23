import React, { Dispatch, SetStateAction } from "react";
import { Dropdown } from "@components-v2/dropdown";
import { ButtonV2 } from "@components-v2/buttons/button";
import { SetKeyRingPage } from "../../keyring-dev";

declare const browser: any;

interface WalletDropdownProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onItemSelect: () => void;
  setIsOptionsOpen: Dispatch<SetStateAction<boolean>>;
  onAnalyticsEvent: (event: string, data: Record<string, any>) => void;
}

export const WalletDropdown: React.FC<WalletDropdownProps> = ({
  isOpen,
  setIsOpen,
  onItemSelect,
  setIsOptionsOpen,
  onAnalyticsEvent,
}) => {
  const handleClose = () => {
    setIsOpen(false);
    onAnalyticsEvent("change_wallet_click", { pageName: "Home" });
  };

  const handleAddWallet = (e: any) => {
    e.preventDefault();
    onAnalyticsEvent("add_new_wallet_click", { pageName: "Home" });
    setIsOpen(false);
    browser.tabs.create({
      url: "/popup.html#/register",
    });
  };

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Change Wallet"
      closeClicked={handleClose}
    >
      <SetKeyRingPage
        onItemSelect={onItemSelect}
        setIsSelectWalletOpen={setIsOpen}
        setIsOptionsOpen={setIsOptionsOpen}
      />
      <ButtonV2
        text="Add New Wallet"
        styleProps={{
          height: "56px",
          background: "white",
          fontSize: "14px",
          paddingBottom: "14px",
          paddingTop: "14px",
        }}
        onClick={handleAddWallet}
      />
    </Dropdown>
  );
};
