'use client';

import { useState, useEffect } from 'react';
import { PatientConsent } from '@/lib/health-models';
import {
  globalPrivacySettingsManager,
  globalConsentManager,
  globalDataDeletionService,
  PrivacySettings,
  createDefaultConsent
} from '@/lib/consent';
import { PatientDIDManager, InsuranceProviderDIDManager } from '@/lib/did';

interface PrivacySettingsProps {
  patientDID?: string;
}

export function PrivacySettingsComponent({ patientDID }: PrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'consents' | 'data'>('settings');
  const [deletionStatus, setDeletionStatus] = useState<any>(null);

  useEffect(() => {
    loadPrivacyData();
  }, [patientDID]);

  const loadPrivacyData = () => {
    const did = patientDID || new PatientDIDManager().getDID();
    const privacySettings = globalPrivacySettingsManager.getPrivacySettings(did);
    const activeConsents = globalConsentManager.getActiveConsents(did);

    setSettings(privacySettings);
    setConsents(activeConsents);
    setIsLoading(false);
  };

  const updateSettings = (updates: Partial<PrivacySettings>) => {
    if (!settings) return;

    const newSettings = globalPrivacySettingsManager.updatePrivacySettings(
      settings.patientDID,
      updates
    );
    setSettings(newSettings);
  };

  const revokeConsent = (consentId: string) => {
    if (!settings) return;

    globalConsentManager.revokeConsent(settings.patientDID, consentId);
    loadPrivacyData(); // Refresh data
  };

  const grantNewConsent = () => {
    if (!settings) return;

    // Create insurance provider DID
    const insuranceProvider = new InsuranceProviderDIDManager(
      undefined,
      'Primal Health Insurance',
      'primal-health-insurance'
    );

    createDefaultConsent(settings.patientDID, insuranceProvider.getDID());
    loadPrivacyData(); // Refresh data
  };

  const requestDataDeletion = async () => {
    if (!settings) return;

    try {
      const result = await globalDataDeletionService.requestDataDeletion(settings.patientDID);
      setDeletionStatus(result);
    } catch (error) {
      console.error('Error requesting data deletion:', error);
    }
  };

  const exportData = async () => {
    if (!settings) return;

    try {
      const exportData = await globalDataDeletionService.exportPatientData(settings.patientDID);
      // Create download link
      const blob = new Blob([JSON.stringify(exportData.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return <div className="text-center py-8 text-gray-600">Unable to load privacy settings</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-4 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Privacy Settings
          </button>
          <button
            onClick={() => setActiveTab('consents')}
            className={`px-6 py-4 font-medium text-sm ${
              activeTab === 'consents'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Consents
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-4 font-medium text-sm ${
              activeTab === 'data'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Management
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Privacy Preferences</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Retention Policy
                </label>
                <select
                  value={settings.dataRetentionPolicy}
                  onChange={(e) => updateSettings({
                    dataRetentionPolicy: e.target.value as 'minimal' | 'standard' | 'extended'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="minimal">Minimal (30 days)</option>
                  <option value="standard">Standard (90 days)</option>
                  <option value="extended">Extended (365 days)</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoDelete"
                  checked={settings.autoDeleteAfterClaim}
                  onChange={(e) => updateSettings({
                    autoDeleteAfterClaim: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoDelete" className="ml-2 text-sm text-gray-700">
                  Automatically delete data after claim processing
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="explicitConsent"
                  checked={settings.requireExplicitConsent}
                  onChange={(e) => updateSettings({
                    requireExplicitConsent: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="explicitConsent" className="ml-2 text-sm text-gray-700">
                  Require explicit consent for each data sharing request
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymize"
                  checked={settings.anonymizeData}
                  onChange={(e) => updateSettings({
                    anonymizeData: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="anonymize" className="ml-2 text-sm text-gray-700">
                  Anonymize data before sharing with third parties
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="audit"
                  checked={settings.auditLogging}
                  onChange={(e) => updateSettings({
                    auditLogging: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="audit" className="ml-2 text-sm text-gray-700">
                  Enable audit logging of all data access and sharing activities
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Data Sharing Consents</h3>
              <button
                onClick={grantNewConsent}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Grant New Consent
              </button>
            </div>

            {consents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🔒</div>
                <p>No active consents found</p>
                <p className="text-sm mt-2">Grant consent to share your health data with insurance providers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consents.map((consent) => (
                  <div key={consent.consentId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Consent #{consent.consentId.slice(-8)}</h4>
                        <p className="text-sm text-gray-600">
                          Granted: {new Date(consent.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Valid until: {new Date(consent.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => revokeConsent(consent.consentId)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Revoke
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Data Types: </span>
                        <span className="text-sm text-gray-600">
                          {consent.consentedData.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Providers: </span>
                        <span className="text-sm text-gray-600">
                          {consent.insuranceProviders.length} authorized
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Export Your Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Download a copy of all your health data and consent records
                </p>
                <button
                  onClick={exportData}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📥 Export Data
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Delete Your Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently delete all your data from our systems
                </p>
                <button
                  onClick={requestDataDeletion}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ Request Deletion
                </button>
                {deletionStatus && (
                  <p className="text-xs text-gray-500 mt-2">
                    Deletion requested: {new Date(deletionStatus.estimatedCompletion).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                <div>
                  <h4 className="font-medium text-yellow-800">Important Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Data deletion is permanent and cannot be undone. Some data may be retained for legal compliance.
                    Blockchain-stored data cannot be deleted but can be anonymized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
