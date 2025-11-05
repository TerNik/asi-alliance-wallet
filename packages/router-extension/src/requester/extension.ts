import {
  MessageRequester,
  Message,
  JSONUint8Array,
  WalletError,
} from "@keplr-wallet/router";
import { getKeplrExtensionRouterId } from "../utils";

export class InExtensionMessageRequester implements MessageRequester {
  async sendMessage<M extends Message<unknown>>(
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never> {
    msg.validateBasic();

    // Set message's origin.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    msg["origin"] = globalThis.location.origin;
    msg.routerMeta = {
      ...msg.routerMeta,
      routerId: getKeplrExtensionRouterId(),
    };

    console.log("[InExtensionMessageRequester] sendMessage: sending message:", {
      port,
      type: msg.type(),
      route: msg.route()
    });
    
    const rawResult = await browser.runtime.sendMessage({
      port,
      type: msg.type(),
      msg: JSONUint8Array.wrap(msg),
    });
    
    console.log("[InExtensionMessageRequester] sendMessage: raw result:", rawResult);
    
    if (!rawResult) {
      console.error("[InExtensionMessageRequester] sendMessage: raw result is null/undefined");
      throw new Error("Null result");
    }

    const result = JSONUint8Array.unwrap(rawResult);
    console.log("[InExtensionMessageRequester] sendMessage: unwrapped result:", result);
    console.log("[InExtensionMessageRequester] sendMessage: result type:", typeof result);
    console.log("[InExtensionMessageRequester] sendMessage: result.return:", result?.return);
    console.log("[InExtensionMessageRequester] sendMessage: result.error:", result?.error);

    if (!result) {
      console.error("[InExtensionMessageRequester] sendMessage: result is null/undefined");
      throw new Error("Null result");
    }

    if (result.error) {
      if (typeof result.error === "string") {
        throw new Error(result.error);
      } else {
        if ("module" in result.error) {
          if (typeof result.error.module === "string") {
            throw new WalletError(
              result.error.module,
              result.error.code,
              result.error.message
            );
          }
        } else {
          throw new Error(result.error.message);
        }
      }
    }

    return result.return;
  }

  static async sendMessageToTab<M extends Message<unknown>>(
    tabId: number,
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never> {
    msg.validateBasic();

    // Set message's origin.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    msg["origin"] = globalThis.location.origin;
    msg.routerMeta = {
      ...msg.routerMeta,
      routerId: getKeplrExtensionRouterId(),
    };

    const result = JSONUint8Array.unwrap(
      await browser.tabs.sendMessage(tabId, {
        port,
        type: msg.type(),
        msg: JSONUint8Array.wrap(msg),
      })
    );

    if (!result) {
      throw new Error("Null result");
    }

    if (result.error) {
      if (typeof result.error === "string") {
        throw new Error(result.error);
      } else {
        if ("module" in result.error) {
          if (typeof result.error.module === "string") {
            throw new WalletError(
              result.error.module,
              result.error.code,
              result.error.message
            );
          }
        } else {
          throw new Error(result.error.message);
        }
      }
    }

    return result.return;
  }
}
