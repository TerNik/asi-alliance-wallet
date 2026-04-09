import { Router } from "@keplr-wallet/router";
import { GetASIChainAddressMsg, ValidateASIMnemonicMsg } from "./messages";
import { ASI_CHAIN_ROUTE } from "./constants";
import { createHandler } from "./handler";
import { ASIChainService } from "./service";

export function init(router: Router, service: ASIChainService): void {
  router.registerMessage(GetASIChainAddressMsg);
  router.registerMessage(ValidateASIMnemonicMsg);

  router.addHandler(ASI_CHAIN_ROUTE, createHandler(service));
}
