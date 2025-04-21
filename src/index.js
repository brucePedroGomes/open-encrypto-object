import * as crypto from 'crypto';

// --- Configuration Constants ---
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32; // 32 bytes = 256 bits
const IV_LENGTH_BYTES = 16;  // 16 bytes = 128 bits (Standard for GCM)
const INPUT_ENCODING = 'utf8';
const OUTPUT_ENCODING = 'base64'; // Common choice for storing encrypted data as strings

/**
 * Provides services for encrypting and decrypting JSON objects using AES-256-GCM.
 * Requires a valid encryption key and initialization vector (IV) upon instantiation.
 */
export class EncryptoService {
    #encryptionKey = null;
    #encryptionIv = null;

    /**
     * Creates an instance of EncryptoService.
     * @param {string} keyHex The encryption key, hex encoded (must be 64 hex characters, representing 32 bytes).
     * @param {string} ivHex The initialization vector, hex encoded (must be 32 hex characters, representing 16 bytes).
     * @throws {Error} If the key or IV is missing, not a string, or has an invalid length.
     */
    constructor(keyHex, ivHex) {
        if (!keyHex || typeof keyHex !== 'string') {
            throw new Error("Configuration Error: Encryption key (keyHex) must be provided as a non-empty string.");
        }
        if (!ivHex || typeof ivHex !== 'string') {
            throw new Error("Configuration Error: Initialization vector (ivHex) must be provided as a non-empty string.");
        }

        try {
            const key = Buffer.from(keyHex, 'hex');
            if (key.length !== KEY_LENGTH_BYTES) {
                throw new Error(`Invalid key length. Key must be ${KEY_LENGTH_BYTES} bytes (${KEY_LENGTH_BYTES * 2} hex characters). Received ${key.length} bytes.`);
            }
            this.#encryptionKey = key;

            const iv = Buffer.from(ivHex, 'hex');
            if (iv.length !== IV_LENGTH_BYTES) {
                throw new Error(`Invalid IV length. IV must be ${IV_LENGTH_BYTES} bytes (${IV_LENGTH_BYTES * 2} hex characters). Received ${iv.length} bytes.`);
            }
            this.#encryptionIv = iv;
        } catch (error) {
            // Catch errors from Buffer.from (e.g., invalid hex) or length checks
            throw new Error(`Configuration Error processing encryption key/IV: ${error.message}`);
        }
    }

    /**
     * Encrypts a single primitive value. (Private helper method)
     *
     * @param {string | number | boolean | null} value The primitive value to encrypt.
     * @returns {string} The base64 encoded encrypted string with the auth tag appended.
     * @throws {Error} If encryption fails.
     */
    #encryptValue(value) {
        // Key/IV presence is guaranteed by the constructor
        const stringValue = String(value); // Convert all primitives to string

        try {
            const cipher = crypto.createCipheriv(ALGORITHM, this.#encryptionKey, this.#encryptionIv);
            let encrypted = cipher.update(stringValue, INPUT_ENCODING, OUTPUT_ENCODING);
            encrypted += cipher.final(OUTPUT_ENCODING);
            const authTag = cipher.getAuthTag();
            // Append auth tag (base64) separated by a delimiter
            return `${encrypted}.${authTag.toString(OUTPUT_ENCODING)}`;
        } catch (error) {
            throw new Error(`Encryption failed for value "${stringValue.substring(0, 50)}...": ${error.message}`);
        }
    }

    /**
     * Recursively encrypts all primitive values within a JSON object or array.
     *
     * @param {any} data The JSON object or array to encrypt.
     * @returns {any} A new object or array with the same structure, but with all primitive values encrypted.
     * @throws {Error} If encryption fails for any value.
     */
    encryptJsonObject(data) {
        if (data === null || typeof data !== 'object') {
            // Base case: Encrypt primitive values
            if (typeof data === 'undefined') return undefined; // Preserve undefined
            return this.#encryptValue(data);
        }

        if (Array.isArray(data)) {
            // Recursively encrypt array elements
            return data.map(item => this.encryptJsonObject(item));
        }

        // It's an object
        const encryptedObject = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                encryptedObject[key] = this.encryptJsonObject(data[key]);
            }
        }
        return encryptedObject;
    }

    /**
     * Decrypts a single value that was previously encrypted. (Private helper method)
     *
     * @param {string} encryptedString The base64 encoded string potentially containing encrypted data and auth tag.
     * @returns {string | number | boolean | null} The decrypted primitive value, or the original input string
     *                                             if it doesn't appear to be encrypted by this service.
     * @throws {Error} If decryption fails (e.g., invalid auth tag).
     */
    #decryptValue(encryptedString) {
        // Key/IV presence is guaranteed by the constructor

        // Basic check: If not a string or missing delimiter, assume not encrypted by us.
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
            const decipher = crypto.createDecipheriv(ALGORITHM, this.#encryptionKey, this.#encryptionIv);

            decipher.setAuthTag(authTag); // Set auth tag for GCM verification

            let decrypted = decipher.update(encryptedData, OUTPUT_ENCODING, INPUT_ENCODING);
            decrypted += decipher.final(INPUT_ENCODING); // Throws if auth tag is invalid

            // Attempt to parse back to original types (best effort)
            if (decrypted === 'null') return null;
            if (decrypted === 'true') return true;
            if (decrypted === 'false') return false;
            if (!isNaN(decrypted) && !isNaN(parseFloat(decrypted))) {
                 if (decrypted.trim() !== '') { // Avoid converting empty/whitespace string to 0
                    return Number(decrypted);
                 }
            }
            return decrypted; // Otherwise, return as string

        } catch (error) {
            // Propagate crypto errors (e.g., invalid auth tag, invalid base64 for tag)
            throw new Error(`Decryption failed for value "${encryptedString.substring(0, 50)}...": ${error.message}`);
        }
    }

    /**
     * Recursively decrypts all potentially encrypted string values within a JSON object or array.
     *
     * @param {any} data The JSON object or array potentially containing encrypted strings.
     * @returns {any} A new object or array with the same structure, but with encrypted strings decrypted.
     *          Strings that couldn't be decrypted or didn't appear encrypted are returned as is.
     * @throws {Error} If decryption fails for any value.
     */
    decryptJsonObject(data) {
        if (data === null || typeof data !== 'object') {
            // Base case: If it's a string, try to decrypt it.
            if (typeof data === 'string') {
                return this.#decryptValue(data);
            }
            // Return non-object, non-string types as is.
            return data;
        }

        if (Array.isArray(data)) {
            // Recursively decrypt array elements
            return data.map(item => this.decryptJsonObject(item));
        }

        // It's an object
        const decryptedObject = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                decryptedObject[key] = this.decryptJsonObject(data[key]);
            }
        }
        return decryptedObject;
    }
}

// No longer initializing keys from environment variables here.
// The consumer of this module will instantiate EncryptoService with the key and IV.