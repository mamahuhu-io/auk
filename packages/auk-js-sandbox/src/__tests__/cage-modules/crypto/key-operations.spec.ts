import { describe, expect, test } from "vitest"
import { runTestWithEmptyEnv } from "~/utils/test-helpers"

/**
 * Tests for crypto.subtle key-based operations:
 * - generateKey
 * - importKey
 * - exportKey
 * - encrypt/decrypt
 * - sign/verify
 */

describe("crypto.subtle.generateKey()", () => {
  test("should generate HMAC key for signing", () => {
    const script = `
      const key = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      auk.test("HMAC key generated successfully", () => {
        auk.expect(key).toBeType("object")
        auk.expect(key.type).toBe("secret")
        auk.expect(key.extractable).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "HMAC key generated successfully",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should generate AES-GCM key for encryption", () => {
    const script = `
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      auk.test("AES-GCM key generated successfully", () => {
        auk.expect(key).toBeType("object")
        auk.expect(key.type).toBe("secret")
        auk.expect(key.extractable).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "AES-GCM key generated successfully",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.subtle.importKey() and exportKey()", () => {
  test("should import raw HMAC key", () => {
    // Create a test key (32 bytes of data)
    const rawKeyBytes = Array.from({ length: 32 }, (_, i) => i)

    const script = `
      const rawKeyData = ${JSON.stringify(rawKeyBytes)}

      const key = await crypto.subtle.importKey(
        "raw",
        rawKeyData,
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      auk.test("Raw HMAC key imported successfully", () => {
        auk.expect(key).toBeType("object")
        auk.expect(key.type).toBe("secret")
        auk.expect(key.extractable).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Raw HMAC key imported successfully",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should export key in raw format", () => {
    const rawKeyBytes = Array.from({ length: 32 }, (_, i) => i)

    const script = `
      const rawKeyData = ${JSON.stringify(rawKeyBytes)}

      const key = await crypto.subtle.importKey(
        "raw",
        rawKeyData,
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      const exportedKey = await crypto.subtle.exportKey("raw", key)
      const exportedArray = Array.from(exportedKey)

      auk.test("Key exported successfully in raw format", () => {
        auk.expect(exportedArray.length).toBe(32)
        auk.expect(exportedArray[0]).toBe(0)
        auk.expect(exportedArray[31]).toBe(31)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Key exported successfully in raw format",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should import and export key in JWK format", () => {
    const script = `
      // Generate a key first
      const generatedKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      // Export as JWK
      const jwk = await crypto.subtle.exportKey("jwk", generatedKey)

      auk.test("Key exported as JWK successfully", () => {
        auk.expect(jwk).toBeType("object")
        auk.expect(jwk.kty).toBe("oct")
        auk.expect(jwk.k).toBeType("string")
        auk.expect(jwk.alg).toBe("A256GCM")
      })

      // Re-import the JWK
      const reimportedKey = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
      )

      auk.test("JWK reimported successfully", () => {
        auk.expect(reimportedKey).toBeType("object")
        auk.expect(reimportedKey.type).toBe("secret")
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Key exported as JWK successfully",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "JWK reimported successfully",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.subtle.encrypt() and decrypt()", () => {
  test("should encrypt and decrypt with AES-GCM", () => {
    const plainTextBytes = Array.from(new TextEncoder().encode("Hello, World!"))
    const ivBytes = Array.from({ length: 12 }, (_, i) => i) // 12-byte IV for AES-GCM

    const script = `
      const plainText = ${JSON.stringify(plainTextBytes)}
      const iv = ${JSON.stringify(ivBytes)}

      // Generate an AES-GCM key
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      // Encrypt the plaintext
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        plainText
      )

      auk.test("Encryption produces ciphertext", () => {
        auk.expect(ciphertext.length).toBeType("number")
        auk.expect(ciphertext.length > 0).toBe(true)
      })

      // Decrypt the ciphertext
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      )

      const decryptedText = new TextDecoder().decode(new Uint8Array(decrypted))

      auk.test("Decryption recovers original plaintext", () => {
        auk.expect(decryptedText).toBe("Hello, World!")
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Encryption produces ciphertext",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Decryption recovers original plaintext",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("encrypted data differs from plaintext", () => {
    const plainTextBytes = Array.from(
      new TextEncoder().encode("Secret message")
    )
    const ivBytes = Array.from({ length: 12 }, (_, i) => i + 100)

    const script = `
      const plainText = ${JSON.stringify(plainTextBytes)}
      const iv = ${JSON.stringify(ivBytes)}

      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        plainText
      )

      // Compare ciphertext to plaintext - they should be different
      const ciphertextArray = Array.from(ciphertext)
      const isDifferent = plainText.some((byte, i) => ciphertextArray[i] !== byte)

      auk.test("Ciphertext differs from plaintext", () => {
        auk.expect(isDifferent).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Ciphertext differs from plaintext",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.subtle.sign() and verify()", () => {
  test("should sign and verify with HMAC", () => {
    const dataBytes = Array.from(new TextEncoder().encode("Data to sign"))

    const script = `
      const data = ${JSON.stringify(dataBytes)}

      // Generate HMAC key
      const key = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      // Sign the data
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        data
      )

      auk.test("Signature is produced", () => {
        auk.expect(signature.length).toBe(32) // SHA-256 produces 32-byte signatures
        auk.expect(signature.byteLength).toBe(32)
      })

      // Verify the signature
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        data
      )

      auk.test("Signature verification succeeds", () => {
        auk.expect(isValid).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Signature is produced",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Signature verification succeeds",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("verification fails with tampered data", () => {
    const dataBytes = Array.from(new TextEncoder().encode("Original data"))
    const tamperedDataBytes = Array.from(
      new TextEncoder().encode("Tampered data")
    )

    const script = `
      const originalData = ${JSON.stringify(dataBytes)}
      const tamperedData = ${JSON.stringify(tamperedDataBytes)}

      const key = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      // Sign the original data
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        originalData
      )

      // Try to verify with tampered data
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        tamperedData
      )

      auk.test("Verification fails with tampered data", () => {
        auk.expect(isValid).toBe(false)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Verification fails with tampered data",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("verification fails with wrong key", () => {
    const dataBytes = Array.from(new TextEncoder().encode("Protected data"))

    const script = `
      const data = ${JSON.stringify(dataBytes)}

      // Generate two different keys
      const key1 = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      const key2 = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      )

      // Sign with key1
      const signature = await crypto.subtle.sign(
        "HMAC",
        key1,
        data
      )

      // Try to verify with key2
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key2,
        signature,
        data
      )

      auk.test("Verification fails with wrong key", () => {
        auk.expect(isValid).toBe(false)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Verification fails with wrong key",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.getRandomValues() validation", () => {
  test("should reject arrays exceeding 65536 bytes", () => {
    const script = `
      let errorThrown = false
      let errorMessage = ""

      try {
        const largeArray = new Array(65537).fill(0)
        crypto.getRandomValues(largeArray)
      } catch (e) {
        errorThrown = true
        errorMessage = e.message
      }

      auk.test("Throws error for oversized array", () => {
        auk.expect(errorThrown).toBe(true)
        auk.expect(errorMessage).toInclude("65536")
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Throws error for oversized array",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should accept array at exactly 65536 bytes", () => {
    const script = `
      const maxArray = new Array(65536).fill(0)
      const result = crypto.getRandomValues(maxArray)

      auk.test("Accepts 65536-byte array", () => {
        auk.expect(result.length).toBe(65536)
        // Check that at least some values were filled
        const hasNonZero = result.some(v => v !== 0)
        auk.expect(hasNonZero).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Accepts 65536-byte array",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.subtle.deriveBits() and deriveKey()", () => {
  test("should derive bits using PBKDF2", () => {
    const script = `
      // Import a password as key material
      const passwordKey = await crypto.subtle.importKey(
        "raw",
        [112, 97, 115, 115, 119, 111, 114, 100], // "password"
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      )

      // Derive 256 bits
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new Array(16).fill(1), // 16-byte salt
          iterations: 1000
        },
        passwordKey,
        256
      )

      auk.test("PBKDF2 deriveBits produces correct length", () => {
        auk.expect(derivedBits.length).toBe(32) // 256 bits = 32 bytes
        // Check that we got non-zero data
        auk.expect(derivedBits.some(b => b !== 0)).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "PBKDF2 deriveBits produces correct length",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should derive key using PBKDF2", () => {
    const script = `
      // Import password as key material
      const passwordKey = await crypto.subtle.importKey(
        "raw",
        [109, 121, 112, 97, 115, 115], // "mypass"
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      )

      // Derive an AES-GCM key
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new Array(16).fill(2),
          iterations: 1000
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      auk.test("PBKDF2 deriveKey produces usable AES key", () => {
        auk.expect(derivedKey).toBeType("object")
        auk.expect(derivedKey.type).toBe("secret")
        auk.expect(derivedKey.extractable).toBe(true)
      })

      // Test that the derived key actually works
      const testData = [116, 101, 115, 116] // "test"
      const iv = new Array(12).fill(0)

      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        derivedKey,
        testData
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        derivedKey,
        encrypted
      )

      auk.test("Derived key can encrypt and decrypt", () => {
        auk.expect(JSON.stringify(decrypted)).toBe(JSON.stringify(testData))
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "PBKDF2 deriveKey produces usable AES key",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Derived key can encrypt and decrypt",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.subtle.wrapKey() and unwrapKey()", () => {
  test("should wrap and unwrap AES key with AES-KW", () => {
    const script = `
      // Generate keys
      const aesKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      const wrappingKey = await crypto.subtle.generateKey(
        { name: "AES-KW", length: 256 },
        true,
        ["wrapKey", "unwrapKey"]
      )

      // Wrap the AES key
      const wrappedKey = await crypto.subtle.wrapKey(
        "raw",
        aesKey,
        wrappingKey,
        "AES-KW"
      )

      auk.test("Key wrapping produces wrapped data", () => {
        auk.expect(wrappedKey).toBeType("object")
        auk.expect(wrappedKey.length).toBe(40) // AES-256 key (32) + padding (8)
      })

      // Unwrap the key
      const unwrappedKey = await crypto.subtle.unwrapKey(
        "raw",
        wrappedKey,
        wrappingKey,
        "AES-KW",
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )

      auk.test("Unwrapped key is valid", () => {
        auk.expect(unwrappedKey).toBeType("object")
        auk.expect(unwrappedKey.type).toBe("secret")
        auk.expect(unwrappedKey.extractable).toBe(true)
      })

      // Test that unwrapped key works
      const testData = [117, 110, 119, 114, 97, 112] // "unwrap"
      const iv = new Array(12).fill(3)

      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        unwrappedKey,
        testData
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        unwrappedKey,
        encrypted
      )

      auk.test("Unwrapped key functions correctly", () => {
        auk.expect(JSON.stringify(decrypted)).toBe(JSON.stringify(testData))
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Key wrapping produces wrapped data",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Unwrapped key is valid",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Unwrapped key functions correctly",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should wrap and unwrap key with JWK format", () => {
    const script = `
      // Generate an AES key
      const aesKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 128 },
        true,
        ["encrypt", "decrypt"]
      )

      // Export to JWK for comparison
      const originalJwk = await crypto.subtle.exportKey("jwk", aesKey)

      // Generate wrapping key
      const wrappingKey = await crypto.subtle.generateKey(
        { name: "AES-KW", length: 128 },
        true,
        ["wrapKey", "unwrapKey"]
      )

      // Wrap the key as JWK
      const wrappedKey = await crypto.subtle.wrapKey(
        "jwk",
        aesKey,
        wrappingKey,
        "AES-KW"
      )

      auk.test("JWK wrapping produces data", () => {
        auk.expect(wrappedKey).toBeType("object")
        auk.expect(wrappedKey.length > 0).toBe(true)
      })

      // Unwrap the JWK
      const unwrappedKey = await crypto.subtle.unwrapKey(
        "jwk",
        wrappedKey,
        wrappingKey,
        "AES-KW",
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
      )

      auk.test("Unwrapped JWK key is valid", () => {
        auk.expect(unwrappedKey).toBeType("object")
        auk.expect(unwrappedKey.type).toBe("secret")
      })

      // Export unwrapped key and compare
      const unwrappedJwk = await crypto.subtle.exportKey("jwk", unwrappedKey)

      auk.test("Unwrapped key matches original", () => {
        auk.expect(unwrappedJwk.kty).toBe(originalJwk.kty)
        auk.expect(unwrappedJwk.alg).toBe(originalJwk.alg)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "JWK wrapping produces data",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Unwrapped JWK key is valid",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
          expect.objectContaining({
            descriptor: "Unwrapped key matches original",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})
