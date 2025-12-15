'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PatientDIDManager } from '@/lib/did';
import { HealthDataStorageService } from '@/lib/solana-storage';
import { Keypair } from '@solana/web3.js';

export default function PatientProfilePage ()
{
    const [ patientDID, setPatientDID ] = useState( '' );
    const [ publicKey, setPublicKey ] = useState( '' );
    const [ isRegistered, setIsRegistered ] = useState( false );
    const [ isLoading, setIsLoading ] = useState( true );
    const [ isRegistering, setIsRegistering ] = useState( false );
    const [ message, setMessage ] = useState( '' );

    useEffect( () =>
    {
        initializePatient();
    }, [] );

    const initializePatient = async () =>
    {
        // In a real app, we would load the keypair from secure storage
        // For this demo, we'll generate one if not exists in localStorage, or use a fixed seed
        // But since PatientDIDManager generates random by default, let's just use that for now
        // and assume the user "connects" their wallet.

        const patientManager = new PatientDIDManager();
        const did = patientManager.getDID();
        const pubKey = patientManager.getPublicKey().toString();

        setPatientDID( did );
        setPublicKey( pubKey );

        // Check if registered on chain
        try
        {
            const response = await fetch( `/api/patient?publicKey=${ pubKey }` );
            const data = await response.json();
            setIsRegistered( data.exists );
        } catch ( error )
        {
            console.error( 'Error checking registration:', error );
        } finally
        {
            setIsLoading( false );
        }
    };

    const handleRegister = async () =>
    {
        setIsRegistering( true );
        setMessage( '' );

        try
        {
            // In a real app, we would use the user's wallet to sign
            // Here we need the private key, which PatientDIDManager has
            // But we can't easily send it to the server or use it directly with the browser wallet adapter
            // So we'll simulate the registration call to the API which would handle the on-chain interaction
            // OR we use the client-side library if we have the keypair.

            // Since we don't have a wallet adapter set up in this context, 
            // and PatientDIDManager holds the keys in memory:

            // 1. We need to fund the account first (airdrop)
            // 2. Then call initializePatient

            // Note: This is a client-side operation using the in-memory keypair

            setMessage( 'Requesting airdrop for gas fees...' );

            const patientManager = new PatientDIDManager();
            const signer = patientManager.getKeypair();
            const storageService = new HealthDataStorageService();

            try
            {
                await storageService.requestAirdrop( signer.publicKey, 1 );
                setMessage( 'Airdrop received. Registering identity...' );
            } catch ( e )
            {
                console.warn( "Airdrop failed or not needed", e );
                setMessage( 'Proceeding with registration...' );
            }

            // Call initializePatient on chain
            const tx = await storageService.initializePatient( patientDID, signer );
            console.log( 'Registration transaction:', tx );

            // Also notify our API to index it (optional but good for consistency)
            await fetch( '/api/patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( { did: patientDID, publicKey } )
            } );

            setIsRegistered( true );
            setMessage( 'Successfully registered patient identity on Solana!' );

        } catch ( error )
        {
            console.error( 'Error registering:', error );
            setMessage( 'An error occurred during registration: ' + ( error instanceof Error ? error.message : String( error ) ) );
        } finally
        {
            setIsRegistering( false );
        }
    };

    if ( isLoading )
    {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
                    >
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Patient Profile
                    </h1>
                    <p className="text-gray-600">
                        Manage your decentralized identity and health data
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Identity Details</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Decentralized ID (DID)
                            </label>
                            <div className="flex items-center space-x-2">
                                <code className="flex-1 bg-gray-100 p-3 rounded-lg text-sm font-mono break-all">
                                    { patientDID }
                                </code>
                                <button
                                    onClick={ () => navigator.clipboard.writeText( patientDID ) }
                                    className="p-2 text-gray-500 hover:text-blue-600"
                                    title="Copy DID"
                                >
                                    📋
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Public Key
                            </label>
                            <div className="flex items-center space-x-2">
                                <code className="flex-1 bg-gray-100 p-3 rounded-lg text-sm font-mono break-all">
                                    { publicKey }
                                </code>
                                <button
                                    onClick={ () => navigator.clipboard.writeText( publicKey ) }
                                    className="p-2 text-gray-500 hover:text-blue-600"
                                    title="Copy Public Key"
                                >
                                    📋
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Registration Status:</span>
                                    <span className={ `ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ isRegistered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }` }>
                                        { isRegistered ? 'Registered on Solana' : 'Not Registered' }
                                    </span>
                                </div>

                                { !isRegistered && (
                                    <button
                                        onClick={ handleRegister }
                                        disabled={ isRegistering }
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
                                    >
                                        { isRegistering ? 'Registering...' : 'Register Identity' }
                                    </button>
                                ) }
                            </div>
                            { message && (
                                <p className={ `mt-2 text-sm ${ message.includes( 'Success' ) ? 'text-green-600' : 'text-red-600' }` }>
                                    { message }
                                </p>
                            ) }
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Link
                            href="/diagnostics"
                            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <h3 className="font-medium text-gray-900">Health Diagnostics</h3>
                            <p className="text-sm text-gray-500">View and manage your diagnostic records</p>
                        </Link>

                        <Link
                            href="/claims"
                            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <div className="text-2xl mb-2">📋</div>
                            <h3 className="font-medium text-gray-900">Insurance Claims</h3>
                            <p className="text-sm text-gray-500">Track your insurance claims history</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
