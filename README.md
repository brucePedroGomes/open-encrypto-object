# open-encrypto-object

A JavaScript library for recursively encrypting primitive values within JSON objects and arrays using AES-256-GCM, preserving the structure.

## Installation

You can install this library using npm:

```bash
npm install open-encrypto-object
```

## Usage

This library provides an `EncryptoService` class to handle encryption and decryption.

```javascript
// Import the EncryptoService class
const { EncryptoService } = require('open-encrypto-object');

// Define your secure encryption key.
// This MUST be kept secret and secure. Generate it using a secure method.
// See the "Generating the Key" section below.
const keyHex = 'YOUR_64_CHAR_HEX_KEY'; // Replace with your actual 32-byte hex-encoded key

// Instantiate the service. A fresh random IV is generated per value internally,
// so you no longer pass an IV. (A second `ivHex` argument is still accepted, but
// only to decrypt legacy data produced by versions < 2.0.0.)
const encryptoService = new EncryptoService(keyHex);

// Define some sample data
const originalData = {
  userId: 1,
  userName: 'bruce pedro gomes',
  settings: {
    theme: 'dark',
    notifications: true
  },
  tags: ['important', 'urgent']
};

try {
  // Encrypt the object recursively
  const encryptedData = encryptoService.encryptJsonObject(originalData);

  // Encrypted data preserves the structure, but primitive values are replaced
  // with strings of the form `iv.ciphertext.authTag` (all base64). A unique random
  // IV is embedded per value, so encrypting the same value twice yields different
  // ciphertexts.
  // Example structure:
  // {
  //   userId: 'ivBase64.encryptedBase64String.authTagBase64String',
  //   userName: 'ivBase64.encryptedBase64String.authTagBase64String',
  //   settings: {
  //     theme: 'ivBase64.encryptedBase64String.authTagBase64String',
  //     notifications: 'ivBase64.encryptedBase64String.authTagBase64String'
  //   },
  //   tags: [ 'ivBase64.encryptedBase64String.authTagBase64String', 'ivBase64.encryptedBase64String.authTagBase64String' ]
  // }
  console.log('Encrypted:', JSON.stringify(encryptedData, null, 2));

  // Decrypt the object recursively
  const decryptedData = encryptoService.decryptJsonObject(encryptedData);
  console.log('Decrypted:', decryptedData);

  // Verify the result
  console.log('Match:', JSON.stringify(originalData) === JSON.stringify(decryptedData)); // Use stringify for deep comparison

} catch (error) {
  console.error('Encryption/Decryption failed:', error);
  // Common errors include incorrect key/IV length or format,
  // or attempting to decrypt data with the wrong key/IV or if it was tampered with.
}
```

## Why use open-encrypto-object?

*   **Secure Sensitive Data:** Easily encrypt sensitive primitive values (strings, numbers, booleans, null) within complex JSON objects or arrays before storage or transmission.
*   **Strong Encryption:** Utilizes AES-256-GCM, a robust, industry-standard authenticated encryption algorithm.
*   **Data Integrity:** GCM mode provides authentication, ensuring that the encrypted data hasn't been tampered with.
*   **Preserves Structure:** Encrypts only the primitive values, keeping the original object and array structure intact for easier use after decryption.

## Generating the Key

You need a secure 32-byte (64 hex characters) key to use `EncryptoService`. The IV is generated automatically per value, so you do not need to manage one. You can generate a key using Node.js's built-in `crypto` module:

```javascript
const crypto = require('crypto');

// Generate a 32-byte key for AES-256
const key = crypto.randomBytes(32).toString('hex');

console.log('Generated Key (Hex):', key);
console.log('\nStore this securely! Do not commit it to version control.');
```

**Important:** Store your generated key securely. Do not hardcode it directly in your source code if possible, and never commit it to version control. Use environment variables, secret management systems, or other secure methods appropriate for your application.

## Security note on IVs

Versions **< 2.0.0** required a fixed IV that was reused for every encrypted value. Under AES-GCM, reusing a `(key, IV)` pair is insecure — it makes encryption deterministic (leaking which values are equal) and undermines the authentication guarantee. Since **2.0.0**, a fresh cryptographically random IV is generated for each value and embedded in the output (`iv.ciphertext.authTag`). Legacy 2-part payloads can still be decrypted by passing the original `ivHex` as the second constructor argument.

## License

[MIT](LICENSE)
