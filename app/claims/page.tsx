'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExtendedHealthData, InsuranceClaim } from '@/lib/health-models';
import { PatientDIDManager, InsuranceProviderDIDManager } from '@/lib/did';
import { generateAESKey, hashHealthData } from '@/lib/encryption';
import { checkDataSharingPermissions } from '@/lib/consent';

export default function ClaimsPage() {
  const [diagnosticData, setDiagnosticData] = useState<ExtendedHealthData[]>([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<ExtendedHealthData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [patientDID, setPatientDID] = useState('');
  const [insuranceProviderDID, setInsuranceProviderDID] = useState('');

  useEffect(() => {
    // Initialize DIDs
    const patientManager = new PatientDIDManager();
    const insuranceManager = new InsuranceProviderDIDManager(
      undefined,
      'Primal Health Insurance',
      'primal-health-insurance'
    );

    setPatientDID(patientManager.getDID());
    setInsuranceProviderDID(insuranceManager.getDID());

    // Load diagnostic data (mock data for now)
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = () => {
    // In production, this would load from local storage or API
    const mockData: ExtendedHealthData[] = [
      {
        timestamp: Date.now() - 86400000, // 1 day ago
        disease: 'COVID-19',
        result: 'positive',
        patientDID: '',
        testType: 'PCR Test',
        labName: 'LabCorp',
        confidence: 95,
        notes: 'Rapid antigen test positive',
        dataRetentionPeriod: 90,
        sharingConsent: true,
        insuranceClaimId: undefined,
      },
      {
        timestamp: Date.now() - 172800000, // 2 days ago
        disease: 'Diabetes',
        result: 'negative',
        patientDID: '',
        testType: 'Blood Test',
        labName: 'Quest Diagnostics',
        confidence: 98,
        notes: 'HbA1c levels normal',
        dataRetentionPeriod: 90,
        sharingConsent: true,
        insuranceClaimId: undefined,
      },
    ];

    setDiagnosticData(mockData.map(data => ({ ...data, patientDID })));
  };

  const handleSubmitClaim = async () => {
    if (!selectedDiagnostic) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Check consent permissions
      const hasPermission = checkDataSharingPermissions(
        patientDID,
        insuranceProviderDID,
        'disease'
      );

      if (!hasPermission) {
        throw new Error('You must grant consent to share this data with insurance providers');
      }

      // Generate encryption key for blockchain storage
      const encryptionKey = generateAESKey();

      // Create minimal health data
      const minimalData = {
        timestamp: selectedDiagnostic.timestamp,
        disease: selectedDiagnostic.disease,
        result: selectedDiagnostic.result,
        patientDID: selectedDiagnostic.patientDID,
      };

      // Create insurance claim
      const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const healthDataHash = hashHealthData(JSON.stringify(minimalData));

      const claim: InsuranceClaim = {
        claimId,
        patientDID,
        healthDataHash,
        encryptedHealthData: JSON.stringify(minimalData), // In production, encrypt this
        insuranceProviderDID,
        claimAmount: 500, // Calculated based on disease/result
        currency: 'SOL',
        status: 'pending',
        timestamp: Date.now(),
      };

      // Submit claim to API
      const response = await fetch('/api/insurance/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claim),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit claim');
      }

      const result = await response.json();

      // Trigger verification process
      await triggerVerification(claimId, healthDataHash, encryptionKey);

      setSubmitStatus('success');

    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error submitting claim:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerVerification = async (
    claimId: string,
    healthDataHash: string,
    encryptionKey: string
  ) => {
    try {
      const response = await fetch('/api/insurance/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId,
          patientDID,
          healthDataHash,
          encryptionKey,
          insuranceProviderDID,
        }),
      });

      if (!response.ok) {
        console.warn('Verification may have failed, but claim was submitted');
      }
    } catch (error) {
      console.warn('Verification process failed:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            File Insurance Claim
          </h1>
          <p className="text-gray-600">
            Select a diagnostic result to file an insurance claim
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-2">✓</span>
              <span className="text-green-800 font-medium">Claim submitted successfully!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Your insurance claim has been submitted and is being processed. You will receive payment once verified.
            </p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-2">✕</span>
              <span className="text-red-800 font-medium">Claim submission failed</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Diagnostic Data Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Select Diagnostic Data
            </h2>

            {diagnosticData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p className="mb-4">No diagnostic data available</p>
                <Link
                  href="/diagnostics"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all"
                >
                  Submit Diagnostics
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {diagnosticData.map((data, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedDiagnostic(data)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedDiagnostic === data
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        {data.disease} - {data.testType}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        data.result === 'positive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {data.result}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {data.labName} • {formatDate(data.timestamp)}
                    </p>
                    {data.notes && (
                      <p className="text-sm text-gray-500">{data.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Claim Summary & Submission */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Claim Summary
            </h2>

            {selectedDiagnostic ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Diagnostic Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Disease:</span>
                      <span className="font-medium">{selectedDiagnostic.disease}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Result:</span>
                      <span className={`font-medium ${
                        selectedDiagnostic.result === 'positive' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {selectedDiagnostic.result}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Type:</span>
                      <span>{selectedDiagnostic.testType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lab:</span>
                      <span>{selectedDiagnostic.labName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(selectedDiagnostic.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Claim Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance Provider:</span>
                      <span className="font-medium">Primal Health Insurance</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Amount:</span>
                      <span className="font-medium text-green-600">500 SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processing Time:</span>
                      <span>1-2 business days</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                    <div className="text-sm">
                      <p className="text-yellow-800 font-medium mb-1">Privacy Notice</p>
                      <p className="text-yellow-700">
                        Only minimal data (disease, result, timestamp) will be shared with the insurance provider.
                        Your data remains encrypted and under your control.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmitClaim}
                  disabled={isSubmitting || !selectedDiagnostic.sharingConsent}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Submitting Claim...' : '🚀 Submit Insurance Claim'}
                </button>

                {!selectedDiagnostic.sharingConsent && (
                  <p className="text-sm text-red-600 text-center">
                    Consent required. Please update your privacy settings to enable data sharing.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p>Select a diagnostic result to view claim details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
