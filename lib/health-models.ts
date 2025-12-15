import { z } from 'zod';

// Health diagnostic result types
export const DiagnosticResultSchema = z.enum(['positive', 'negative', 'inconclusive']);
export type DiagnosticResult = z.infer<typeof DiagnosticResultSchema>;

// Minimal health data structure for blockchain storage
export const MinimalHealthDataSchema = z.object({
  timestamp: z.number().int().positive(),
  disease: z.string().min(1).max(100),
  result: DiagnosticResultSchema,
  patientDID: z.string().regex(/^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/),
});

export type MinimalHealthData = z.infer<typeof MinimalHealthDataSchema>;

// Extended health data structure (for local storage before encryption)
export const ExtendedHealthDataSchema = z.object({
  // Minimal data
  timestamp: z.number().int().positive(),
  disease: z.string().min(1).max(100),
  result: DiagnosticResultSchema,
  patientDID: z.string().regex(/^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/),

  // Additional metadata (not stored on blockchain)
  testType: z.string().min(1).max(50),
  labName: z.string().min(1).max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),

  // Privacy and consent
  dataRetentionPeriod: z.number().int().min(1).max(365).optional(), // days
  sharingConsent: z.boolean().default(false),
  insuranceClaimId: z.string().optional(),
});

export type ExtendedHealthData = z.infer<typeof ExtendedHealthDataSchema>;

// Insurance claim structure
export const InsuranceClaimSchema = z.object({
  claimId: z.string().uuid(),
  patientDID: z.string().regex(/^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  healthDataHash: z.string(), // Hash of minimal health data
  encryptedHealthData: z.string(), // AES-encrypted minimal data
  insuranceProviderDID: z.string().regex(/^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  claimAmount: z.number().positive(),
  currency: z.string().default('SOL'),
  status: z.enum(['pending', 'verified', 'paid', 'rejected']),
  timestamp: z.number().int().positive(),
  verificationTimestamp: z.number().int().positive().optional(),
  paymentTransactionId: z.string().optional(),
});

export type InsuranceClaim = z.infer<typeof InsuranceClaimSchema>;

// Patient consent structure
export const PatientConsentSchema = z.object({
  patientDID: z.string().regex(/^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  consentId: z.string().uuid(),
  consentedData: z.array(z.string()), // Types of data consented to share
  insuranceProviders: z.array(z.string().regex(/^did:solana:(mainnet|devnet|testnet):[1-9A-HJ-NP-Za-km-z]{32,44}$/)),
  validFrom: z.number().int().positive(),
  validUntil: z.number().int().positive(),
  revoked: z.boolean().default(false),
  timestamp: z.number().int().positive(),
});

export type PatientConsent = z.infer<typeof PatientConsentSchema>;

// Validation functions
export function validateMinimalHealthData(data: unknown): MinimalHealthData {
  return MinimalHealthDataSchema.parse(data);
}

export function validateExtendedHealthData(data: unknown): ExtendedHealthData {
  return ExtendedHealthDataSchema.parse(data);
}

export function validateInsuranceClaim(data: unknown): InsuranceClaim {
  return InsuranceClaimSchema.parse(data);
}

export function validatePatientConsent(data: unknown): PatientConsent {
  return PatientConsentSchema.parse(data);
}

// Safe validation functions (return null on error instead of throwing)
export function safeValidateMinimalHealthData(data: unknown): MinimalHealthData | null {
  try {
    return MinimalHealthDataSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateExtendedHealthData(data: unknown): ExtendedHealthData | null {
  try {
    return ExtendedHealthDataSchema.parse(data);
  } catch {
    return null;
  }
}

// Utility functions
export function createMinimalFromExtended(extended: ExtendedHealthData): MinimalHealthData {
  return {
    timestamp: extended.timestamp,
    disease: extended.disease,
    result: extended.result,
    patientDID: extended.patientDID,
  };
}

export function isConsentValid(consent: PatientConsent): boolean {
  const now = Date.now();
  return !consent.revoked &&
         consent.validFrom <= now &&
         consent.validUntil >= now;
}

export function canShareData(
  patientDID: string,
  insuranceProviderDID: string,
  dataType: string,
  consents: PatientConsent[]
): boolean {
  return consents.some(consent =>
    consent.patientDID === patientDID &&
    consent.insuranceProviders.includes(insuranceProviderDID) &&
    consent.consentedData.includes(dataType) &&
    isConsentValid(consent)
  );
}
