const crypto = require('crypto');

// Mock environment variables for testing
const mockTestKey = crypto.randomBytes(32).toString('hex'); // Renamed variable
const mockTestIv = crypto.randomBytes(16).toString('hex'); // Renamed variable

// Use jest.mock to control the module loading and environment setup
jest.mock('../src/index', () => {
  // Set environment variables *before* requiring the actual module.
  // This ensures the automatic initialization within src/index.js finds the keys.
  process.env.ENCRYPTION_KEY = mockTestKey;
  process.env.ENCRYPTION_IV = mockTestIv;

  const originalModule = jest.requireActual('../src/index');

  // No need to explicitly initialize here, as requireActual triggered it.
  // beforeAll will re-initialize to ensure a clean state for tests.

  return originalModule;
});

// Require the mocked module after the mock is defined
const { encryptJsonObject, decryptJsonObject, initializeEncryptionKeys } = require('../src/index');


describe('encryptJsonObject', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment variables
    originalEnv = process.env;
    // Set environment variables for testing
    process.env.ENCRYPTION_KEY = mockTestKey;
    process.env.ENCRYPTION_IV = mockTestIv;
    // Initialize keys using the test environment variables
    initializeEncryptionKeys();
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
    // No need to re-initialize keys here after restoring original env
  });

  test('should encrypt primitive values in a flat object', () => {
    const data = {
      name: 'Test User',
      age: 42,
      isActive: true,
      balance: 123.45,
      isNull: null,
      eu: {
        who: 'bruce'
      }
    };

    const encryptedData = encryptJsonObject(data);

    console.log({data, encryptedData, mockTestKey, mockTestIv })

    expect(typeof encryptedData.name).toBe('string');
    expect(encryptedData.name).not.toBe(data.name);
    expect(encryptedData.name).toContain('.'); // Check for auth tag delimiter

    expect(typeof encryptedData.age).toBe('string');
    expect(encryptedData.age).not.toBe(data.age);
    expect(encryptedData.age).toContain('.');

    expect(typeof encryptedData.isActive).toBe('string');
    expect(encryptedData.isActive).not.toBe(data.isActive);
    expect(encryptedData.isActive).toContain('.');

    expect(typeof encryptedData.balance).toBe('string');
    expect(encryptedData.balance).not.toBe(data.balance);
    expect(encryptedData.balance).toContain('.');

    expect(typeof encryptedData.isNull).toBe('string');
    expect(encryptedData.isNull).not.toBe(data.isNull);
    expect(encryptedData.isNull).toContain('.');
  });

  test('should encrypt primitive values in a nested object', () => {
    const data = {
      user: {
        name: 'Nested User',
        settings: {
          darkMode: false,
          theme: 'dark',
        },
      },
      id: 100,
    };

    const encryptedData = encryptJsonObject(data);

    expect(typeof encryptedData.user.name).toBe('string');
    expect(encryptedData.user.name).not.toBe(data.user.name);
    expect(encryptedData.user.name).toContain('.');

    expect(typeof encryptedData.user.settings.darkMode).toBe('string');
    expect(encryptedData.user.settings.darkMode).not.toBe(data.user.settings.darkMode);
    expect(encryptedData.user.settings.darkMode).toContain('.');

    expect(typeof encryptedData.user.settings.theme).toBe('string');
    expect(encryptedData.user.settings.theme).not.toBe(data.user.settings.theme);
    expect(encryptedData.user.settings.theme).toContain('.');

    expect(typeof encryptedData.id).toBe('string');
    expect(encryptedData.id).not.toBe(data.id);
    expect(encryptedData.id).toContain('.');
  });

  test('should encrypt primitive values in an array', () => {
    const data = ['item1', 2, true, null];

    const encryptedData = encryptJsonObject(data);

    expect(Array.isArray(encryptedData)).toBe(true);
    expect(encryptedData.length).toBe(data.length);

    expect(typeof encryptedData[0]).toBe('string');
    expect(encryptedData[0]).not.toBe(data[0]);
    expect(encryptedData[0]).toContain('.');

    expect(typeof encryptedData[1]).toBe('string');
    expect(encryptedData[1]).not.toBe(data[1]);
    expect(encryptedData[1]).toContain('.');

    expect(typeof encryptedData[2]).toBe('string');
    expect(encryptedData[2]).not.toBe(data[2]);
    expect(encryptedData[2]).toContain('.');

    expect(typeof encryptedData[3]).toBe('string');
    expect(encryptedData[3]).not.toBe(data[3]);
    expect(encryptedData[3]).toContain('.');
  });

  test('should encrypt primitive values in a nested array', () => {
    const data = [
      { id: 1, value: 'a' },
      ['b', 3, { flag: true }],
    ];

    const encryptedData = encryptJsonObject(data);

    expect(Array.isArray(encryptedData)).toBe(true);
    expect(encryptedData.length).toBe(data.length);

    expect(typeof encryptedData[0].id).toBe('string');
    expect(encryptedData[0].id).not.toBe(data[0].id);
    expect(encryptedData[0].id).toContain('.');

    expect(typeof encryptedData[0].value).toBe('string');
    expect(encryptedData[0].value).not.toBe(data[0].value);
    expect(encryptedData[0].value).toContain('.');

    expect(Array.isArray(encryptedData[1])).toBe(true);
    expect(encryptedData[1].length).toBe(data[1].length);

    expect(typeof encryptedData[1][0]).toBe('string');
    expect(encryptedData[1][0]).not.toBe(data[1][0]);
    expect(encryptedData[1][0]).toContain('.');

    expect(typeof encryptedData[1][1]).toBe('string');
    expect(encryptedData[1][1]).not.toBe(data[1][1]);
    expect(encryptedData[1][1]).toContain('.');

    expect(typeof encryptedData[1][2].flag).toBe('string');
    expect(encryptedData[1][2].flag).not.toBe(data[1][2].flag);
    expect(encryptedData[1][2].flag).toContain('.');
  });

  test('should throw error if ENCRYPTION_KEY is missing', () => {
    // Temporarily unset key and re-initialize for this test
    const currentKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = '';
    // This call will internally set encryptionKey to null and throw, but we catch the subsequent error
    try { initializeEncryptionKeys(); } catch (e) { /* Ignore initialization error */ }

    const data = { value: 'test' };
    // Expect the main function to throw because keys are null internally
    expect(() => encryptJsonObject(data)).toThrow('Encryption Error: encryptJsonObject called, but encryption keys are not configured or are invalid.');

    // Restore key and re-initialize for subsequent tests
    process.env.ENCRYPTION_KEY = currentKey;
    initializeEncryptionKeys(); // Re-initialize with valid key
  });

  test('should throw error if ENCRYPTION_IV is missing', () => {
    // Temporarily unset IV and re-initialize for this test
    const currentIv = process.env.ENCRYPTION_IV;
    process.env.ENCRYPTION_IV = '';
    // This call will internally set encryptionIv to null and throw, but we catch the subsequent error
    try { initializeEncryptionKeys(); } catch (e) { /* Ignore initialization error */ }

    const data = { value: 'test' };
    // Expect the main function to throw because keys are null internally
    expect(() => encryptJsonObject(data)).toThrow('Encryption Error: encryptJsonObject called, but encryption keys are not configured or are invalid.');

    // Restore IV and re-initialize for subsequent tests
    process.env.ENCRYPTION_IV = currentIv;
    initializeEncryptionKeys(); // Re-initialize with valid IV
  });

  test('should handle empty object', () => {
    const data = {};
    const encryptedData = encryptJsonObject(data);
    expect(encryptedData).toEqual({});
  });

  test('should handle empty array', () => {
    const data = [];
    const encryptedData = encryptJsonObject(data);
    expect(encryptedData).toEqual([]);
  });

  test('should handle null input', () => {
    const data = null;
    const encryptedData = encryptJsonObject(data);
    expect(typeof encryptedData).toBe('string');
    expect(encryptedData).toContain('.');
  });

  test('should handle primitive input directly', () => {
    const dataString = 'just a string';
    const encryptedString = encryptJsonObject(dataString);
    expect(typeof encryptedString).toBe('string');
    expect(encryptedString).not.toBe(dataString);
    expect(encryptedString).toContain('.');

    const dataNumber = 123;
    const encryptedNumber = encryptJsonObject(dataNumber);
    expect(typeof encryptedNumber).toBe('string');
    expect(encryptedNumber).not.toBe(String(dataNumber));
    expect(encryptedNumber).toContain('.');

    const dataBoolean = false;
    const encryptedBoolean = encryptJsonObject(dataBoolean);
    expect(typeof encryptedBoolean).toBe('string');
    expect(encryptedBoolean).not.toBe(String(dataBoolean));
    expect(encryptedBoolean).toContain('.');
  });
});

describe('decryptJsonObject', () => {
  // Note: Key/IV setup is handled by the jest.mock at the top level

  test('should decrypt primitive values in a flat object', () => {
    const originalData = {
      name: 'Test User',
      age: 42,
      isActive: true,
      balance: 123.45,
      isNull: null,
    };
    const encryptedData = encryptJsonObject(originalData);
    const decryptedData = decryptJsonObject(encryptedData);
    console.log({originalData, encryptedData, decryptedData})
    expect(decryptedData).toEqual(originalData);
  });

  test('should decrypt primitive values in a nested object', () => {
    const originalData = {
      user: {
        name: 'Nested User',
        settings: {
          darkMode: false,
          theme: 'dark',
        },
      },
      id: 100,
    };
    const encryptedData = encryptJsonObject(originalData);
    const decryptedData = decryptJsonObject(encryptedData);
    expect(decryptedData).toEqual(originalData);
  });

  test('should decrypt primitive values in an object containing arrays', () => {
    const originalData = {
      items: ['item1', 2, true, null],
      nested: [
        { id: 1, value: 'a' },
        ['b', 3, { flag: true }],
      ],
    };
    const encryptedData = encryptJsonObject(originalData);
    const decryptedData = decryptJsonObject(encryptedData);
    expect(decryptedData).toEqual(originalData);
  });

   test('should decrypt primitive values within arrays directly', () => {
    const originalData = ['item1', 2, true, null, { nested: 'value' }];
    const encryptedData = encryptJsonObject(originalData);
    const decryptedData = decryptJsonObject(encryptedData);
    expect(decryptedData).toEqual(originalData);
  });

  test('should handle objects with a mix of encrypted and non-encrypted values', () => {
    const originalData = {
      plain: 'This is not encrypted',
      secret: 'Encrypt me',
      nested: {
        alsoPlain: 123,
        alsoSecret: true
      }
    };
    // Encrypt only the parts that need encryption
    const encryptedSecret = encryptJsonObject(originalData.secret);
    const encryptedNestedSecret = encryptJsonObject(originalData.nested.alsoSecret);


    const mixedData = {
      plain: originalData.plain,
      secret: encryptedSecret, // Use the individually encrypted value
      nested: {
        alsoPlain: originalData.nested.alsoPlain,
        alsoSecret: encryptedNestedSecret // Use the individually encrypted value
      }
    };

    const decryptedData = decryptJsonObject(mixedData);
    // We expect the decrypted data to match the original structure and values
    expect(decryptedData).toEqual(originalData);
    expect(decryptedData.plain).toBe(originalData.plain);
    expect(decryptedData.secret).toBe(originalData.secret);
    expect(decryptedData.nested.alsoPlain).toBe(originalData.nested.alsoPlain);
    expect(decryptedData.nested.alsoSecret).toBe(originalData.nested.alsoSecret);
  });


  test('should throw error if ENCRYPTION_KEY is missing during decryption', () => {
    const originalData = { value: 'test' };
    const encryptedData = encryptJsonObject(originalData); // Encrypt with valid keys first

    // Temporarily unset key and re-initialize for this test
    const currentKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = '';
    // This call will internally set encryptionKey to null and throw, but we catch the subsequent error
    try { initializeEncryptionKeys(); } catch (e) { /* Ignore initialization error */ }

    // Expect the main function to throw because keys are null internally
    expect(() => decryptJsonObject(encryptedData)).toThrow('Decryption Error: decryptJsonObject called, but encryption keys are not configured or are invalid.');

    // Restore key and re-initialize for subsequent tests
    process.env.ENCRYPTION_KEY = currentKey;
    initializeEncryptionKeys(); // Re-initialize with valid key
  });

  test('should throw error if ENCRYPTION_IV is missing during decryption', () => {
    const originalData = { value: 'test' };
    const encryptedData = encryptJsonObject(originalData); // Encrypt with valid keys first

    // Temporarily unset IV and re-initialize for this test
    const currentIv = process.env.ENCRYPTION_IV;
    process.env.ENCRYPTION_IV = '';
    // This call will internally set encryptionIv to null and throw, but we catch the subsequent error
    try { initializeEncryptionKeys(); } catch (e) { /* Ignore initialization error */ }

    // Expect the main function to throw because keys are null internally
    expect(() => decryptJsonObject(encryptedData)).toThrow('Decryption Error: decryptJsonObject called, but encryption keys are not configured or are invalid.');

    // Restore IV and re-initialize for subsequent tests
    process.env.ENCRYPTION_IV = currentIv;
    initializeEncryptionKeys(); // Re-initialize with valid IV
  });

  test('should return original data if input strings are not actually encrypted', () => {
    const data = {
      name: 'Plain String', // Does not contain '.' delimiter
      age: 50, // Not a string
      address: {
        street: '123 Main St', // Plain string
        city: 'Anytown.With.Dots' // Contains dots but not valid base64 auth tag
      },
      tags: ['tag1', 'tag2'] // Plain strings in array
    };
    const decryptedData = decryptJsonObject(data);
    // decryptJsonObject should leave non-encrypted strings and other types untouched
    expect(decryptedData).toEqual(data);
  });

  test('should handle empty object', () => {
    const data = {};
    const decryptedData = decryptJsonObject(data);
    expect(decryptedData).toEqual({});
  });

  test('should handle empty array', () => {
    const data = [];
    const decryptedData = decryptJsonObject(data);
    expect(decryptedData).toEqual([]);
  });

  test('should handle null input', () => {
    const data = null;
    const decryptedData = decryptJsonObject(data);
    // decryptJsonObject returns null directly if input is null
    expect(decryptedData).toBeNull();
  });

  test('should handle primitive inputs (non-strings)', () => {
    // decryptJsonObject returns non-object, non-string primitives directly
    expect(decryptJsonObject(123)).toBe(123);
    expect(decryptJsonObject(true)).toBe(true);
    expect(decryptJsonObject(false)).toBe(false);
    expect(decryptJsonObject(undefined)).toBeUndefined();
  });

  test('should handle primitive string input that is not encrypted', () => {
    const plainString = "this is just a plain string";
    // decryptJsonObject calls decryptValue, which returns the original string if not encrypted format
    expect(decryptJsonObject(plainString)).toBe(plainString);
  });

  test('should handle primitive string input that IS encrypted', () => {
    const originalString = "this will be encrypted";
    // Use encryptJsonObject which handles primitives by calling encryptValue
    const encryptedString = encryptJsonObject(originalString);
    expect(typeof encryptedString).toBe('string');
    expect(encryptedString).not.toBe(originalString);
    expect(encryptedString).toContain('.'); // Ensure it looks encrypted

    // Use decryptJsonObject which handles primitives by calling decryptValue
    const decryptedString = decryptJsonObject(encryptedString);
    expect(decryptedString).toBe(originalString);
  });

});