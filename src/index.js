import * as crypto from 'crypto';

// --- Environment Variable Handling ---
// Ensure ENCRYPTION_KEY and ENCRYPTION_IV are set in your environment.
// These should be securely generated and stored (e.g., in .env.local).
//
// How to generate a secure key and IV (using Node.js):
// const key = crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
// const iv = crypto.randomBytes(16).toString('hex');  // 16 bytes for GCM (AES-GCM standard)
// console.log('ENCRYPTION_KEY=' + key);
// console.log('ENCRYPTION_IV=' + iv);
//
// IMPORTANT: Store these values securely (e.g., in .env.local for development,
// or a proper secret management system for production) and do not commit them
// directly to version control if they are sensitive.

// --- Configuration ---
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32; // 32 bytes = 256 bits
const IV_LENGTH_BYTES = 16;  // 16 bytes = 128 bits (Standard for GCM)
const INPUT_ENCODING = 'utf8';
const OUTPUT_ENCODING = 'base64'; // Common choice for storing encrypted data as strings

let encryptionKey = null;
let encryptionIv = null;

/**
 * Initializes the encryption keys from environment variables.
 * This function should be called after environment variables are loaded.
 */
export function initializeEncryptionKeys() {
    const encryptionKeyEnv = process.env.ENCRYPTION_KEY;
    const encryptionIvEnv = process.env.ENCRYPTION_IV;

    if (!encryptionKeyEnv || !encryptionIvEnv) {
        // Throw an error if essential configuration is missing
        encryptionKey = null;
        encryptionIv = null;
        throw new Error("Configuration Error: ENCRYPTION_KEY and/or ENCRYPTION_IV environment variables are not set. Cannot proceed.");
    }

    try {
        encryptionKey = Buffer.from(encryptionKeyEnv, 'hex');
        if (encryptionKey.length !== KEY_LENGTH_BYTES) {
            throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH_BYTES * 2} hex characters long (${KEY_LENGTH_BYTES} bytes). Found length: ${encryptionKey.length}`);
        }

        encryptionIv = Buffer.from(encryptionIvEnv, 'hex');
         if (encryptionIv.length !== IV_LENGTH_BYTES) {
             throw new Error(`ENCRYPTION_IV must be ${IV_LENGTH_BYTES * 2} hex characters long (${IV_LENGTH_BYTES} bytes). Found length: ${encryptionIv.length}`);
         }
    } catch (error) {
        // Propagate the error, indicating a critical setup failure
        encryptionKey = null;
        encryptionIv = null;
        throw new Error(`Configuration Error processing encryption key/IV: ${error.message}`);
    }
}


// --- Encryption Helper ---
/**
 * Encrypts a single primitive value.
 *
 * @param {string | number | boolean | null} value The primitive value to encrypt.
 * @returns {string} The base64 encoded encrypted string with the auth tag appended.
 * @throws {Error} If encryption keys are missing/invalid or if encryption fails.
 */
function encryptValue(value) {
    if (!encryptionKey || !encryptionIv) {
        throw new Error("Encryption Error: Encryption key or IV is missing or invalid. Initialize keys first.");
    }

    // Convert all primitive types to their string representation for consistent encryption
    const stringValue = String(value);

    try {
        const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, encryptionIv);
        let encrypted = cipher.update(stringValue, INPUT_ENCODING, OUTPUT_ENCODING);
        encrypted += cipher.final(OUTPUT_ENCODING);
        const authTag = cipher.getAuthTag();
        // Append the auth tag (as base64) to the encrypted data, separated by a delimiter.
        // This is crucial for GCM integrity checks during decryption.
        return `${encrypted}.${authTag.toString(OUTPUT_ENCODING)}`;
    } catch (error) {
        // Propagate the underlying crypto error
        throw new Error(`Encryption failed for value "${stringValue.substring(0, 50)}...": ${error.message}`);
    }
}

// --- Main Encryption Function ---
/**
 * Recursively encrypts all primitive values within a JSON object or array.
 *
 * @param {any} data The JSON object or array to encrypt.
 * @returns {any} A new object or array with the same structure, but with all primitive values encrypted.
 * @throws {Error} If encryption keys are missing/invalid or if encryption fails for any value.
 */
export function encryptJsonObject(data) {
     // If keys are invalid globally, don't attempt encryption at all.
     if (!encryptionKey || !encryptionIv) {
        throw new Error("Encryption Error: encryptJsonObject called, but encryption keys are not configured or are invalid.");
    }

    if (data === null || typeof data !== 'object') {
        // Base case: Encrypt primitive values (string, number, boolean, null)
        // Note: 'undefined' is not valid in JSON, but handle defensively if it appears in JS objects.
        if (typeof data === 'undefined') return undefined; // Preserve undefined if necessary
        return encryptValue(data);
    }

    if (Array.isArray(data)) {
        // Recursively encrypt each element in the array
        return data.map(item => encryptJsonObject(item));
    }

    // It's an object (and not null or an array)
    const encryptedObject = {};
    for (const key in data) {
        // Ensure we only process own properties, not inherited ones
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            encryptedObject[key] = encryptJsonObject(data[key]);
        }
    }
    return encryptedObject;
}

// --- Decryption Helper ---
/**
 * Decrypts a single value that was previously encrypted by encryptValue.
 *
 * @param {string} encryptedString The base64 encoded string potentially containing encrypted data and auth tag.
 * @returns {string | number | boolean | null} The decrypted primitive value, or the original input string
 *                                             if it doesn't appear to be encrypted by this library.
 * @throws {Error} If decryption keys are missing/invalid or if decryption fails (e.g., invalid auth tag).
 */
function decryptValue(encryptedString) {
    if (!encryptionKey || !encryptionIv) {
        throw new Error("Decryption Error: Decryption key or IV is missing or invalid. Initialize keys first.");
    }

    // Basic check: If it's not a string or doesn't contain the delimiter, it's likely not encrypted by our method.
    if (typeof encryptedString !== 'string' || !encryptedString.includes('.')) {
        return encryptedString;
    }

    const parts = encryptedString.split('.');
    if (parts.length !== 2) {
        // Doesn't fit the expected format 'encryptedData.authTag'
        return encryptedString;
    }

    const encryptedData = parts[0];
    const authTagBase64 = parts[1];

    try {
        const authTag = Buffer.from(authTagBase64, OUTPUT_ENCODING);
        const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, encryptionIv);

        // Set the received auth tag for GCM verification
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, OUTPUT_ENCODING, INPUT_ENCODING);
        decrypted += decipher.final(INPUT_ENCODING); // Throws if auth tag is invalid

        // Attempt to parse back to original types (best effort)
        if (decrypted === 'null') return null;
        if (decrypted === 'true') return true;
        if (decrypted === 'false') return false;
        // Check if it's a number (integer or float)
        if (!isNaN(decrypted) && !isNaN(parseFloat(decrypted))) {
             // Avoid converting empty string or whitespace-only strings to 0
             if (decrypted.trim() !== '') {
                return Number(decrypted);
             }
        }

        // Otherwise, return as string
        return decrypted;

    } catch (error) {
        // Common errors: 'Unsupported state or unable to authenticate data' (invalid auth tag),
        // or Buffer.from errors if authTagBase64 is invalid base64.
        // Propagate the underlying crypto error (e.g., invalid auth tag)
        throw new Error(`Decryption failed for value "${encryptedString.substring(0, 50)}...": ${error.message}`);
    }
}

// --- Main Decryption Function ---
/**
 * Recursively decrypts all potentially encrypted string values within a JSON object or array.
 *
 * @param {any} data The JSON object or array potentially containing encrypted strings.
 * @returns {any} A new object or array with the same structure, but with encrypted strings decrypted.
 *          Strings that couldn't be decrypted or didn't appear encrypted are returned as is.
 * @throws {Error} If decryption keys are missing/invalid or if decryption fails for any value.
 */
export function decryptJsonObject(data) {
    // If keys are invalid globally, don't attempt decryption at all.
    if (!encryptionKey || !encryptionIv) {
        throw new Error("Decryption Error: decryptJsonObject called, but encryption keys are not configured or are invalid.");
    }

    if (data === null || typeof data !== 'object') {
        // Base case: If it's a string, try to decrypt it. Otherwise, return as is.
        if (typeof data === 'string') {
            return decryptValue(data);
        }
        // Return non-object, non-string types (number, boolean, null already handled by decryptValue if they were stringified/encrypted)
        // or undefined as is.
        return data;
    }

    if (Array.isArray(data)) {
        // Recursively decrypt each element in the array
        return data.map(item => decryptJsonObject(item));
    }

    // It's an object (and not null or an array)
    const decryptedObject = {};
    for (const key in data) {
        // Ensure we only process own properties
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            decryptedObject[key] = decryptJsonObject(data[key]);
        }
    }
    return decryptedObject;
}

// Initialize keys on module load for non-test environments
initializeEncryptionKeys();