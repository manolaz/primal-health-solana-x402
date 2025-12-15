import { PublicKey, Keypair } from '@solana/web3.js';
import { generatePatientDID, verifyDID, extractPublicKeyFromDID } from './encryption';

// DID Document structure following W3C DID specification adapted for Solana
export interface DIDDVerificationMethod {
  id: string;
  type: 'Ed25519VerificationKey2020' | 'SolanaVerificationKey2021';
  controller: string;
  publicKeyMultibase?: string;
  publicKeyBase58?: string;
}

export interface DIDDocument {
  '@context': string[];
  id: string;
  controller?: string;
  verificationMethod: DIDDVerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: DIDService[];
}

export interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string | Record<string, any>;
}

// Patient DID Manager class
export class PatientDIDManager {
  private keypair: Keypair;
  private did: string;

  constructor(keypair?: Keypair) {
    this.keypair = keypair || Keypair.generate();
    this.did = generatePatientDID(this.keypair.publicKey);
  }

  // Get the DID
  getDID(): string {
    return this.did;
  }

  // Get the public key
  getPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  // Get the keypair (use carefully - only for signing)
  getKeypair(): Keypair {
    return this.keypair;
  }

  // Create DID Document
  createDIDDocument(): DIDDocument {
    const verificationMethod: DIDDVerificationMethod = {
      id: `${this.did}#key-1`,
      type: 'SolanaVerificationKey2021',
      controller: this.did,
      publicKeyBase58: this.keypair.publicKey.toString(),
    };

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/security/suites/solana-2021/v1'
      ],
      id: this.did,
      verificationMethod: [verificationMethod],
      authentication: [`${this.did}#key-1`],
      assertionMethod: [`${this.did}#key-1`],
      keyAgreement: [`${this.did}#key-1`],
    };
  }

  // Sign data with the private key
  signData(data: Uint8Array): Uint8Array {
    // Import nacl for signing
    const nacl = require('tweetnacl');
    return nacl.sign.detached(data, this.keypair.secretKey);
  }

  // Verify signature
  verifySignature(data: Uint8Array, signature: Uint8Array): boolean {
    const nacl = require('tweetnacl');
    return nacl.sign.detached.verify(data, signature, this.keypair.publicKey.toBytes());
  }
}

// DID Registry for managing patient DIDs
export class DIDRegistry {
  private registry = new Map<string, DIDDocument>();

  // Register a new DID
  registerDID(manager: PatientDIDManager): void {
    const did = manager.getDID();
    const document = manager.createDIDDocument();
    this.registry.set(did, document);
  }

  // Get DID Document
  getDIDDocument(did: string): DIDDocument | null {
    return this.registry.get(did) || null;
  }

  // Check if DID exists
  exists(did: string): boolean {
    return this.registry.has(did);
  }

  // Resolve DID to document
  async resolveDID(did: string): Promise<DIDDocument | null> {
    // In a real implementation, this would query the blockchain or a DID registry
    // For now, return from local registry
    return this.getDIDDocument(did);
  }

  // Update DID Document (for key rotation, etc.)
  updateDIDDocument(did: string, document: DIDDocument): void {
    if (!this.exists(did)) {
      throw new Error('DID not found in registry');
    }
    this.registry.set(did, document);
  }
}

// Insurance Provider DID Manager
export class InsuranceProviderDIDManager extends PatientDIDManager {
  private providerName: string;
  private providerId: string;

  constructor(keypair?: Keypair, providerName?: string, providerId?: string) {
    super(keypair);
    this.providerName = providerName || 'Unknown Provider';
    this.providerId = providerId || 'unknown';
  }

  // Override DID Document creation for insurance providers
  createDIDDocument(): DIDDocument {
    const baseDocument = super.createDIDDocument();

    // Add insurance-specific service endpoints
    const service: DIDService = {
      id: `${this.getDID()}#insurance-service`,
      type: 'InsuranceVerificationService',
      serviceEndpoint: {
        name: this.providerName,
        id: this.providerId,
        verificationEndpoint: `/api/insurance/${this.providerId}/verify`,
        claimEndpoint: `/api/insurance/${this.providerId}/claim`,
      },
    };

    return {
      ...baseDocument,
      service: [service],
    };
  }

  getProviderName(): string {
    return this.providerName;
  }

  getProviderId(): string {
    return this.providerId;
  }
}

// Utility functions
export function createPatientDID(): PatientDIDManager {
  return new PatientDIDManager();
}

export function createPatientDIDFromKeypair(keypair: Keypair): PatientDIDManager {
  return new PatientDIDManager(keypair);
}

export function createInsuranceProviderDID(
  providerName: string,
  providerId: string,
  keypair?: Keypair
): InsuranceProviderDIDManager {
  return new InsuranceProviderDIDManager(keypair, providerName, providerId);
}

export function parseDID(did: string): {
  method: string;
  network: string;
  publicKey: PublicKey;
} {
  if (!verifyDID(did)) {
    throw new Error('Invalid DID format');
  }

  const parts = did.split(':');
  return {
    method: parts[1], // 'solana'
    network: parts[2], // 'mainnet', 'devnet', or 'testnet'
    publicKey: extractPublicKeyFromDID(did),
  };
}

export function isValidDID(did: string): boolean {
  return verifyDID(did);
}

// Global registry instance (in production, this would be decentralized)
export const globalDIDRegistry = new DIDRegistry();
