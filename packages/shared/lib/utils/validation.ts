/**
 * Input validation utilities for user-provided data
 * Helps prevent XSS, injection attacks, and invalid data
 */

import type { CloudService, SupportedCTSP } from './common.js';

/**
 * Validates if a string is a valid magnet link
 */
export function isValidMagnetLink(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Magnet links must start with magnet:?
  if (!url.startsWith('magnet:?')) {
    return false;
  }

  // Must contain xt parameter (eXact Topic) with URN
  const xtPattern = /[?&]xt=urn:[a-z0-9]+:[a-z0-9]{32,40}/i;
  if (!xtPattern.test(url)) {
    return false;
  }

  return true;
}

/**
 * Validates an API key format (basic validation)
 */
export function isValidApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Remove whitespace
  const trimmed = apiKey.trim();

  // API keys should be at least 10 characters and not contain suspicious characters
  if (trimmed.length < 10) {
    return false;
  }

  // Check for common invalid patterns
  if (/[<>'"`;(){}]/.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}

/**
 * Validates a password (basic strength check)
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Password should be at least 6 characters
  // Note: We don't enforce strong passwords as they come from external services
  return password.length >= 6;
}

/**
 * Sanitizes a string to prevent XSS attacks
 * Removes or escapes potentially dangerous HTML/JavaScript
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
    .trim();
}

/**
 * Validates a torrent name/title
 */
export function isValidTorrentName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Should not be too long (prevent DoS)
  if (name.length > 500) {
    return false;
  }

  // Should not contain suspicious patterns
  if (/<script|javascript:|on\w+=/i.test(name)) {
    return false;
  }

  return true;
}

/**
 * Validates a URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates if a service type is supported
 */
export function isValidServiceType(type: string): type is SupportedCTSP {
  const validTypes: SupportedCTSP[] = ['', 'real-debrid', 'putio', 'seedr', 'torbox', 'bitport', 'custom'];
  return validTypes.includes(type as SupportedCTSP);
}

/**
 * Validates a complete CloudService configuration
 * Returns an object with validation result and error message
 */
export function validateCloudService(service: Partial<CloudService>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate required fields
  if (!service.name || typeof service.name !== 'string' || service.name.trim().length === 0) {
    errors.push('Service name is required');
  } else if (service.name.length > 100) {
    errors.push('Service name is too long (max 100 characters)');
  }

  if (!service.url || !isValidUrl(service.url)) {
    errors.push('Valid service URL is required (must be http or https)');
  }

  if (!service.type || !isValidServiceType(service.type)) {
    errors.push('Invalid service type');
  }

  if (!service.api || typeof service.api !== 'string' || service.api.trim().length === 0) {
    errors.push('API endpoint is required');
  }

  // Validate credentials based on service type
  if (service.type === 'seedr') {
    // Seedr requires email and password
    if (!service.email || !isValidEmail(service.email)) {
      errors.push('Valid email is required for Seedr');
    }
    if (!service.password || !isValidPassword(service.password)) {
      errors.push('Password is required for Seedr (minimum 6 characters)');
    }
  } else if (service.type) {
    // Other services require API key
    if (!service.apiKey || !isValidApiKey(service.apiKey)) {
      errors.push('Valid API key is required (minimum 10 characters)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a magnet link object
 */
export function validateMagnetLink(link: {
  url: string;
  title?: string;
  seeds?: number | string;
  peers?: number | string;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isValidMagnetLink(link.url)) {
    errors.push('Invalid magnet link format');
  }

  if (link.title && !isValidTorrentName(link.title)) {
    errors.push('Invalid torrent name');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes seeds/peers to numbers
 */
export function normalizeCount(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? undefined : Math.max(0, parsed);
  }

  return undefined;
}

/**
 * Sanitizes and validates torrent metadata
 */
export function sanitizeTorrentMetadata(metadata: {
  title?: string;
  seeds?: number | string;
  peers?: number | string;
  formatedSize?: string;
}): {
  title: string;
  seeds?: number;
  peers?: number;
  formatedSize?: string;
} {
  return {
    title: metadata.title ? sanitizeString(metadata.title) : 'Unnamed Torrent',
    seeds: normalizeCount(metadata.seeds),
    peers: normalizeCount(metadata.peers),
    formatedSize: metadata.formatedSize ? sanitizeString(metadata.formatedSize) : undefined,
  };
}
