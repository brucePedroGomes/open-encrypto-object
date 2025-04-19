const crypto = require('crypto');

// Mock environment variables for testing
const mockTestKey = crypto.randomBytes(32).toString('hex'); // Renamed variable
const mockTestIv = crypto.randomBytes(16).toString('hex'); // Renamed variable

// Use jest.mock to control the module loading and environment setup
jest.mock('../src/index', () => {
  const originalModule = jest.requireActual('../src/index');

  // Set environment variables before initializing keys in the actual module
  process.env.ENCRYPTION_KEY = mockTestKey; // Use renamed variable
  process.env.ENCRYPTION_IV = mockTestIv; // Use renamed variable

  // Initialize keys in the actual module
  originalModule.initializeEncryptionKeys();

  return originalModule;
});

// Require the mocked module after the mock is defined
const { encryptJsonObject, initializeEncryptionKeys } = require('../src/index');


describe('encryptJsonObject', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment variables
    originalEnv = process.env;
    // The jest.mock block above handles setting the test environment variables
    // and initializing the keys for the initial module load.
    // No need to re-set or re-initialize here for the primary test cases.
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
    // Re-initialize keys with original environment variables for subsequent tests if any
    initializeEncryptionKeys();
  });

  test('should encrypt primitive values in a flat object', () => {
    const data = {
      name: 'Test User',
      age: 42,
      isActive: true,
      balance: 123.45,
      isNull: null,
    };

    const encryptedData = encryptJsonObject(data);

    console.log({data, encryptedData})

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

  test('should return original data if ENCRYPTION_KEY is missing', () => {
    // Temporarily unset key and re-initialize for this test
    const currentKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = '';
    initializeEncryptionKeys();

    const data = { value: 'test' };
    const encryptedData = encryptJsonObject(data);
    expect(encryptedData).toEqual(data); // Should return original data

    // Restore key and re-initialize for subsequent tests
    process.env.ENCRYPTION_KEY = currentKey;
    initializeEncryptionKeys();
  });

  test('should return original data if ENCRYPTION_IV is missing', () => {
    // Temporarily unset IV and re-initialize for this test
    const currentIv = process.env.ENCRYPTION_IV;
    process.env.ENCRYPTION_IV = '';
    initializeEncryptionKeys();

    const data = { value: 'test' };
    const encryptedData = encryptJsonObject(data);
    expect(encryptedData).toEqual(data); // Should return original data

    // Restore IV and re-initialize for subsequent tests
    process.env.ENCRYPTION_IV = currentIv;
    initializeEncryptionKeys();
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