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

        // If empty, return some mock data for the demo
        if ( diagnostics.length === 0 )
        {
            const mockData: ExtendedHealthData[] = [
                {
                    timestamp: Date.now() - 86400000,
                    disease: 'COVID-19',
                    result: 'positive',
                    patientDID: patientDID,
                    testType: 'PCR Test',
                    labName: 'LabCorp',
                    confidence: 95,
                    notes: 'Rapid antigen test positive',
                    dataRetentionPeriod: 90,
                    sharingConsent: true,
                },
                {
                    timestamp: Date.now() - 172800000,
                    disease: 'Diabetes',
                    result: 'negative',
                    patientDID: patientDID,
                    testType: 'Blood Test',
                    labName: 'Quest Diagnostics',
                    confidence: 98,
                    notes: 'HbA1c levels normal',
                    dataRetentionPeriod: 90,
                    sharingConsent: true,
                },
            ];
            return NextResponse.json( mockData );
        }

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
