# Encrypto

A simple JavaScript library for encrypting primitive values within JSON objects and arrays using AES-256-GCM.

## Installation

You can install this library using npm:

```bash
npm install your-library-name # Replace with the actual package name
```

## Usage

The library provides a function `encryptJsonObject` that recursively encrypts all primitive values (strings, numbers, booleans, null) within a given JSON object or array.

Before using the library, ensure you have set the necessary environment variables: `ENCRYPTION_KEY` and `ENCRYPTION_IV`. These should be 32-byte and 16-byte hex strings respectively.

```javascript

// Example usage:
const myData = {
  name: 'John Doe',
  age: 30,
  isActive: true,
  address: {
    street: '123 Main St',
    city: 'Anytown'
  },
  tags: ['javascript', 'encryption', null],
  value: 123.45
};

const encryptedData = encryptJsonObject(myData);
console.log(encryptedData);
```

## Environment Variables

- `ENCRYPTION_KEY`: A 32-byte (64 hex characters) secret key for AES-256 encryption.
- `ENCRYPTION_IV`: A 16-byte (32 hex characters) initialization vector for AES-GCM.

**Important:** Store these values securely and do not commit them to version control. For development, you can use a `.env` file and a library like `dotenv`. For production, use a proper secret management system.

## Generating Key and IV

You can generate a secure key and IV using Node.js:

```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
const iv = crypto.randomBytes(16).toString('hex');  // 16 bytes for GCM (AES-GCM standard)
console.log('ENCRYPTION_KEY=' + key);
console.log('ENCRYPTION_IV=' + iv);
```

## Recursive JSON Encryptor/Decryptor

This module provides utility functions to recursively encrypt and decrypt primitive values (strings, numbers, booleans, null) within nested JavaScript objects and arrays.

**Purpose:**

The primary goal is to secure sensitive data embedded within complex JSON-like structures before storage or transmission, while allowing for easy decryption later. It traverses the entire object/array structure and applies encryption/decryption only to the primitive values, preserving the original structure.

**Algorithm:**

Encryption is performed using the **AES-256-GCM** (Galois/Counter Mode) algorithm. This is an authenticated encryption mode that provides both confidentiality and data integrity.

**Requirements:**

To function correctly, the module relies on two environment variables being set:

*   `ENCRYPTION_KEY`: A 32-byte (64 hexadecimal characters) secret key for AES-256.
*   `ENCRYPTION_IV`: A 16-byte (32 hexadecimal characters) initialization vector (IV).

**Security Note:** These keys are sensitive and should be generated securely (e.g., using `crypto.randomBytes`) and stored safely (e.g., in `.env.local` for development, or using a dedicated secrets management system for production). **Do not commit keys directly to version control.** The module will log warnings and disable encryption/decryption if these variables are missing or invalid.

**Usage:**

1.  Set the `ENCRYPTION_KEY` and `ENCRYPTION_IV` environment variables.
2.  Import the `encryptJsonObject` and `decryptJsonObject` functions.
3.  Call `encryptJsonObject(yourData)` to get an encrypted version.
4.  Call `decryptJsonObject(encryptedData)` to get the original data back.