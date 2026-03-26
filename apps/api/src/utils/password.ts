import crypto from 'crypto';

/**
 * Password hashing using Argon2id algorithm (via native crypto)
 * 
 * Note: For production, consider using the 'argon2' npm package which provides
 * native Argon2id support. This implementation uses scrypt as a fallback
 * that provides similar security characteristics.
 * 
 * When the argon2 package is available:
 * - Install: npm install argon2
 * - Import: import argon2 from 'argon2'
 * - Hash: await argon2.hash(password, { type: argon2.argon2id })
 * - Verify: await argon2.verify(hash, password)
 */

// Scrypt parameters for high security (similar to Argon2id recommendations)
const SCRYPT_PARAMS = {
  N: 2 ** 16,  // CPU/memory cost parameter (65536)
  r: 8,        // Block size parameter
  p: 1,        // Parallelization parameter
  maxmem: 128 * 1024 * 1024,  // 128MB
};

const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

/**
 * Hash a password using scrypt (Argon2id alternative)
 * Returns a string in format: salt:hash (both base64 encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate random salt
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Hash the password
    crypto.scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_PARAMS.N,
        r: SCRYPT_PARAMS.r,
        p: SCRYPT_PARAMS.p,
        maxmem: SCRYPT_PARAMS.maxmem,
      },
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Combine salt and hash
        const combined = `${salt.toString('base64')}:${derivedKey.toString('base64')}`;
        resolve(combined);
      }
    );
  });
}

/**
 * Verify a password against a hash
 * Supports both scrypt (new) and bcrypt (legacy/seed) formats
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Check for bcrypt hash format first (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    console.log('Using bcrypt verification for hash');
    return verifyBcryptPassword(password, storedHash);
  }
  
  // Try scrypt format (salt:hash)
  return new Promise((resolve, reject) => {
    try {
      const [saltB64, hashB64] = storedHash.split(':');
      
      if (!saltB64 || !hashB64) {
        console.log('Invalid hash format - not bcrypt or scrypt');
        resolve(false);
        return;
      }
      
      const salt = Buffer.from(saltB64, 'base64');
      const expectedHash = Buffer.from(hashB64, 'base64');
      
      // Hash the input password with same salt
      crypto.scrypt(
        password,
        salt,
        KEY_LENGTH,
        {
          N: SCRYPT_PARAMS.N,
          r: SCRYPT_PARAMS.r,
          p: SCRYPT_PARAMS.p,
          maxmem: SCRYPT_PARAMS.maxmem,
        },
        (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Constant-time comparison
          resolve(crypto.timingSafeEqual(derivedKey, expectedHash));
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Legacy bcrypt verification for existing hashes
 */
async function verifyBcryptPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Use require for CommonJS compatibility with bcryptjs
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs');
    const result = await bcrypt.compare(password, hash);
    console.log(`bcrypt.compare result: ${result} for hash starting with: ${hash.substring(0, 10)}...`);
    return result;
  } catch (error) {
    console.error('bcrypt verification error:', error);
    return false;
  }
}

/**
 * Check if password meets minimum requirements
 * - At least 10 characters
 * - At least one letter
 * - At least one number
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check against common compromised passwords
  const commonPasswords = [
    'password123',
    'qwerty12345',
    '123456789',
    'password1234',
    'letmein1234',
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random token (for magic links, reset tokens, etc.)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
