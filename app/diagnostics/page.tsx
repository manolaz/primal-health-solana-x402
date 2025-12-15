'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExtendedHealthData, validateExtendedHealthData } from '@/lib/health-models';
import { PatientDIDManager } from '@/lib/did';
import { generateAESKey, encryptHealthDataForBlockchain, hashHealthData } from '@/lib/encryption';
import { storeHealthDataOnChain } from '@/lib/solana-storage';
import { Keypair } from '@solana/web3.js';

export default function DiagnosticsPage() {
  const [formData, setFormData] = useState<Partial<ExtendedHealthData>>({
    timestamp: Date.now(),
    sharingConsent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');

  const handleInputChange = (field: keyof ExtendedHealthData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateNewKey = () => {
    const key = generateAESKey();
    setEncryptionKey(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Validate form data
      const healthData: ExtendedHealthData = {
        ...formData as ExtendedHealthData,
        timestamp: Date.now(),
      };

      validateExtendedHealthData(healthData);

      // Create patient DID if not exists
      const patientManager = new PatientDIDManager();
      const patientDID = patientManager.getDID();

      // Add patient DID to data
      healthData.patientDID = patientDID;

      // Generate encryption key if not set
      const key = encryptionKey || generateAESKey();
      setEncryptionKey(key);

      // Create minimal data for blockchain
      const minimalData = {
        timestamp: healthData.timestamp,
        disease: healthData.disease,
        result: healthData.result,
        patientDID: healthData.patientDID,
      };

      // Encrypt and store on Solana
      const signer = Keypair.generate(); // In real app, use user's wallet
      const result = await storeHealthDataOnChain(minimalData, key, signer);

      setSubmitStatus('success');
      console.log('Health data stored successfully:', result);

    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error submitting health data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Health Diagnostics Submission
            </h1>
            <p className="text-gray-600">
              Submit your health diagnostic results securely. Only minimal, encrypted data will be stored on the blockchain.
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-green-600 text-xl mr-2">✓</span>
                <span className="text-green-800 font-medium">Health data submitted successfully!</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Your encrypted health data has been stored on Solana. You can now proceed to file an insurance claim.
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-600 text-xl mr-2">✕</span>
                <span className="text-red-800 font-medium">Submission failed</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Disease/Test Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Diagnostic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disease/Test Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.disease || ''}
                  onChange={(e) => handleInputChange('disease', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., COVID-19, Diabetes, Blood Pressure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.testType || ''}
                  onChange={(e) => handleInputChange('testType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., PCR Test, Blood Test, X-Ray"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Result *
                </label>
                <select
                  required
                  value={formData.result || ''}
                  onChange={(e) => handleInputChange('result', e.target.value as 'positive' | 'negative' | 'inconclusive')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select result...</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="inconclusive">Inconclusive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lab Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.labName || ''}
                  onChange={(e) => handleInputChange('labName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., LabCorp, Quest Diagnostics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Level (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.confidence || ''}
                  onChange={(e) => handleInputChange('confidence', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional information..."
                />
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Privacy & Consent</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention Period (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.dataRetentionPeriod || 90}
                  onChange={(e) => handleInputChange('dataRetentionPeriod', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={formData.sharingConsent || false}
                  onChange={(e) => handleInputChange('sharingConsent', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  I consent to share this minimal health data with insurance providers for claim processing.
                  Only disease name, result, and timestamp will be stored on the blockchain.
                </label>
              </div>
            </div>

            {/* Encryption Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Encryption</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Encryption Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Auto-generated key..."
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={generateNewKey}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This key encrypts your data. Keep it safe for future access.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !formData.sharingConsent}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Health Data 🔒'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
