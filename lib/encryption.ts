import CryptoJS from 'crypto-js';
import nacl from 'tweetnacl';
import { PublicKey, Keypair } from '@solana/web3.js';

/**
 * Encryption utilities for secure health data handling
 * Implements AES-256 encryption and Solana-compatible key management
 */

// Generate a random AES key
export function generateAESKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

// Encrypt data using AES-256
export function encryptAES(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

// Decrypt data using AES-256
export function decryptAES(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Generate Solana keypair for asymmetric encryption
export function generateKeypair(): Keypair {
  return Keypair.generate();
}

// Encrypt data using recipient's public key (asymmetric encryption)
export function encryptAsymmetric(data: string, recipientPublicKey: PublicKey): { encrypted: Uint8Array; nonce: Uint8Array } {
  const messageBytes = new TextEncoder().encode(data);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Generate ephemeral keypair for this encryption
  const ephemeralKeypair = nacl.box.keyPair();

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientPublicKey.toBytes(),
    ephemeralKeypair.secretKey
  );

  return {
    encrypted,
    nonce
  };
}

// Decrypt data using recipient's private key (asymmetric decryption)
export function decryptAsymmetric(
  encryptedData: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array
): string {
  const decrypted = nacl.box.open(
    encryptedData,
    nonce,
    senderPublicKey,
    recipientPrivateKey
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt data - invalid keys or corrupted data');
  }

  return new TextDecoder().decode(decrypted);
}

// Create a hash of health data for integrity verification
export function hashHealthData(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

// Verify data integrity using hash
export function verifyDataIntegrity(data: string, hash: string): boolean {
  return hashHealthData(data) === hash;
}

// Encrypt minimal health data for blockchain storage
export interface MinimalHealthData {
  timestamp: number;
  disease: string;
  result: 'positive' | 'negative' | 'inconclusive';
  patientDID: string;
}

export function encryptHealthDataForBlockchain(
  data: MinimalHealthData,
  encryptionKey: string
): string {
  const dataString = JSON.stringify(data);
  return encryptAES(dataString, encryptionKey);
}

export function decryptHealthDataFromBlockchain(
  encryptedData: string,
  encryptionKey: string
): MinimalHealthData {
  const decryptedString = decryptAES(encryptedData, encryptionKey);
  return JSON.parse(decryptedString);
}

// Generate patient DID from Solana public key
export function generatePatientDID(publicKey: PublicKey): string {
  // DID format: did:solana:<network>:<publicKey>
  return `did:solana:mainnet:${publicKey.toString()}`;
}

// Verify DID format
export function verifyDID(did: string): boolean {
  const didRegex = /^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return didRegex.test(did);
}

// Extract public key from DID
export function extractPublicKeyFromDID(did: string): PublicKey {
  if (!verifyDID(did)) {
    throw new Error('Invalid DID format');
  }

  const parts = did.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid DID structure');
  }

  return new PublicKey(parts[3]);
}
