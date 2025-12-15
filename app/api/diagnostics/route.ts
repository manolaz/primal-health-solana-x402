import { NextRequest, NextResponse } from 'next/server';
import { ExtendedHealthData } from '@/lib/health-models';

// Mock database
let diagnosticStore: ExtendedHealthData[] = [];

// GET /api/diagnostics - List diagnostics
export async function GET ( request: NextRequest )
{
    try
    {
        const { searchParams } = new URL( request.url );
        const patientDID = searchParams.get( 'patientDID' );

        if ( !patientDID )
        {
            return NextResponse.json(
                { error: 'Patient DID is required' },
                { status: 400 }
            );
        }

        // Filter diagnostics for the patient
        const diagnostics = diagnosticStore.filter( d => d.patientDID === patientDID );

        return NextResponse.json( diagnostics );

    } catch ( error )
    {
        console.error( 'Error fetching diagnostics:', error );
        return NextResponse.json(
            { error: 'Failed to fetch diagnostics' },
            { status: 500 }
        );
    }
}

// POST /api/diagnostics - Submit diagnostic data (Indexing)
export async function POST ( request: NextRequest )
{
    try
    {
        const body = await request.json();
        // Validate body...

        // Store in memory for demo
        diagnosticStore.push( body );

        return NextResponse.json( {
            success: true,
            message: 'Diagnostic data indexed successfully'
        } );

    } catch ( error )
    {
        console.error( 'Error submitting diagnostic:', error );
        return NextResponse.json(
            { error: 'Failed to submit diagnostic' },
            { status: 500 }
        );
    }
}
