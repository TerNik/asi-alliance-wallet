import { Router } from "@keplr-wallet/router";
import { SendAdaMsg, GetCardanoBalanceMsg, IsCardanoReadyMsg, EstimateSendAdaMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { CardanoService } from "./service";
import { KeyRingService } from "../keyring/service";

export function init(router: Router, service: CardanoService, keyRingService: KeyRingService): void {
  console.log("[Cardano Init] Registering Cardano messages and handler...");
  router.registerMessage(SendAdaMsg);
  router.registerMessage(GetCardanoBalanceMsg);
  router.registerMessage(IsCardanoReadyMsg);
  router.registerMessage(EstimateSendAdaMsg);

  router.addHandler(ROUTE, getHandler(service, keyRingService));
  console.log("[Cardano Init] Cardano handler registered with ROUTE:", ROUTE);
}
