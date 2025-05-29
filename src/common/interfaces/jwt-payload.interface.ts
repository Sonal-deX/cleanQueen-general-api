import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    username: string;
}

// This represents the structure of the data WE encrypt/decrypt
export interface EncryptedPayloadData {
    userId: string;
    email: string;
    role: UserRole;
    username: string;
    // Add any other data you want in the encrypted part
}

// This represents the structure of the SIGNED JWT payload
export interface SignedJwtPayload {
    data: string; // The encrypted string
    iat?: number;
    exp?: number;
}
