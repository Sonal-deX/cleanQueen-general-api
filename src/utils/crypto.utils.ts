import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encryptPayload(payload: object, key: string): string {
  if (Buffer.from(key, 'utf-8').length !== 32) {
    throw new Error('Encryption key must be 32 bytes long.');
  }
  const textPayload = JSON.stringify(payload);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'utf-8'), iv);

  let encrypted = cipher.update(textPayload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPayload(encryptedData: string, key: string): object | null {
    if (!encryptedData || Buffer.from(key, 'utf-8').length !== 32) {
        return null;
    }
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            return null; // Invalid format
        }
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'utf-8'), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return null; // Return null on decryption failure
    }
}
