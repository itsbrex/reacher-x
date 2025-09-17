"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Derives a cryptographic key from a password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypts a string using AES-256-GCM
 */
async function encrypt(text: string, password: string): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive key from password and salt
    const key = await deriveKey(password, salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(salt); // Use salt as additional authenticated data

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, "hex"),
    ]);

    return combined.toString("base64");
  } catch (error) {
    throw new Error(
      "Encryption failed: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}

/**
 * Decrypts a string that was encrypted with encrypt()
 */
async function decrypt(
  encryptedData: string,
  password: string
): Promise<string> {
  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from password and salt
    const key = await deriveKey(password, salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(salt); // Use salt as additional authenticated data
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      "Decryption failed: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}

/**
 * Gets the encryption password from environment variables
 */
function getEncryptionPassword(): string {
  const password = process.env.ENCRYPTION_PASSWORD;
  if (!password) {
    throw new Error("ENCRYPTION_PASSWORD environment variable is not set");
  }
  if (password.length < 32) {
    throw new Error("ENCRYPTION_PASSWORD must be at least 32 characters long");
  }
  return password;
}

/**
 * Encrypts a token using the configured encryption password
 */
export const encryptToken = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const password = getEncryptionPassword();
    return encrypt(args.token, password);
  },
});

/**
 * Decrypts a token using the configured encryption password
 */
export const decryptToken = action({
  args: { encryptedToken: v.string() },
  handler: async (ctx, args) => {
    const password = getEncryptionPassword();
    return decrypt(args.encryptedToken, password);
  },
});
