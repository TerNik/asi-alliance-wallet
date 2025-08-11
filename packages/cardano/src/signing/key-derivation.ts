import { Cardano } from '@cardano-sdk/core';
import { Bip32PrivateKey, Bip32PublicKey } from '@cardano-sdk/crypto';
import { generateDerivationPath, getStakeKeyPath, CARDANO_DERIVATION } from '../config/cardano-config';

export interface DerivedKeys {
  paymentKey: {
    private: Bip32PrivateKey;
    public: Bip32PublicKey;
    hash: Cardano.Ed25519KeyHash;
  };
  stakeKey: {
    private: Bip32PrivateKey;
    public: Bip32PublicKey;
    hash: Cardano.Ed25519KeyHash;
  };
}

export interface AddressDerivation {
  address: Cardano.PaymentAddress;
  derivationPath: string;
  addressIndex: number;
  chainType: 'external' | 'internal';
}

/**
 * CIP-1852 key derivation utilities
 */
export class CardanoKeyDerivation {
  private rootKey: Bip32PrivateKey;
  private networkId: Cardano.NetworkId;

  constructor(rootKey: Bip32PrivateKey, networkId: Cardano.NetworkId) {
    this.rootKey = rootKey;
    this.networkId = networkId;
  }

  /**
   * Derive keys for a specific account and address index
   */
  deriveKeys(
    accountIndex: number = 0,
    addressIndex: number = 0,
    chainType: 'external' | 'internal' = 'external'
  ): DerivedKeys {
    const chainTypeIndex = chainType === 'external' ? 
      CARDANO_DERIVATION.EXTERNAL_CHAIN : 
      CARDANO_DERIVATION.INTERNAL_CHAIN;

    // Derive payment key: m/1852'/1815'/account'/chain/address_index
    const paymentPath = generateDerivationPath(accountIndex, chainTypeIndex, addressIndex);
    const paymentPrivateKey = this.rootKey.derive(paymentPath);
    const paymentPublicKey = paymentPrivateKey.toPublic();
    const paymentKeyHash = paymentPublicKey.hash();

    // Derive stake key: m/1852'/1815'/account'/2/0
    const stakePath = getStakeKeyPath(accountIndex);
    const stakePrivateKey = this.rootKey.derive(stakePath);
    const stakePublicKey = stakePrivateKey.toPublic();
    const stakeKeyHash = stakePublicKey.hash();

    return {
      paymentKey: {
        private: paymentPrivateKey,
        public: paymentPublicKey,
        hash: paymentKeyHash
      },
      stakeKey: {
        private: stakePrivateKey,
        public: stakePublicKey,
        hash: stakeKeyHash
      }
    };
  }

  /**
   * Derive address from keys
   */
  deriveAddress(
    accountIndex: number = 0,
    addressIndex: number = 0,
    chainType: 'external' | 'internal' = 'external'
  ): AddressDerivation {
    const keys = this.deriveKeys(accountIndex, addressIndex, chainType);
    
    // Create payment credential
    const paymentCredential = Cardano.Credential.fromKeyHash(keys.paymentKey.hash);
    
    // Create stake credential
    const stakeCredential = Cardano.Credential.fromKeyHash(keys.stakeKey.hash);
    
    // Create address
    const address = Cardano.PaymentAddress.fromCredentials(
      this.networkId,
      paymentCredential,
      stakeCredential
    );

    const chainTypeIndex = chainType === 'external' ? 
      CARDANO_DERIVATION.EXTERNAL_CHAIN : 
      CARDANO_DERIVATION.INTERNAL_CHAIN;

    return {
      address,
      derivationPath: generateDerivationPath(accountIndex, chainTypeIndex, addressIndex),
      addressIndex,
      chainType
    };
  }

  /**
   * Derive multiple addresses (address discovery)
   */
  deriveAddresses(
    accountIndex: number = 0,
    count: number = 20,
    chainType: 'external' | 'internal' = 'external'
  ): AddressDerivation[] {
    const addresses: AddressDerivation[] = [];
    
    for (let i = 0; i < count; i++) {
      addresses.push(this.deriveAddress(accountIndex, i, chainType));
    }
    
    return addresses;
  }

  /**
   * Get change address (internal chain, index 0)
   */
  getChangeAddress(accountIndex: number = 0): AddressDerivation {
    return this.deriveAddress(accountIndex, 0, 'internal');
  }

  /**
   * Get primary receiving address (external chain, index 0)
   */
  getPrimaryAddress(accountIndex: number = 0): AddressDerivation {
    return this.deriveAddress(accountIndex, 0, 'external');
  }

  /**
   * Find derivation info for a specific address
   */
  findAddressDerivation(
    targetAddress: string,
    accountIndex: number = 0,
    maxIndex: number = 100
  ): AddressDerivation | null {
    // Search external chain
    for (let i = 0; i < maxIndex; i++) {
      const derivation = this.deriveAddress(accountIndex, i, 'external');
      if (derivation.address.toBech32() === targetAddress) {
        return derivation;
      }
    }
    
    // Search internal chain
    for (let i = 0; i < maxIndex; i++) {
      const derivation = this.deriveAddress(accountIndex, i, 'internal');
      if (derivation.address.toBech32() === targetAddress) {
        return derivation;
      }
    }
    
    return null;
  }

  /**
   * Get signing key for a specific address
   */
  getSigningKeyForAddress(
    address: string,
    accountIndex: number = 0,
    maxIndex: number = 100
  ): Bip32PrivateKey | null {
    const derivation = this.findAddressDerivation(address, accountIndex, maxIndex);
    if (!derivation) {
      return null;
    }

    const keys = this.deriveKeys(accountIndex, derivation.addressIndex, derivation.chainType);
    return keys.paymentKey.private;
  }

  /**
   * Get stake key for signing stake operations
   */
  getStakeSigningKey(accountIndex: number = 0): Bip32PrivateKey {
    const keys = this.deriveKeys(accountIndex, 0, 'external');
    return keys.stakeKey.private;
  }

  /**
   * Create witness set for transaction
   */
  createWitnessSet(
    txHash: Cardano.TransactionId,
    requiredSignatures: Array<{
      address: string;
      keyType: 'payment' | 'stake';
    }>,
    accountIndex: number = 0
  ): Cardano.WitnessSet {
    const vkeyWitnesses: Cardano.VKeyWitness[] = [];

    for (const sig of requiredSignatures) {
      let privateKey: Bip32PrivateKey | null = null;
      let publicKey: Bip32PublicKey;

      if (sig.keyType === 'payment') {
        privateKey = this.getSigningKeyForAddress(sig.address, accountIndex);
        if (privateKey) {
          publicKey = privateKey.toPublic();
        }
      } else if (sig.keyType === 'stake') {
        privateKey = this.getStakeSigningKey(accountIndex);
        publicKey = privateKey.toPublic();
      }

      if (privateKey && publicKey!) {
        // Sign the transaction hash
        const signature = privateKey.sign(txHash);
        
        vkeyWitnesses.push({
          vkey: publicKey,
          signature: signature
        });
      }
    }

    return {
      vkeyWitnesses,
      nativeScripts: [],
      plutusV1Scripts: [],
      plutusV2Scripts: [],
      plutusData: [],
      redeemers: []
    };
  }

  /**
   * Validate derivation path
   */
  static validateDerivationPath(path: string): boolean {
    const pathRegex = /^m\/1852'\/1815'\/\d+'\/[0-2]\/\d+$/;
    return pathRegex.test(path);
  }

  /**
   * Parse derivation path
   */
  static parseDerivationPath(path: string): {
    account: number;
    chain: number;
    addressIndex: number;
  } | null {
    if (!this.validateDerivationPath(path)) {
      return null;
    }

    const parts = path.split('/');
    const account = parseInt(parts[3].replace("'", ""));
    const chain = parseInt(parts[4]);
    const addressIndex = parseInt(parts[5]);

    return { account, chain, addressIndex };
  }
}
