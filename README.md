# open-encrypto-object

A simple JavaScript library for recursively encrypting primitive values within JSON objects and arrays using AES-256-GCM, preserving the structure.

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

// Define your secure encryption key and initialization vector (IV)
// These MUST be kept secret and secure. Generate them using a secure method.
// See the "Generating Key and IV" section below.
const keyHex = 'YOUR_64_CHAR_HEX_KEY'; // Replace with your actual 32-byte hex-encoded key
const ivHex = 'YOUR_32_CHAR_HEX_IV';   // Replace with your actual 16-byte hex-encoded IV

// Instantiate the service
const encryptoService = new EncryptoService(keyHex, ivHex);

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
  // with strings containing the encrypted data and an authentication tag.
  // Example structure:
  // {
  //   userId: 'encryptedBase64String.authTagBase64String',
  //   userName: 'encryptedBase64String.authTagBase64String',
  //   settings: {
  //     theme: 'encryptedBase64String.authTagBase64String',
  //     notifications: 'encryptedBase64String.authTagBase64String'
  //   },
  //   tags: [ 'encryptedBase64String.authTagBase64String', 'encryptedBase64String.authTagBase64String' ]
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

## Generating Key and IV

You need a secure 32-byte (64 hex characters) key and a 16-byte (32 hex characters) IV to use `EncryptoService`. You can generate these using Node.js's built-in `crypto` module:

```javascript
const crypto = require('crypto');

// Generate a 32-byte key for AES-256
const key = crypto.randomBytes(32).toString('hex');

// Generate a 16-byte IV for GCM (AES-GCM standard)
const iv = crypto.randomBytes(16).toString('hex');

console.log('Generated Key (Hex):', key);
console.log('Generated IV (Hex):', iv);
console.log('\nStore these securely! Do not commit them to version control.');
```

**Important:** Store your generated key and IV securely. Do not hardcode them directly in your source code if possible, and never commit them to version control. Use environment variables, secret management systems, or other secure methods appropriate for your application.

## License

[MIT](LICENSE)
