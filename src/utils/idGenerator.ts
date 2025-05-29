import * as crypto from 'crypto';

export function generateUniqueId(length: number): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const buffer = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters.charAt(buffer[i] % characters.length);
  }
  return result;
}

export function generateProjectCode(): string {
  const part1 = generateUniqueId(3);
  const part2 = generateUniqueId(3);
  return `${part1.toUpperCase()}-${part2.toUpperCase()}`;
}

export const generateUserAndProjectAndReviewId = (): string => generateUniqueId(6);
export const generateTaskId = (): string => generateUniqueId(8);
export const generatePassword = (): string => generateUniqueId(10); // For supervisors
