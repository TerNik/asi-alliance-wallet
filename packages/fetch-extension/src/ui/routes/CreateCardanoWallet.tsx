import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";
import { wordlist as bip39Wordlist } from "@scure/bip39/wordlists/english";

export const CreateCardanoWallet: React.FC = observer(() => {
  const { accountStore, chainStore } = useStore();
  // For example: find the first Cardano network
  const cardanoChain = chainStore.chainInfos.find(
    (c) => c.features?.includes("cardano")
  );
  const [mnemonic, setMnemonic] = useState<string[] | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [restoreInput, setRestoreInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!cardanoChain) {
    return <div>No Cardano network configured</div>;
  }

  const cardanoAccount = (accountStore.getAccount(cardanoChain.chainId) as any).cardano;

  const handleCreate = async () => {
    setError(null);
    try {
      const { mnemonic, address } = await cardanoAccount.createWallet();
      setMnemonic(mnemonic);
      setAddress(address);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRestore = async () => {
    setError(null);
    try {
      const words = restoreInput.trim().toLowerCase().split(/\s+/);
      // Validation: 24 words
      if (words.length !== 24) {
        setError("Seed phrase must contain exactly 24 words.");
        return;
      }
      // Validation: only words from bip39 dictionary
      const invalid = words.filter((w) => !bip39Wordlist.includes(w));
      if (invalid.length > 0) {
        setError(
          `Invalid word(s) in seed phrase: ${invalid.join(", ")}`
        );
        return;
      }
      const { mnemonic, address } = await cardanoAccount.restoreWallet(words);
      setMnemonic(mnemonic);
      setAddress(address);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
      <h2>Create Cardano Wallet</h2>
      <button onClick={handleCreate}>Generate new seed phrase</button>
      <div style={{ margin: "16px 0" }}>
        <textarea
          placeholder="Enter seed phrase to restore"
          value={restoreInput}
          onChange={(e) => setRestoreInput(e.target.value)}
          rows={3}
          style={{ width: "100%" }}
        />
        <button onClick={handleRestore} style={{ marginTop: 8 }}>
          Restore from seed phrase
        </button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {mnemonic && (
        <div style={{ margin: "16px 0" }}>
          <b>Seed phrase:</b>
          <div
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 4,
              wordBreak: "break-word",
              marginTop: 4,
            }}
          >
            {mnemonic.join(" ")}
          </div>
        </div>
      )}
      {address && (
        <div style={{ margin: "16px 0" }}>
          <b>Address:</b>
          <div
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 4,
              wordBreak: "break-all",
              marginTop: 4,
            }}
          >
            {address}
          </div>
        </div>
      )}
    </div>
  );
});
