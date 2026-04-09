import { Message } from "@keplr-wallet/router";
import { ASI_CHAIN_ROUTE } from "./constants";

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
    return ASI_CHAIN_ROUTE;
  }

  type(): string {
    return GetASIChainAddressMsg.type();
  }
}

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
    return ASI_CHAIN_ROUTE;
  }

  type(): string {
    return ValidateASIMnemonicMsg.type();
  }
}
