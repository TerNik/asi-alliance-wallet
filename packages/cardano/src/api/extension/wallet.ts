import { Cardano } from '@cardano-sdk/core';
import { firstValueFrom } from 'rxjs';

import { TX } from '../../config';

import { submitTx } from '.';

import type { UnwitnessedTx } from '@cardano-sdk/tx-construction';
import type { CardanoWalletManager } from '../../wallet-manager';

/**
 * Builds Cardano transaction using lace-style pattern
 * Reused from lace: third_party/lace/packages/nami/src/api/extension/wallet.ts
 * Adapted for CardanoWalletManager instead of ObservableWallet
 */
export const buildTx = async ({
  output,
  auxiliaryData,
  walletManager,
}: Readonly<{
  output: any; // Accepts both Serialization.TransactionOutput and simple objects
  auxiliaryData: any; // Accepts both Serialization.AuxiliaryData and simple objects
  walletManager: CardanoWalletManager;
}>): Promise<UnwitnessedTx> => {
  const txBuilder = walletManager.createTxBuilder();
  // Extract metadata from auxiliaryData (lace-style: auxiliaryData.metadata()?.toCore())
  const metadata = auxiliaryData?.metadata?.()?.toCore?.() || auxiliaryData?.blob;
  
  // Lace pattern: use firstValueFrom directly (as in lace wallet.ts:25)
  // tip$ is BehaviorSubject/ReplaySubject from Cardano SDK, always has current value
  console.log('[buildTx] Getting tip...');
  const tip = await firstValueFrom(walletManager.tip$);
  console.log('[buildTx] tip received:', tip ? `slot=${tip.slot}` : 'null');
  
  // Add output (lace-style: output.toCore() for Serialization.TransactionOutput)
  if (output.toCore) {
    txBuilder.addOutput(output.toCore());
  } else {
    // Fallback for simple objects (address + value)
    txBuilder.addOutput(output);
  }

  if (metadata) {
    txBuilder.metadata(metadata);
  }

  // Set validity interval (lace-style: tip.slot + TX.invalid_hereafter)
  const tipSlot = (tip as { slot: number }).slot;
  txBuilder.setValidityInterval({
    invalidHereafter: Cardano.Slot(tipSlot + TX.invalid_hereafter),
  });

  return txBuilder.build();
};

/**
 * Signs and submits Cardano transaction using lace-style pattern
 * Reused from lace: third_party/lace/packages/nami/src/api/extension/wallet.ts
 * Simplified version without password confirmation (already in background context)
 */
export const signAndSubmit = async ({
  tx,
  walletManager,
}: Readonly<{
  tx: UnwitnessedTx;
  walletManager: CardanoWalletManager;
}>) => {
  // Lace-style: tx.sign() → submitTx
  // Note: lace version uses withSignTxConfirmation for password, but we're in background context
  const { cbor: signedTx } = await tx.sign();
  return await submitTx(signedTx, walletManager);
};
