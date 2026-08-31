import { Buffer } from "buffer/";

export enum RecoverySeedType {
  WORDS12 = "12words",
  WORDS24 = "24words",
  PRIVATE_KEY = "private_key",
}

export const PRIVATE_KEY_INPUT_MAX_LENGTH = 66;

export type RecoverySeedValidationError =
  | "__required__"
  | "__invalid__"
  | "__too_short__";

export function validatePrivateKey(value: string): boolean {
  return /^(?:0x)?[0-9a-fA-F]{64}$/.test(value.trim());
}

export function privateKeyToBytes(value: string): Uint8Array {
  const trimmed = value.trim();
  if (!validatePrivateKey(trimmed)) {
    throw new Error("Invalid private key");
  }

  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  return Buffer.from(hex, "hex");
}

export function getRecoveryFieldCount(seedType: RecoverySeedType): number {
  switch (seedType) {
    case RecoverySeedType.WORDS12:
      return 12;
    case RecoverySeedType.WORDS24:
      return 24;
    case RecoverySeedType.PRIVATE_KEY:
      return 1;
  }
}

export function createEmptyRecoveryFields(
  seedType: RecoverySeedType
): string[] {
  return new Array<string>(getRecoveryFieldCount(seedType)).fill("");
}

export function applyRecoveryPaste(
  seedType: RecoverySeedType,
  seedWords: string[],
  index: number,
  value: string
): string[] {
  if (seedType === RecoverySeedType.PRIVATE_KEY) {
    return [value.trim()];
  }

  const fieldCount = getRecoveryFieldCount(seedType);
  const nextSeedWords = createEmptyRecoveryFields(seedType);
  for (let i = 0; i < Math.min(seedWords.length, fieldCount); i++) {
    nextSeedWords[i] = seedWords[i];
  }

  const pastedWords = value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const end = Math.min(index + pastedWords.length, fieldCount);
  for (let i = index; i < end; i++) {
    nextSeedWords[i] = pastedWords[i - index];
  }

  return nextSeedWords;
}

export function validateRecoverySeed(
  seedType: RecoverySeedType,
  seedWords: string[],
  validateMnemonic: (mnemonic: string) => boolean
): RecoverySeedValidationError | undefined {
  const trimmedSeedWords = seedWords.map((word) => word.trim());

  if (seedType === RecoverySeedType.PRIVATE_KEY) {
    const privateKey = trimmedSeedWords[0] ?? "";
    if (privateKey.length === 0) {
      return "__required__";
    }
    return validatePrivateKey(privateKey) ? undefined : "__invalid__";
  }

  if (trimmedSeedWords.join(" ").trim().length === 0) {
    return "__required__";
  }

  let numWords = 0;
  for (let i = 0; i < trimmedSeedWords.length; i++) {
    if (trimmedSeedWords[i].length > 0) {
      numWords = i + 1;
    }
  }

  const mnemonicWords = trimmedSeedWords.slice(0, numWords);
  if (mnemonicWords.some((word) => word.length === 0)) {
    return "__invalid__";
  }
  if (numWords < 9) {
    return "__too_short__";
  }

  return validateMnemonic(mnemonicWords.join(" ")) ? undefined : "__invalid__";
}

export async function submitRecoverySeed(options: {
  seedType: RecoverySeedType;
  seedWords: string[];
  createPrivateKey: (privateKey: Uint8Array) => Promise<void>;
  createMnemonic: (mnemonic: string) => Promise<void>;
}): Promise<"privateKey" | "mnemonic"> {
  if (options.seedType === RecoverySeedType.PRIVATE_KEY) {
    await options.createPrivateKey(
      privateKeyToBytes(options.seedWords[0] ?? "")
    );
    return "privateKey";
  }

  await options.createMnemonic(options.seedWords.join(" ").trim());
  return "mnemonic";
}
