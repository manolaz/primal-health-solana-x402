'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InsuranceClaim } from '@/lib/health-models';
import { PrivacySettingsComponent } from '@/components/privacy-settings';
import { useSolana } from '@/components/solana-provider';
import { WalletConnectButton } from '@/components/wallet-connect-button';

// Mock data for development - in production this would come from Solana queries
const mockClaims: InsuranceClaim[] = [
  {
    claimId: 'claim-001',
    patientDID: 'did:solana:mainnet:11111111111111111111111111111112',
    healthDataHash: 'hash123',
    encryptedHealthData: 'encrypted_data_123',
    insuranceProviderDID: 'did:solana:mainnet:insurance_provider_001',
    claimAmount: 500,
    currency: 'SOL',
    status: 'paid',
    timestamp: Date.now() - 86400000, // 1 day ago
    verificationTimestamp: Date.now() - 43200000, // 12 hours ago
    paymentTransactionId: 'tx_abc123',
  },
  {
    claimId: 'claim-002',
    patientDID: 'did:solana:mainnet:11111111111111111111111111111112',
    healthDataHash: 'hash456',
    encryptedHealthData: 'encrypted_data_456',
    insuranceProviderDID: 'did:solana:mainnet:insurance_provider_002',
    claimAmount: 750,
    currency: 'SOL',
    status: 'verified',
    timestamp: Date.now() - 172800000, // 2 days ago
    verificationTimestamp: Date.now() - 86400000, // 1 day ago
  },
  {
    claimId: 'claim-003',
    patientDID: 'did:solana:mainnet:11111111111111111111111111111112',
    healthDataHash: 'hash789',
    encryptedHealthData: 'encrypted_data_789',
    insuranceProviderDID: 'did:solana:mainnet:insurance_provider_001',
    claimAmount: 300,
    currency: 'SOL',
    status: 'pending',
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusIcons = {
  pending: '⏳',
  verified: '✓',
  paid: '💰',
  rejected: '✕',
};

export default function DashboardPage ()
{
  const { selectedAccount, isConnected } = useSolana();
  const [ claims, setClaims ] = useState<InsuranceClaim[]>( [] );
  const [ patientDID, setPatientDID ] = useState<string>( '' );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ activeTab, setActiveTab ] = useState<'claims' | 'privacy'>( 'claims' );

  useEffect( () =>
  {
    if ( isConnected && selectedAccount )
    {
      const did = `did:solana:devnet:${ selectedAccount.address }`;
      setPatientDID( did );

      // Load claims (mock data for now)
      // In production, we would fetch claims associated with this DID
      setTimeout( () =>
      {
        setClaims( mockClaims );
        setIsLoading( false );
      }, 1000 );
    } else
    {
      setIsLoading( false );
    }
  }, [ isConnected, selectedAccount ] );

  const formatDate = ( timestamp: number ) =>
  {
    return new Date( timestamp ).toLocaleDateString( 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    } );
  };

  const getTotalPaid = () =>
  {
    return claims
      .filter( claim => claim.status === 'paid' )
      .reduce( ( total, claim ) => total + claim.claimAmount, 0 );
  };

  const getPendingAmount = () =>
  {
    return claims
      .filter( claim => claim.status === 'pending' )
      .reduce( ( total, claim ) => total + claim.claimAmount, 0 );
  };

  if ( isLoading )
  {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Patient Dashboard
            </h1>
            <p className="text-gray-600">
              Track your insurance claims and payment status
            </p>
          </div>
          <div className="ml-4">
            <WalletConnectButton />
          </div>
        </div>

        { !isConnected ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please connect your Solana wallet to view your dashboard, claims history, and privacy settings.
            </p>
            <div className="inline-block">
              <WalletConnectButton />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={ () => setActiveTab( 'claims' ) }
                  className={ `px-6 py-4 font-medium text-sm ${ activeTab === 'claims'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }` }
                >
                  Insurance Claims
                </button>
                <button
                  onClick={ () => setActiveTab( 'privacy' ) }
                  className={ `px-6 py-4 font-medium text-sm ${ activeTab === 'privacy'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }` }
                >
                  Privacy & Consent
                </button>
              </nav>
            </div>

            { activeTab === 'claims' && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Decentralized ID</h2>
                  <p className="text-sm text-gray-600 mb-2">This is your unique identifier on the Solana blockchain:</p>
                  <code className="block bg-gray-100 p-3 rounded-lg text-sm font-mono break-all">
                    { patientDID }
                  </code>
                </div>

                {/* Stats Cards */ }
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Claims</p>
                        <p className="text-2xl font-bold text-gray-900">{ claims.length }</p>
                      </div>
                      <div className="text-2xl">📋</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Paid Claims</p>
                        <p className="text-2xl font-bold text-green-600">
                          { claims.filter( c => c.status === 'paid' ).length }
                        </p>
                      </div>
                      <div className="text-2xl">💰</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">{ getTotalPaid() } SOL</p>
                      </div>
                      <div className="text-2xl">✓</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{ getPendingAmount() } SOL</p>
                      </div>
                      <div className="text-2xl">⏳</div>
                    </div>
                  </div>
                </div>

                {/* Claims Table */ }
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Insurance Claims</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Claim ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Insurance Provider
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        { claims.map( ( claim ) => (
                          <tr key={ claim.claimId } className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              { claim.claimId }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              { claim.claimAmount } { claim.currency }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={ `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ statusColors[ claim.status ] }` }>
                                { statusIcons[ claim.status ] } { claim.status }
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              { formatDate( claim.timestamp ) }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                { claim.insuranceProviderDID.split( ':' )[ 3 ]?.slice( 0, 8 ) }...
                              </code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              { claim.paymentTransactionId ? (
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  { claim.paymentTransactionId.slice( 0, 8 ) }...
                                </code>
                              ) : (
                                <span className="text-gray-400">-</span>
                              ) }
                            </td>
                          </tr>
                        ) ) }
                      </tbody>
                    </table>
                  </div>

                  { claims.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📋</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No claims yet</h3>
                      <p className="text-gray-600 mb-4">
                        Submit your health diagnostics to start filing insurance claims.
                      </p>
                      <Link
                        href="/diagnostics"
                        className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all"
                      >
                        Submit Diagnostics
                      </Link>
                    </div>
                  ) }
                </div>
              </div>
            ) }

            { activeTab === 'privacy' && (
              <div className="p-6">
                <PrivacySettingsComponent patientDID={ patientDID } />
              </div>
            ) }

            {/* Quick Actions */ }
            { activeTab === 'claims' && (
              <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link
                    href="/diagnostics"
                    className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all"
                  >
                    📊 Submit Diagnostics
                  </Link>
                  <Link
                    href="/claims"
                    className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    📋 File Claim
                  </Link>
                  <button
                    className="flex items-center justify-center px-6 py-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                    onClick={ () => {/* TODO: Implement export functionality */ } }
                  >
                    📥 Export History
                  </button>
                </div>
              </div>
            ) }
          </div>
        ) }
      </div>
    </div>
  );
}
