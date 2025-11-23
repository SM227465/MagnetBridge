/**
 * Crypto utilities for securely encrypting and decrypting sensitive data
 * Uses Web Crypto API available in Chrome extensions
 */

import type { CloudService } from './common.js';

// Generate a consistent encryption key based on extension's unique ID
// This ensures the same key is used across sessions
async function getEncryptionKey(): Promise<CryptoKey> {
  // Use a combination of extension ID and a static salt
  // In a real-world scenario, you might want to derive this from user-specific data
  const extensionId = chrome.runtime.id;
  const salt = 'magnetbridge-secure-v1'; // Version your salt for key rotation
  const keyMaterial = `${extensionId}-${salt}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // Import the key material
  const baseKey = await crypto.subtle.importKey('raw', keyData, 'PBKDF2', false, ['deriveBits', 'deriveKey']);

  // Derive a key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return key;
}

/**
 * Encrypts a string value using AES-GCM encryption
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded encrypted data with IV prepended
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    if (!plaintext) {
      return '';
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await getEncryptionKey();

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data,
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string value
 * @param encryptedData - Base64 encoded encrypted data with IV prepended
 * @returns Decrypted plaintext string
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData) {
      return '';
    }

    // Convert from base64
    const combined = base64ToArrayBuffer(encryptedData);

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const key = await getEncryptionKey();

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Converts an ArrayBuffer to a Base64 string
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Validates if a string appears to be encrypted (base64 format)
 */
export function isEncrypted(value: string | undefined): boolean {
  if (!value) return false;

  // Check if it's a valid base64 string and has minimum length
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 20;
}

/**
 * Encrypts sensitive fields in a CloudService object
 * @param service - The cloud service object
 * @returns CloudService with encrypted sensitive fields
 */
export async function encryptCloudService(service: CloudService): Promise<CloudService> {
  const encrypted = { ...service };

  if (service.apiKey && !isEncrypted(service.apiKey)) {
    encrypted.apiKey = await encryptData(service.apiKey);
  }

  if (service.email && !isEncrypted(service.email)) {
    encrypted.email = await encryptData(service.email);
  }

  if (service.password && !isEncrypted(service.password)) {
    encrypted.password = await encryptData(service.password);
  }

  return encrypted;
}

/**
 * Decrypts sensitive fields in a CloudService object
 * @param service - The cloud service object with encrypted fields
 * @returns CloudService with decrypted sensitive fields
 */
export async function decryptCloudService(service: CloudService): Promise<CloudService> {
  const decrypted = { ...service };

  if (service.apiKey && isEncrypted(service.apiKey)) {
    try {
      decrypted.apiKey = await decryptData(service.apiKey);
    } catch (error) {
      console.error('Failed to decrypt API key for service:', service.name);
      decrypted.apiKey = '';
    }
  }

  if (service.email && isEncrypted(service.email)) {
    try {
      decrypted.email = await decryptData(service.email);
    } catch (error) {
      console.error('Failed to decrypt email for service:', service.name);
      decrypted.email = '';
    }
  }

  if (service.password && isEncrypted(service.password)) {
    try {
      decrypted.password = await decryptData(service.password);
    } catch (error) {
      console.error('Failed to decrypt password for service:', service.name);
      decrypted.password = '';
    }
  }

  return decrypted;
}

/**
 * Encrypts an array of CloudService objects
 */
export async function encryptCloudServices(services: CloudService[]): Promise<CloudService[]> {
  return Promise.all(services.map(service => encryptCloudService(service)));
}

/**
 * Decrypts an array of CloudService objects
 */
export async function decryptCloudServices(services: CloudService[]): Promise<CloudService[]> {
  return Promise.all(services.map(service => decryptCloudService(service)));
}
