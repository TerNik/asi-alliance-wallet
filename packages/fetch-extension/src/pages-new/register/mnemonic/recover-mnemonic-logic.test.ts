import {
  applyRecoveryPaste,
  createEmptyRecoveryFields,
  PRIVATE_KEY_INPUT_MAX_LENGTH,
  RecoverySeedType,
  submitRecoverySeed,
  validatePrivateKey,
  validateRecoverySeed,
} from "./recover-mnemonic-logic";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bip39 = require("bip39");

const PRIVATE_KEY_BYTES = Array.from({ length: 32 }, (_, index) => index);
const PRIVATE_KEY = PRIVATE_KEY_BYTES.map((byte) =>
  byte.toString(16).padStart(2, "0")
).join("");
const PREFIXED_PRIVATE_KEY = `0x${PRIVATE_KEY}`;
const MNEMONIC_12 = `${"abandon ".repeat(11)}about`;
const MNEMONIC_24 = `${"abandon ".repeat(23)}art`;

describe("private-key recovery input", () => {
  it("accepts the two supported private-key formats without truncation", () => {
    expect(PRIVATE_KEY).toHaveLength(64);
    expect(PREFIXED_PRIVATE_KEY).toHaveLength(66);
    expect(PRIVATE_KEY_INPUT_MAX_LENGTH).toBe(66);
    expect(validatePrivateKey(PRIVATE_KEY)).toBe(true);
    expect(validatePrivateKey(PREFIXED_PRIVATE_KEY)).toBe(true);
  });

  it.each([63, 65, 67])(
    "rejects an unprefixed %i-character value",
    (length) => {
      expect(validatePrivateKey("a".repeat(length))).toBe(false);
    }
  );

  it("rejects non-hex input", () => {
    expect(validatePrivateKey(`${"a".repeat(63)}g`)).toBe(false);
  });

  it("keeps a pasted private key in exactly one field", () => {
    expect(
      applyRecoveryPaste(
        RecoverySeedType.PRIVATE_KEY,
        [""],
        0,
        `  ${PREFIXED_PRIVATE_KEY}  `
      )
    ).toEqual([PREFIXED_PRIVATE_KEY]);
  });

  it("keeps a mnemonic in one private-key field and validates it as a private key", () => {
    const fields = applyRecoveryPaste(
      RecoverySeedType.PRIVATE_KEY,
      [""],
      0,
      MNEMONIC_12
    );

    expect(fields).toEqual([MNEMONIC_12]);
    expect(
      validateRecoverySeed(
        RecoverySeedType.PRIVATE_KEY,
        fields,
        bip39.validateMnemonic
      )
    ).toBe("__invalid__");
  });

  it("does not create extra fields for arbitrary text containing spaces", () => {
    expect(
      applyRecoveryPaste(
        RecoverySeedType.PRIVATE_KEY,
        [""],
        0,
        "  not a private key  "
      )
    ).toEqual(["not a private key"]);
  });
});

describe("recovery mode transitions", () => {
  it("creates only fields compatible with the selected mode", () => {
    expect(createEmptyRecoveryFields(RecoverySeedType.PRIVATE_KEY)).toEqual([
      "",
    ]);
    expect(createEmptyRecoveryFields(RecoverySeedType.WORDS12)).toHaveLength(
      12
    );
    expect(createEmptyRecoveryFields(RecoverySeedType.WORDS24)).toHaveLength(
      24
    );
  });

  it("fills all 12 mnemonic fields without switching mode", () => {
    const fields = applyRecoveryPaste(
      RecoverySeedType.WORDS12,
      createEmptyRecoveryFields(RecoverySeedType.WORDS12),
      0,
      MNEMONIC_12
    );

    expect(fields).toHaveLength(12);
    expect(fields.join(" ")).toBe(MNEMONIC_12);
    expect(
      validateRecoverySeed(
        RecoverySeedType.WORDS12,
        fields,
        bip39.validateMnemonic
      )
    ).toBeUndefined();
  });

  it("fills all 24 mnemonic fields without switching mode", () => {
    const fields = applyRecoveryPaste(
      RecoverySeedType.WORDS24,
      createEmptyRecoveryFields(RecoverySeedType.WORDS24),
      0,
      MNEMONIC_24
    );

    expect(fields).toHaveLength(24);
    expect(fields.join(" ")).toBe(MNEMONIC_24);
    expect(
      validateRecoverySeed(
        RecoverySeedType.WORDS24,
        fields,
        bip39.validateMnemonic
      )
    ).toBeUndefined();
  });
});

describe("recovery submit routing", () => {
  it.each([PRIVATE_KEY, PREFIXED_PRIVATE_KEY])(
    "submits the exact 32 bytes represented by the private key",
    async (privateKey) => {
      const createPrivateKey = jest.fn().mockResolvedValue(undefined);
      const createMnemonic = jest.fn().mockResolvedValue(undefined);

      await expect(
        submitRecoverySeed({
          seedType: RecoverySeedType.PRIVATE_KEY,
          seedWords: [privateKey],
          createPrivateKey,
          createMnemonic,
        })
      ).resolves.toBe("privateKey");

      expect(createPrivateKey).toHaveBeenCalledTimes(1);
      expect(Array.from(createPrivateKey.mock.calls[0][0])).toEqual(
        PRIVATE_KEY_BYTES
      );
      expect(createMnemonic).not.toHaveBeenCalled();
    }
  );

  it("keeps mnemonic submit on createMnemonic", async () => {
    const createPrivateKey = jest.fn().mockResolvedValue(undefined);
    const createMnemonic = jest.fn().mockResolvedValue(undefined);

    await expect(
      submitRecoverySeed({
        seedType: RecoverySeedType.WORDS12,
        seedWords: MNEMONIC_12.split(" "),
        createPrivateKey,
        createMnemonic,
      })
    ).resolves.toBe("mnemonic");

    expect(createMnemonic).toHaveBeenCalledWith(MNEMONIC_12);
    expect(createPrivateKey).not.toHaveBeenCalled();
  });
});
