import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { CardanoTransactionStore } from '@keplr-wallet/stores';

// Temporary types until proper Cardano integration
interface TransactionOutput {
  address: string;
  value: {
    coins: bigint;
    assets?: Map<string, bigint>;
  };
}

interface SendTransactionFormProps {
  store: CardanoTransactionStore;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

interface FormData {
  recipientAddress: string;
  amount: string;
  assetId: string;
  metadata: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  minimumCoinQuantities?: any;
}

export const SendTransactionForm: React.FC<SendTransactionFormProps> = observer(({
  store,
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState<FormData>({
    recipientAddress: '',
    amount: '',
    assetId: 'ada', // Default to ADA
    metadata: ''
  });

  const [estimatedFee, setEstimatedFee] = useState<bigint>(BigInt(0));
  const [isEstimating, setIsEstimating] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Get available assets and ADA balance from store
  const availableAssets = store.state.balance.assets || new Map();
  const adaBalanceLovelace = store.state.balance.coins;
  const adaBalance = Number(adaBalanceLovelace) / 1_000_000; // Convert from Lovelace to ADA

  // Estimate fee and validate when form data changes (Lace pattern)
  useEffect(() => {
    if (formData.recipientAddress && formData.amount && parseFloat(formData.amount) > 0) {
      estimateFeeAndValidate();
    } else {
      setEstimatedFee(BigInt(0));
      setValidation(null);
    }
  }, [formData.recipientAddress, formData.amount, formData.assetId, formData.metadata]);

  /**
   * Estimate fee and validate outputs following Lace pattern
   */
  const estimateFeeAndValidate = useCallback(async () => {
    if (!formData.recipientAddress || !formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }

    setIsEstimating(true);
    setIsValidating(true);
    
    try {
      const outputs: TransactionOutput[] = [{
        address: formData.recipientAddress,
        value: {
          coins: formData.assetId === 'ada' 
            ? BigInt(Math.floor(parseFloat(formData.amount) * 1_000_000)) // Convert ADA to Lovelace
            : BigInt(1_000_000), // Minimum ADA for tokens (will be adjusted by validation)
          assets: formData.assetId !== 'ada' 
            ? new Map([[formData.assetId, BigInt(formData.amount)]])
            : undefined
        }
      }];

      // Validate outputs first (Lace pattern)
      const validationResult = await store.validateOutputs(outputs);
      setValidation(validationResult);

      // Then estimate fee
      const fee = await store.estimateFee(outputs, formData.metadata || undefined);
      setEstimatedFee(fee);

    } catch (error) {
      console.error('Failed to estimate fee and validate:', error);
      setValidation({
        isValid: false,
        errors: [`Estimation failed: ${error.message || error}`],
        warnings: []
      });
    } finally {
      setIsEstimating(false);
      setIsValidating(false);
    }
  }, [formData, store]);

  /**
   * Enhanced form validation including SDK validation results
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Basic address validation
    if (!formData.recipientAddress) {
      newErrors.recipientAddress = 'Recipient address is required';
    } else if (!isValidCardanoAddress(formData.recipientAddress)) {
      newErrors.recipientAddress = 'Invalid Cardano address';
    }

    // Amount validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else {
      const amount = parseFloat(formData.amount);
      if (formData.assetId === 'ada') {
        const amountInLovelace = amount * 1_000_000;
        if (amountInLovelace > Number(store.state.balance.coins)) {
          newErrors.amount = 'Insufficient ADA balance';
        }
      } else {
        const assetBalance = store.state.balance.assets?.get(formData.assetId) || BigInt(0);
        if (BigInt(amount) > assetBalance) {
          newErrors.amount = 'Insufficient asset balance';
        }
      }
    }

    // Check SDK validation results (Lace pattern)
    if (validation && !validation.isValid) {
      newErrors.amount = validation.errors.join('; ');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const outputs: TransactionOutput[] = [{
        address: formData.recipientAddress,
        value: {
          coins: formData.assetId === 'ada' 
            ? BigInt(Math.floor(parseFloat(formData.amount) * 1_000_000))
            : BigInt(0),
          assets: formData.assetId !== 'ada' 
            ? new Map([[formData.assetId, BigInt(formData.amount)]])
            : undefined
        }
      }];

      const result = await store.sendTransaction(outputs, formData.metadata || undefined);
      
      if (result.success && result.txHash) {
        onSuccess?.(result.txHash);
        // Reset form
        setFormData({
          recipientAddress: '',
          amount: '',
          assetId: 'ada',
          metadata: ''
        });
        setEstimatedFee(BigInt(0));
      } else {
        onError?.(result.error || 'Transaction failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMessage);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatFee = (fee: bigint): string => {
    return `${Number(fee) / 1_000_000} ADA`;
  };



  return (
    <div className="cardano-send-transaction-form">
      <h3>Send Transaction</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="recipientAddress">Recipient Address</label>
          <input
            id="recipientAddress"
            type="text"
            value={formData.recipientAddress}
            onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
            placeholder="addr1..."
            className={errors.recipientAddress ? 'error' : ''}
          />
          {errors.recipientAddress && (
            <span className="error-message">{errors.recipientAddress}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="assetId">Asset</label>
          <select
            id="assetId"
            value={formData.assetId}
            onChange={(e) => handleInputChange('assetId', e.target.value)}
          >
            <option value="ada">ADA</option>
            {Array.from(availableAssets.keys()).map((assetId) => (
              <option key={assetId} value={assetId}>
                {assetId} ({store.getAssetBalance(assetId).toString()})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.000001"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.0"
            className={errors.amount ? 'error' : ''}
          />
          {errors.amount && (
            <span className="error-message">{errors.amount}</span>
          )}
          <div className="balance-info">
            Available: {formData.assetId === 'ada' 
              ? `${adaBalance.toFixed(6)} ADA`
              : `${store.getAssetBalance(formData.assetId).toString()} ${formData.assetId}`
            }
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="metadata">Metadata (Optional)</label>
          <textarea
            id="metadata"
            value={formData.metadata}
            onChange={(e) => handleInputChange('metadata', e.target.value)}
            placeholder="Transaction metadata..."
            rows={3}
          />
        </div>

        {/* Fee and Validation Info (Lace pattern) */}
        {estimatedFee > BigInt(0) && (
          <div className="fee-info">
            <strong>Estimated Fee:</strong> {formatFee(estimatedFee)}
            {isEstimating && <span className="estimating"> (Estimating...)</span>}
          </div>
        )}

        {/* Validation Warnings (minimum UTXO requirements) */}
        {validation && validation.warnings.length > 0 && (
          <div className="validation-warnings">
            <h4>⚠️ Warnings:</h4>
            {validation.warnings.map((warning, index) => (
              <div key={index} className="warning-message">
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* Minimum UTXO Information */}
        {validation && validation.minimumCoinQuantities && (
          <div className="minimum-coin-info">
            <details>
              <summary>Minimum UTXO Requirements</summary>
              {validation.minimumCoinQuantities.map((mq: any, index: number) => (
                <div key={index} className="min-coin-requirement">
                  {mq.coinMissing > BigInt(0) && (
                    <div>Additional ADA required: {formatFee(mq.coinMissing)}</div>
                  )}
                  <div>Minimum ADA for this output: {formatFee(mq.minimumCoin)}</div>
                </div>
              ))}
            </details>
          </div>
        )}

        {isValidating && (
          <div className="validation-status">
            Validating transaction...
          </div>
        )}

        {store.state.error && (
          <div className="error-message global-error">
            {store.state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            store.state.isLoading || 
            isEstimating || 
            isValidating ||
            (validation !== null && validation && !validation.isValid)
          }
          className="submit-button"
        >
          {store.state.isLoading ? 'Sending...' : 
           isEstimating || isValidating ? 'Validating...' : 
           'Send Transaction'}
        </button>
      </form>
    </div>
  );
});

// Helper function to validate Cardano address
function isValidCardanoAddress(address: string): boolean {
  // Basic validation - Cardano addresses start with 'addr1', 'addr_test1', etc.
  const cardanoAddressPattern = /^addr[0-9a-z_]+$/i;
  return cardanoAddressPattern.test(address) && address.length >= 50;
}

export default SendTransactionForm;
