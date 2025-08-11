import React from 'react';
import { observer } from 'mobx-react-lite';
import { CardanoTransactionStore } from '@keplr-wallet/stores';

interface BalanceDisplayProps {
  store: CardanoTransactionStore;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = observer(({ store }) => {
  const balance = store.state.balance;
  const utxos = store.state.utxos;
  const adaBalance = store.getBalanceInAda();

  const formatLovelace = (lovelace: bigint): string => {
    return `${Number(lovelace) / 1_000_000} ADA`;
  };

  const formatAssetAmount = (amount: bigint): string => {
    return amount.toString();
  };

  const getAssetName = (assetId: string): string => {
    // Try to extract a readable name from the asset ID
    if (assetId === 'ada') return 'ADA';
    
    // For native tokens, try to extract policy and name
    const parts = assetId.split('.');
    if (parts.length >= 2) {
      return parts.slice(1).join('.');
    }
    
    return assetId;
  };

  return (
    <div className="cardano-balance-display">
      <div className="balance-summary">
        <h3>Wallet Balance</h3>
        
        <div className="balance-item primary">
          <span className="label">ADA Balance:</span>
          <span className="value">{adaBalance.toFixed(6)} ADA</span>
        </div>

        {balance.assets && balance.assets.size > 0 && (
          <div className="assets-section">
            <h4>Token Balances</h4>
            {Array.from(balance.assets.entries()).map(([assetId, amount]) => (
              <div key={assetId} className="balance-item">
                <span className="label">{getAssetName(assetId)}:</span>
                <span className="value">{formatAssetAmount(amount)}</span>
                <span className="asset-id">{assetId}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="utxo-section">
        <h4>UTXO Details</h4>
        <div className="utxo-count">
          Total UTXOs: {utxos.length}
        </div>
        
        {utxos.length > 0 && (
          <div className="utxo-list">
            {utxos.slice(0, 10).map((utxo, index) => (
              <div key={`${utxo.txHash}-${utxo.outputIndex}`} className="utxo-item">
                <div className="utxo-header">
                  <span className="utxo-index">#{index + 1}</span>
                  <span className="utxo-address">{utxo.address}</span>
                </div>
                <div className="utxo-details">
                  <div className="utxo-ada">
                    <span className="label">ADA:</span>
                    <span className="value">{formatLovelace(utxo.value.coins)}</span>
                  </div>
                  {utxo.value.assets && utxo.value.assets.size > 0 && (
                    <div className="utxo-assets">
                      {Array.from(utxo.value.assets.entries()).map(([assetId, amount]) => (
                        <div key={assetId} className="utxo-asset">
                          <span className="label">{getAssetName(assetId)}:</span>
                          <span className="value">{formatAssetAmount(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="utxo-tx-info">
                  <span className="tx-hash">{utxo.txHash.substring(0, 16)}...</span>
                  <span className="output-index">#{utxo.outputIndex}</span>
                </div>
              </div>
            ))}
            
            {utxos.length > 10 && (
              <div className="utxo-more">
                ... and {utxos.length - 10} more UTXOs
              </div>
            )}
          </div>
        )}
      </div>

      <div className="transaction-status">
        <h4>Transaction Status</h4>
        
        {store.state.pendingTransactions.length > 0 && (
          <div className="pending-transactions">
            <h5>Pending Transactions</h5>
            {store.state.pendingTransactions.map(tx => (
              <div key={tx.id} className="pending-tx">
                <span className="status pending">{tx.status}</span>
                <span className="timestamp">
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </span>
                {tx.txHash && (
                  <span className="tx-hash">
                    {tx.txHash.substring(0, 16)}...
                  </span>
                )}
                {tx.error && (
                  <span className="error">{tx.error}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {store.state.transactionHistory.length > 0 && (
          <div className="transaction-history">
            <h5>Recent Transactions</h5>
            {store.state.transactionHistory.slice(0, 5).map(tx => (
              <div key={tx.id} className="history-tx">
                <span className={`status ${tx.status}`}>{tx.status}</span>
                <span className="timestamp">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </span>
                <span className="fee">{formatLovelace(tx.fee)}</span>
                <span className="tx-hash">
                  {tx.txHash.substring(0, 16)}...
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default BalanceDisplay;
