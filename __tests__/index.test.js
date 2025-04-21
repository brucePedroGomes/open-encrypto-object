const crypto = require('crypto');

// Mock environment variables for testing
const mockTestKey = crypto.randomBytes(32).toString('hex'); // Renamed variable
const mockTestIv = crypto.randomBytes(16).toString('hex'); // Renamed variable

// Import the service class
const { EncryptoService } = require('../src/index');

// Instantiate the service once for all tests
let encryptoService;

try {
  encryptoService = new EncryptoService(mockTestKey, mockTestIv);
} catch (error) {
  console.error("Failed to initialize EncryptoService in tests:", error);
  // If initialization fails, tests depending on it will likely fail,
  // which is the desired outcome in this scenario.
  // We might throw here to halt tests if initialization is critical.
  throw new Error(`Test setup failed: Could not instantiate EncryptoService - ${error.message}`);
}


describe('encryptJsonObject', () => {
  // Service is instantiated above, no need for beforeAll/afterAll for env vars/init

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

    const encryptedData = encryptoService.encryptJsonObject(data);

    // console.log({data, encryptedData, mockTestKey, mockTestIv }) // Keep console log commented out unless debugging

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

    const encryptedData = encryptoService.encryptJsonObject(data);

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

    const encryptedData = encryptoService.encryptJsonObject(data);

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

    const encryptedData = encryptoService.encryptJsonObject(data);

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

  // Removed tests for missing ENV VARS as initialization is now via constructor
  // The constructor itself throws errors for invalid keys/IVs, which could be tested separately if needed.

  test('should handle empty object', () => {
    const data = {};
    const encryptedData = encryptoService.encryptJsonObject(data);
    expect(encryptedData).toEqual({});
  });

  test('should handle empty array', () => {
    const data = [];
    const encryptedData = encryptoService.encryptJsonObject(data);
    expect(encryptedData).toEqual([]);
  });

  test('should handle null input', () => {
    const data = null;
    const encryptedData = encryptoService.encryptJsonObject(data);
    expect(typeof encryptedData).toBe('string');
    expect(encryptedData).toContain('.'); // Null becomes an encrypted string
  });

  test('should handle primitive input directly', () => {
    const dataString = 'just a string';
    const encryptedString = encryptoService.encryptJsonObject(dataString);
    expect(typeof encryptedString).toBe('string');
    expect(encryptedString).not.toBe(dataString);
    expect(encryptedString).toContain('.');

    const dataNumber = 123;
    const encryptedNumber = encryptoService.encryptJsonObject(dataNumber);
    expect(typeof encryptedNumber).toBe('string');
    expect(encryptedNumber).not.toBe(String(dataNumber));
    expect(encryptedNumber).toContain('.');

    const dataBoolean = false;
    const encryptedBoolean = encryptoService.encryptJsonObject(dataBoolean);
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
    const encryptedData = encryptoService.encryptJsonObject(originalData);
    const decryptedData = encryptoService.decryptJsonObject(encryptedData);
    // console.log({originalData, encryptedData, decryptedData}) // Keep commented out
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
    const encryptedData = encryptoService.encryptJsonObject(originalData);
    const decryptedData = encryptoService.decryptJsonObject(encryptedData);
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
    const encryptedData = encryptoService.encryptJsonObject(originalData);
    const decryptedData = encryptoService.decryptJsonObject(encryptedData);
    expect(decryptedData).toEqual(originalData);
  });

   test('should decrypt primitive values within arrays directly', () => {
    const originalData = ['item1', 2, true, null, { nested: 'value' }];
    const encryptedData = encryptoService.encryptJsonObject(originalData);
    const decryptedData = encryptoService.decryptJsonObject(encryptedData);
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
    // Encrypt only the parts that need encryption using the service instance
    const encryptedSecret = encryptoService.encryptJsonObject(originalData.secret);
    const encryptedNestedSecret = encryptoService.encryptJsonObject(originalData.nested.alsoSecret);


    const mixedData = {
      plain: originalData.plain,
      secret: encryptedSecret, // Use the individually encrypted value
      nested: {
        alsoPlain: originalData.nested.alsoPlain,
        alsoSecret: encryptedNestedSecret // Use the individually encrypted value
      }
    };

    const decryptedData = encryptoService.decryptJsonObject(mixedData);
    // We expect the decrypted data to match the original structure and values
    expect(decryptedData).toEqual(originalData);
    expect(decryptedData.plain).toBe(originalData.plain);
    expect(decryptedData.secret).toBe(originalData.secret);
    expect(decryptedData.nested.alsoPlain).toBe(originalData.nested.alsoPlain);
    expect(decryptedData.nested.alsoSecret).toBe(originalData.nested.alsoSecret);
  });


  // Removed tests for missing ENV VARS during decryption as initialization is now via constructor


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
    const decryptedData = encryptoService.decryptJsonObject(data);
    // decryptJsonObject should leave non-encrypted strings and other types untouched
    expect(decryptedData).toEqual(data);
  });

  test('should handle empty object', () => {
    const data = {};
    const decryptedData = encryptoService.decryptJsonObject(data);
    expect(decryptedData).toEqual({});
  });

  test('should handle empty array', () => {
    const data = [];
    const decryptedData = encryptoService.decryptJsonObject(data);
    expect(decryptedData).toEqual([]);
  });

  test('should handle null input', () => {
    const data = null;
    const decryptedData = encryptoService.decryptJsonObject(data);
    // decryptJsonObject returns null directly if input is null
    expect(decryptedData).toBeNull();
  });

  test('should handle primitive inputs (non-strings)', () => {
    // decryptJsonObject returns non-object, non-string primitives directly
    expect(encryptoService.decryptJsonObject(123)).toBe(123);
    expect(encryptoService.decryptJsonObject(true)).toBe(true);
    expect(encryptoService.decryptJsonObject(false)).toBe(false);
    expect(encryptoService.decryptJsonObject(undefined)).toBeUndefined();
  });

  test('should handle primitive string input that is not encrypted', () => {
    const plainString = "this is just a plain string";
    // decryptJsonObject calls decryptValue, which returns the original string if not encrypted format
    expect(encryptoService.decryptJsonObject(plainString)).toBe(plainString);
  });

  test('should handle primitive string input that IS encrypted', () => {
    const originalString = "this will be encrypted";
    // Use encryptJsonObject which handles primitives by calling encryptValue
    const encryptedString = encryptoService.encryptJsonObject(originalString);
    expect(typeof encryptedString).toBe('string');
    expect(encryptedString).not.toBe(originalString);
    expect(encryptedString).toContain('.'); // Ensure it looks encrypted

    // Use decryptJsonObject which handles primitives by calling decryptValue
    const decryptedString = encryptoService.decryptJsonObject(encryptedString);
    expect(decryptedString).toBe(originalString);
  });

});