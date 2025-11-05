import { Env, Handler, InternalHandler, Message } from "@keplr-wallet/router";
import { SendAdaMsg, GetCardanoBalanceMsg, IsCardanoReadyMsg, EstimateSendAdaMsg } from "./messages";
import { CardanoService } from "./service";
import { KeyRingService } from "../keyring/service";

export const getHandler: (service: CardanoService, keyRingService: KeyRingService) => Handler = (
  service: CardanoService,
  keyRingService: KeyRingService
) => {
  return (env: Env, msg: Message<unknown>) => {
    // Use msg.type() instead of constructor comparison because parseMessage uses Object.setPrototypeOf
    // which may not preserve exact constructor reference
    const msgType = msg.type();
    
    console.log("[Cardano Handler] Received message type:", msgType);
    
    switch (msgType) {
      case SendAdaMsg.type():
        console.log("[Cardano Handler] Handling SendAdaMsg");
        return handleSendAdaMsg(service, keyRingService)(env, msg as SendAdaMsg);
      case GetCardanoBalanceMsg.type():
        return handleGetCardanoBalanceMsg(service)(env, msg as GetCardanoBalanceMsg);
      case IsCardanoReadyMsg.type():
        return handleIsCardanoReadyMsg(service)(env, msg as IsCardanoReadyMsg);
      case EstimateSendAdaMsg.type():
        return handleEstimateSendAdaMsg(service, keyRingService)(env, msg as EstimateSendAdaMsg);
      default:
        console.error("[Cardano Handler] Unknown message type:", msgType);
        throw new Error(`Unknown msg type: ${msgType}`);
    }
  };
};

/**
 * Handler for sending ADA transaction
 */
const handleSendAdaMsg: (
  service: CardanoService,
  keyRingService: KeyRingService
) => InternalHandler<SendAdaMsg> = (service, keyRingService) => {
  return async (_, msg) => {
    console.log("[Cardano Handler] handleSendAdaMsg called with:", {
      to: msg.to,
      amount: msg.amount,
      memo: msg.memo,
      chainId: msg.chainId
    });
    
    // If chainId is provided, ensure service is ready for that network
    if (msg.chainId) {
      console.log("[Cardano Handler] Ensuring CardanoService ready for chainId:", msg.chainId);
      try {
        await keyRingService.ensureCardanoServiceReady(msg.chainId);
        console.log("[Cardano Handler] CardanoService ready confirmed");
      } catch (error) {
        console.error("[Cardano Handler] Failed to ensure CardanoService ready:", error);
        throw error;
      }
    }
    
    console.log("[Cardano Handler] Checking if service is ready...");
    if (!service.isReady()) {
      console.error("[Cardano Handler] Service not ready!");
      throw new Error("Cardano service not ready. Please unlock wallet first.");
    }
    console.log("[Cardano Handler] Service is ready, sending transaction...");

    try {
      const txHash = await service.sendAda({
        to: msg.to,
        amount: msg.amount,
        memo: msg.memo
      });
      console.log("[Cardano Handler] Transaction sent successfully, txHash:", txHash);
      return txHash;
    } catch (error) {
      console.error("[Cardano Handler] Failed to send transaction:", error);
      throw error;
    }
  };
};

/**
 * Handler for getting Cardano balance
 */
const handleGetCardanoBalanceMsg: (
  service: CardanoService
) => InternalHandler<GetCardanoBalanceMsg> = (service) => {
  return async (_, _msg) => {
    // Check that service is ready
    if (!service.isReady()) {
      throw new Error("Cardano service not ready. Please unlock wallet first.");
    }

    return await service.getBalance();
  };
};

/**
 * Handler for checking Cardano service readiness
 */
const handleIsCardanoReadyMsg: (
  service: CardanoService
) => InternalHandler<IsCardanoReadyMsg> = (service) => {
  return async (_, _msg) => {
    return service.isReady();
  };
};

/**
 * Handler for estimating Cardano transaction fee
 */
const handleEstimateSendAdaMsg: (
  service: CardanoService,
  keyRingService: KeyRingService
) => InternalHandler<EstimateSendAdaMsg> = (service, keyRingService) => {
  return async (_, msg) => {
    // If chainId is provided, ensure service is ready for that network
    if (msg.chainId) {
      try {
        await keyRingService.ensureCardanoServiceReady(msg.chainId);
      } catch (error) {
        console.error("[Cardano Handler] Failed to ensure CardanoService ready:", error);
        throw error;
      }
    }
    
    if (!service.isReady()) {
      throw new Error("Cardano service not ready. Please unlock wallet first.");
    }

    try {
      return await service.estimateSendAda({
        to: msg.to,
        amount: msg.amount
      });
    } catch (error) {
      console.error("[Cardano Handler] Failed to estimate transaction:", error);
      throw error;
    }
  };
};
