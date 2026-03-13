import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';

const APP_NAME = process.env.APP_NAME || 'DataValidation';

/**
 * Generate a new TOTP secret for a user.
 * Returns { secret, otpauthUrl, qrCodeDataUrl, backupCodes }
 */
export async function generateTotpSecret(userEmail) {
  const secret = speakeasy.generateSecret({
    name:   `${APP_NAME} (${userEmail})`,
    length: 32,
  });

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
  const backupCodes   = generateBackupCodes();

  return {
    secret:        secret.base32,   // store this in user.totp.secret (encrypted ideally)
    otpauthUrl:    secret.otpauth_url,
    qrCodeDataUrl,                  // return to frontend so user can scan
    backupCodes,                    // hashed before storing, shown once to user
  };
}

/**
 * Verify a TOTP token against a stored secret.
 * Allows 1 step window (30s either side) to handle clock drift.
 */
export function verifyTotpToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token:    token.toString().replace(/\s/g, ''),
    window:   1,
  });
}

/**
 * Generate 8 one-time backup codes (10 chars each).
 * Return plaintext to show user once; store hashed versions.
 */
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()  // e.g. "A3F8C2D19E"
  );
}

/**
 * Hash a backup code for storage.
 */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');
}

/**
 * Verify a backup code against stored hashed codes.
 * Returns { valid, remainingCodes } — caller must save remainingCodes to DB.
 */
export function verifyBackupCode(inputCode, hashedCodes) {
  const hash  = hashBackupCode(inputCode);
  const index = hashedCodes.indexOf(hash);
  if (index === -1) return { valid: false, remainingCodes: hashedCodes };

  // Consume the code — remove it so it can't be reused
  const remaining = [...hashedCodes];
  remaining.splice(index, 1);
  return { valid: true, remainingCodes: remaining };
}

export default { generateTotpSecret, verifyTotpToken, generateBackupCodes, hashBackupCode, verifyBackupCode };