import { Router } from "@keplr-wallet/router";
import { GetASIChainAddressMsg, ValidateASIMnemonicMsg } from "./messages";
import { ROUTE } from "./constants";
import { createHandler } from "./handler";
import { ASIChainService } from "./service";

export function init(router: Router, service: ASIChainService): void {
  router.registerMessage(GetASIChainAddressMsg);
  router.registerMessage(ValidateASIMnemonicMsg);

  router.addHandler(ROUTE, createHandler(service));
}
