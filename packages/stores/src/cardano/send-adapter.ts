import { AppCurrency } from "@keplr-wallet/types";
import { DenomHelper } from "@keplr-wallet/common";
import { MakeTxResponse } from "../account/types";
import { MessageRequester } from "@keplr-wallet/router";
import { 
  EstimateSendAdaMsg, 
  SendAdaMsg 
} from "@keplr-wallet/background";

// Cardano specific route
const ROUTE = "background-cardano";

/**
 * Cardano transaction adapter that implements the unified Tx handle interface
 * Maps Cardano UTxO/coin-selection logic to standard account interface
 */
export class CardanoSendAdapter {
  constructor(
    private readonly messageRequester: MessageRequester
  ) {}

  /**
   * Creates transaction handle for Cardano ADA transfers
   * Implements the same interface as Cosmos/EVM send adapters
   */
  makeSendTokenTx(
    amount: string,
    currency: AppCurrency,
    recipient: string
  ): MakeTxResponse | undefined {
    const denomHelper = new DenomHelper(currency.coinMinimalDenom);

    // Only handle native Cardano currency (ADA)
    if (denomHelper.type !== "native") {
      return undefined;
    }

    // Convert ADA to lovelace (1 ADA = 1,000,000 lovelace)
    const actualAmount = (() => {
      let dec = parseFloat(amount);
      dec = dec * Math.pow(10, currency.coinDecimals);
      return Math.floor(dec).toString();
    })();

    return {
      msgs: async () => {
        // Cardano doesn't use amino/proto msgs, return empty structure
        return {
          aminoMsgs: [],
          protoMsgs: []
        };
      },
      simulate: async () => {
        try {
          const estimate = await this.messageRequester.sendMessage(
            ROUTE,
            new EstimateSendAdaMsg(recipient, actualAmount)
          );

          return {
            gasUsed: parseInt(estimate.fee, 10)
          };
        } catch (error) {
          throw error;
        }
      },
      send: async (
        _fee: any,
        _memo?: string,
        _signOptions?: any,
        onTxEvents?: any
      ) => {
        try {
          const txHash = await this.messageRequester.sendMessage(
            ROUTE,
            new SendAdaMsg(recipient, actualAmount)
          );

          if (onTxEvents?.onBroadcasted) {
            onTxEvents.onBroadcasted(Buffer.from(txHash));
          }

          // Simulate fulfillment (Cardano transactions are typically instant)
          if (onTxEvents?.onFulfill) {
            onTxEvents.onFulfill({ txHash });
          }
        } catch (error) {
          if (onTxEvents?.onBroadcastFailed) {
            onTxEvents.onBroadcastFailed(error);
          }
          throw error;
        }
      },
      simulateAndSend: async (
        _feeOptions: any,
        _memo?: string,
        _signOptions?: any,
        onTxEvents?: any
      ) => {
        try {
          const txHash = await this.messageRequester.sendMessage(
            ROUTE,
            new SendAdaMsg(recipient, actualAmount)
          );

          if (onTxEvents?.onBroadcasted) {
            onTxEvents.onBroadcasted(Buffer.from(txHash));
          }

          if (onTxEvents?.onFulfill) {
            onTxEvents.onFulfill({ txHash });
          }
        } catch (error) {
          if (onTxEvents?.onBroadcastFailed) {
            onTxEvents.onBroadcastFailed(error);
          }
          throw error;
        }
      },
      sendWithGasPrice: async (
        _gasInfo: any,
        _memo?: string,
        _signOptions?: any,
        onTxEvents?: any
      ) => {
        try {
          const txHash = await this.messageRequester.sendMessage(
            ROUTE,
            new SendAdaMsg(recipient, actualAmount)
          );

          if (onTxEvents?.onBroadcasted) {
            onTxEvents.onBroadcasted(Buffer.from(txHash));
          }

          if (onTxEvents?.onFulfill) {
            onTxEvents.onFulfill({ txHash });
          }
        } catch (error) {
          if (onTxEvents?.onBroadcastFailed) {
            onTxEvents.onBroadcastFailed(error);
          }
          throw error;
        }
      }
    };
  }
}

