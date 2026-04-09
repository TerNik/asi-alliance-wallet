import { Env, Handler, InternalHandler, Message } from "@keplr-wallet/router";
import { ASIChainService } from "./service";
import { GetASIChainAddressMsg, ValidateASIMnemonicMsg } from "./messages";

export const createHandler: (service: ASIChainService) => Handler = (service) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetASIChainAddressMsg:
        return handleGetASIChainAddress(service)(env, msg as GetASIChainAddressMsg);
      case ValidateASIMnemonicMsg:
        return handleValidateASIMnemonic(service)(env, msg as ValidateASIMnemonicMsg);
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleGetASIChainAddress: (
  service: ASIChainService
) => InternalHandler<GetASIChainAddressMsg> = (service) => {
  return async (_env, msg) => {
    const meta = await service.createMetaFromMnemonic(msg.mnemonic, msg.index);
    return {
      address: meta["asiChainAddress"] ?? "",
    };
  };
};

const handleValidateASIMnemonic: (
  service: ASIChainService
) => InternalHandler<ValidateASIMnemonicMsg> = (service) => {
  return async (_env, msg) => {
    return {
      isValid: await service.validateMnemonic(msg.mnemonic),
    };
  };
};
