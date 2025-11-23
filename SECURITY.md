# Security Implementation

## Overview

MagnetBridge implements several security measures to protect user data and prevent common web vulnerabilities.

## Implemented Security Features

### 1. Credential Encryption (AES-256-GCM)

All sensitive user data (API keys, passwords, emails) are encrypted before being stored in Chrome Sync Storage.

**Implementation**: `packages/shared/lib/utils/crypto.ts`

- **Algorithm**: AES-GCM with 256-bit keys
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV**: Randomly generated 12-byte initialization vector per encryption
- **Storage**: Encrypted data stored as Base64 strings

**Usage**:
```typescript
import { encryptCloudServices, decryptCloudServices } from '@extension/shared';

// Before storing
const encryptedServices = await encryptCloudServices(services);
await chrome.storage.sync.set({ cloudServices: encryptedServices });

// After retrieval
const decryptedServices = await decryptCloudServices(storedServices);
```

**Key Features**:
- Automatic encryption detection (won't double-encrypt)
- Graceful error handling for decryption failures
- Extension ID-based key derivation (unique per installation)
- Versioned salt for key rotation capability

### 2. Input Validation

Comprehensive validation for all user inputs to prevent injection attacks and invalid data.

**Implementation**: `packages/shared/lib/utils/validation.ts`

**Validates**:
- Magnet link format (must start with `magnet:?` and contain `xt=urn:`)
- API keys (minimum length, no suspicious characters)
- Email addresses (proper format)
- Passwords (minimum length requirements)
- URLs (only http/https protocols allowed)
- Service types (whitelist validation)
- Torrent names (XSS prevention, length limits)

**Usage**:
```typescript
import { validateCloudService, isValidMagnetLink } from '@extension/shared';

// Validate cloud service configuration
const validation = validateCloudService(service);
if (!validation.valid) {
  console.error(validation.errors);
  return;
}

// Validate magnet link
if (!isValidMagnetLink(url)) {
  console.error('Invalid magnet link');
  return;
}
```

### 3. XSS Prevention

All user-provided and web-scraped content is sanitized before rendering.

**Implementation**: `packages/shared/lib/utils/validation.ts` - `sanitizeString()` and `sanitizeTorrentMetadata()`

**Sanitization Rules**:
- Remove angle brackets (`<>`)
- Remove `javascript:` protocol
- Remove inline event handlers (`onclick=`, `onerror=`, etc.)
- Normalize seeds/peers to numbers
- Limit torrent name length (max 500 characters)

**Usage**:
```typescript
import { sanitizeTorrentMetadata } from '@extension/shared';

const sanitized = sanitizeTorrentMetadata({
  title: untrustedTitle,
  seeds: untrustedSeeds,
  peers: untrustedPeers,
});
```

### 4. Error Handling

All crypto operations, DOM queries, and API calls are wrapped in try-catch blocks.

**Features**:
- Graceful degradation on decryption failure
- User-friendly error messages
- Console logging for debugging
- No sensitive data in error messages

## Security Best Practices

### For Users

1. **API Keys**: Store only necessary API keys. Remove unused services.
2. **Updates**: Keep the extension updated to receive security patches.
3. **Permissions**: Extension only requests necessary permissions.

### For Developers

1. **Never log sensitive data**: Passwords, API keys should never appear in console.log
2. **Validate all inputs**: Use validation utilities before processing user data
3. **Encrypt before storing**: Always use encryption utilities for sensitive data
4. **Sanitize untrusted content**: Web-scraped content must be sanitized
5. **Use HTTPS**: All external API calls must use HTTPS

## Known Limitations

1. **Extension ID-based encryption**: If extension is reinstalled, old data cannot be decrypted
2. **Chrome Sync Storage limits**: 100KB total, 8KB per item
3. **CORS restrictions**: API calls subject to CORS policies
4. **External API dependency**: Torrent metadata API is a potential single point of failure

## Future Improvements

1. **User-provided encryption password**: Optional user password for additional security
2. **Certificate pinning**: For API calls to cloud services
3. **Content Security Policy**: Add strict CSP to manifest
4. **Restricted permissions**: Limit host_permissions to specific torrent sites
5. **API response validation**: Runtime validation with Zod or similar
6. **Rate limiting**: Prevent abuse of metadata API
7. **Audit logging**: Track security-relevant events

## Reporting Security Issues

If you discover a security vulnerability, please:
1. **Do not** open a public issue
2. Email the maintainer directly
3. Provide detailed reproduction steps
4. Allow reasonable time for a fix before disclosure

## Security Audit History

- **2025-11**: Initial security implementation (encryption, validation, XSS prevention)

## References

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Chrome Storage Security](https://developer.chrome.com/docs/extensions/reference/storage)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
