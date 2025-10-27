import { Router } from "@keplr-wallet/router";
import { SendAdaMsg, GetCardanoBalanceMsg, IsCardanoReadyMsg, EstimateSendAdaMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { CardanoService } from "./service";

export function init(router: Router, service: CardanoService): void {
  router.registerMessage(SendAdaMsg);
  router.registerMessage(GetCardanoBalanceMsg);
  router.registerMessage(IsCardanoReadyMsg);
  router.registerMessage(EstimateSendAdaMsg);

  router.addHandler(ROUTE, getHandler(service));
}
