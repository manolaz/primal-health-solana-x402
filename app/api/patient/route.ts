import { NextRequest, NextResponse } from 'next/server';
import { HealthDataStorageService } from '@/lib/solana-storage';
import { Keypair, PublicKey } from '@solana/web3.js';

// GET /api/patient - Check if patient exists
export async function GET ( request: NextRequest )
{
    try
    {
        const { searchParams } = new URL( request.url );
        const publicKeyStr = searchParams.get( 'publicKey' );

        if ( !publicKeyStr )
        {
            return NextResponse.json(
                { error: 'Public key is required' },
                { status: 400 }
            );
        }

        // In a real app, we would query the blockchain to see if the patient account exists
        const storageService = new HealthDataStorageService();
        const patientAccount = await storageService.getPatientAccount( new PublicKey( publicKeyStr ) );

        if ( patientAccount )
        {
            return NextResponse.json( {
                exists: true,
                did: patientAccount.did,
                publicKey: publicKeyStr
            } );
        }
        else
        {
            return NextResponse.json( {
                exists: false,
                publicKey: publicKeyStr
            } );
        }

    } catch ( error )
    {
        console.error( 'Error checking patient:', error );
        return NextResponse.json(
            { error: 'Failed to check patient' },
            { status: 500 }
        );
    }
}

// POST /api/patient - Register patient (Server-side proxy, though usually client-side)
// This endpoint might be used to index the patient in a database after on-chain registration
export async function POST ( request: NextRequest )
{
    try
    {
        const body = await request.json();
        const { did, publicKey } = body;

        if ( !did || !publicKey )
        {
            return NextResponse.json(
                { error: 'DID and Public Key are required' },
                { status: 400 }
            );
        }

        // Here we would save the patient metadata to a database
        // For this demo, we just acknowledge

        return NextResponse.json( {
            success: true,
            message: 'Patient registered successfully',
            did,
            publicKey
        } );

    } catch ( error )
    {
        console.error( 'Error registering patient:', error );
        return NextResponse.json(
            { error: 'Failed to register patient' },
            { status: 500 }
        );
    }
}
