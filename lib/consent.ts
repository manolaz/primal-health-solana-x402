import { PatientConsent, validatePatientConsent, canShareData } from './health-models';
import { PatientDIDManager, InsuranceProviderDIDManager, globalDIDRegistry } from './did';

// Consent management service
export class ConsentManager {
  private consents = new Map<string, PatientConsent[]>();

  // Grant consent for data sharing
  grantConsent(
    patientDID: string,
    consentedData: string[],
    insuranceProviders: string[],
    validUntil: number
  ): PatientConsent {
    const consent: PatientConsent = {
      patientDID,
      consentId: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      consentedData,
      insuranceProviders,
      validFrom: Date.now(),
      validUntil,
      revoked: false,
      timestamp: Date.now(),
    };

    validatePatientConsent(consent);

    if (!this.consents.has(patientDID)) {
      this.consents.set(patientDID, []);
    }

    this.consents.get(patientDID)!.push(consent);

    // Register with global registry
    globalDIDRegistry.registerDID(new PatientDIDManager());

    return consent;
  }

  // Revoke consent
  revokeConsent(patientDID: string, consentId: string): boolean {
    const patientConsents = this.consents.get(patientDID);
    if (!patientConsents) return false;

    const consent = patientConsents.find(c => c.consentId === consentId);
    if (!consent) return false;

    consent.revoked = true;
    return true;
  }

  // Check if data can be shared
  canShareDataWithProvider(
    patientDID: string,
    insuranceProviderDID: string,
    dataType: string
  ): boolean {
    const patientConsents = this.consents.get(patientDID) || [];
    return canShareData(patientDID, insuranceProviderDID, dataType, patientConsents);
  }

  // Get active consents for a patient
  getActiveConsents(patientDID: string): PatientConsent[] {
    const patientConsents = this.consents.get(patientDID) || [];
    return patientConsents.filter(consent =>
      !consent.revoked &&
      consent.validFrom <= Date.now() &&
      consent.validUntil >= Date.now()
    );
  }

  // Get all consents for a patient (including expired/revoked)
  getAllConsents(patientDID: string): PatientConsent[] {
    return this.consents.get(patientDID) || [];
  }

  // Update consent (extend validity, modify data types, etc.)
  updateConsent(
    patientDID: string,
    consentId: string,
    updates: Partial<Pick<PatientConsent, 'consentedData' | 'insuranceProviders' | 'validUntil'>>
  ): boolean {
    const patientConsents = this.consents.get(patientDID);
    if (!patientConsents) return false;

    const consent = patientConsents.find(c => c.consentId === consentId);
    if (!consent) return false;

    if (updates.consentedData) consent.consentedData = updates.consentedData;
    if (updates.insuranceProviders) consent.insuranceProviders = updates.insuranceProviders;
    if (updates.validUntil) consent.validUntil = updates.validUntil;

    return true;
  }

  // Get consent audit trail
  getConsentAuditTrail(patientDID: string): Array<{
    consentId: string;
    action: 'granted' | 'revoked' | 'updated';
    timestamp: number;
    details?: any;
  }> {
    // In a real implementation, this would track all consent actions
    // For now, return mock data
    return [
      {
        consentId: 'consent_123',
        action: 'granted',
        timestamp: Date.now() - 86400000,
        details: { dataTypes: ['disease', 'result'], providers: ['insurance_001'] }
      }
    ];
  }
}

// Privacy settings management
export interface PrivacySettings {
  patientDID: string;
  dataRetentionPolicy: 'minimal' | 'standard' | 'extended'; // 30, 90, 365 days
  autoDeleteAfterClaim: boolean;
  requireExplicitConsent: boolean;
  anonymizeData: boolean;
  auditLogging: boolean;
  lastUpdated: number;
}

export class PrivacySettingsManager {
  private settings = new Map<string, PrivacySettings>();

  // Get or create default privacy settings
  getPrivacySettings(patientDID: string): PrivacySettings {
    if (!this.settings.has(patientDID)) {
      // Create default settings
      const defaultSettings: PrivacySettings = {
        patientDID,
        dataRetentionPolicy: 'standard',
        autoDeleteAfterClaim: true,
        requireExplicitConsent: true,
        anonymizeData: false,
        auditLogging: true,
        lastUpdated: Date.now(),
      };
      this.settings.set(patientDID, defaultSettings);
    }
    return this.settings.get(patientDID)!;
  }

  // Update privacy settings
  updatePrivacySettings(patientDID: string, updates: Partial<PrivacySettings>): PrivacySettings {
    const currentSettings = this.getPrivacySettings(patientDID);
    const newSettings = {
      ...currentSettings,
      ...updates,
      patientDID,
      lastUpdated: Date.now(),
    };
    this.settings.set(patientDID, newSettings);
    return newSettings;
  }

  // Get data retention period in days
  getRetentionPeriodDays(settings: PrivacySettings): number {
    const periods = {
      minimal: 30,
      standard: 90,
      extended: 365,
    };
    return periods[settings.dataRetentionPolicy];
  }

  // Check if data should be deleted
  shouldDeleteData(dataTimestamp: number, settings: PrivacySettings): boolean {
    const retentionDays = this.getRetentionPeriodDays(settings);
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    return (Date.now() - dataTimestamp) > retentionMs;
  }
}

// Data deletion service
export class DataDeletionService {
  // Request data deletion
  async requestDataDeletion(patientDID: string): Promise<{
    success: boolean;
    deletionId: string;
    estimatedCompletion: number;
  }> {
    // In production, this would queue data deletion across all systems
    const deletionId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      deletionId,
      estimatedCompletion: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  // Check deletion status
  async getDeletionStatus(deletionId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    completedAt?: number;
  }> {
    // Mock status - in production would check actual deletion progress
    return {
      status: 'completed',
      progress: 100,
      completedAt: Date.now() - 3600000,
    };
  }

  // Get data portability export
  async exportPatientData(patientDID: string): Promise<{
    data: any;
    format: 'json' | 'csv';
    timestamp: number;
  }> {
    // Mock export - in production would gather all patient data
    const mockData = {
      patientDID,
      consents: [],
      claims: [],
      healthData: [],
      exportedAt: Date.now(),
    };

    return {
      data: mockData,
      format: 'json',
      timestamp: Date.now(),
    };
  }
}

// Global instances (in production, these would be databases/microservices)
export const globalConsentManager = new ConsentManager();
export const globalPrivacySettingsManager = new PrivacySettingsManager();
export const globalDataDeletionService = new DataDeletionService();

// Utility functions
export function createDefaultConsent(
  patientDID: string,
  insuranceProviderDID: string
): PatientConsent {
  return globalConsentManager.grantConsent(
    patientDID,
    ['disease', 'result', 'timestamp'], // Minimal data sharing
    [insuranceProviderDID],
    Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year validity
  );
}

export function checkDataSharingPermissions(
  patientDID: string,
  insuranceProviderDID: string,
  dataType: string
): boolean {
  return globalConsentManager.canShareDataWithProvider(
    patientDID,
    insuranceProviderDID,
    dataType
  );
}
