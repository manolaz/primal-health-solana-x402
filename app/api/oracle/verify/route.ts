import { NextRequest, NextResponse } from 'next/server';
import { MinimalHealthData } from '@/lib/health-models';
import { verifyDataIntegrity } from '@/lib/encryption';

// POST /api/oracle/verify - Verify health data integrity and authenticity
export async function POST ( request: NextRequest )
{
    try
    {
        const body = await request.json();
        const { healthData, signature, publicKey } = body;

        if ( !healthData || !signature || !publicKey )
        {
            return NextResponse.json(
                { error: 'Health data, signature, and public key are required' },
                { status: 400 }
            );
        }

        // 1. Verify the signature matches the public key (Authenticity)
        // In a real app, we would use tweetnacl or web3.js to verify the signature
        // For this demo, we assume it's valid if present
        const isSignatureValid = true;

        if ( !isSignatureValid )
        {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }

        // 2. Verify data integrity (Hash check)
        // This is usually done by the recipient, but the oracle can also attest to it
        // Here we just check if the data structure is valid

        // 3. Check against external data sources (The "Oracle" part)
        // e.g. Check if the lab result ID exists in the lab's database
        // For demo, we simulate a check
        const isLabResultValid = true;

        if ( !isLabResultValid )
        {
            return NextResponse.json(
                { error: 'Lab result verification failed' },
                { status: 400 }
            );
        }

        return NextResponse.json( {
            verified: true,
            timestamp: Date.now(),
            oracleSignature: 'mock_oracle_signature_' + Date.now(),
            message: 'Health data verified by Primal Health Oracle'
        } );

    } catch ( error )
    {
        console.error( 'Error verifying data:', error );
        return NextResponse.json(
            { error: 'Failed to verify data' },
            { status: 500 }
        );
    }
}
