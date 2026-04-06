import { Message } from "@keplr-wallet/router";
import { ROUTE } from "./constants";

/**
 * Message to request the ASI Chain metacycle address for the current account.
 */
export class GetASIChainAddressMsg extends Message<{
  address: string;
}> {
  public static type() {
    return "asi-chain-get-address";
  }

  constructor(public readonly mnemonic: string, public readonly index?: number) {
    super();
  }

  validateBasic(): void {
    if (!this.mnemonic) {
      throw new Error("mnemonic is empty");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetASIChainAddressMsg.type();
  }
}

/**
 * Message to validate a mnemonic using the ASI Wallet SDK.
 */
export class ValidateASIMnemonicMsg extends Message<{
  isValid: boolean;
}> {
  public static type() {
    return "asi-chain-validate-mnemonic";
  }

  constructor(public readonly mnemonic: string) {
    super();
  }

  validateBasic(): void {
    if (!this.mnemonic) {
      throw new Error("mnemonic is empty");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return ValidateASIMnemonicMsg.type();
  }
}
