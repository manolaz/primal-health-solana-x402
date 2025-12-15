import { NextRequest, NextResponse } from 'next/server';
import { InsuranceClaim, validateInsuranceClaim } from '@/lib/health-models';
import { HealthDataStorageService } from '@/lib/solana-storage';
import { InsuranceProviderDIDManager } from '@/lib/did';
import { PublicKey } from '@solana/web3.js';

// In-memory store for claims (indexing)
let claimsStore: InsuranceClaim[] = [];

// POST /api/insurance/claim - Submit insurance claim
export async function POST ( request: NextRequest )
{
  try
  {
    const body = await request.json();

    // Prepare claim data with server-set fields
    const claimData = {
      ...body,
      timestamp: Date.now(),
      status: body.status || 'pending',
    };

    // Validate claim data
    const claim: InsuranceClaim = validateInsuranceClaim( claimData );

    // Verify patient DID format
    if ( !claim.patientDID.startsWith( 'did:solana:' ) )
    {
      return NextResponse.json(
        { error: 'Invalid patient DID format' },
        { status: 400 }
      );
    }

    // Create insurance provider DID
    const insuranceManager = new InsuranceProviderDIDManager(
      undefined,
      'Primal Health Insurance',
      'primal-health-insurance'
    );

    // Verify insurance provider DID matches
    if ( claim.insuranceProviderDID !== insuranceManager.getDID() )
    {
      return NextResponse.json(
        { error: 'Invalid insurance provider DID' },
        { status: 400 }
      );
    }

    // In a real app, we would verify the transaction signature on-chain here
    // const storageService = new HealthDataStorageService();
    // const isValid = await storageService.verifyClaimExists(claim.claimId, new PublicKey(claim.patientDID.split(':')[3]));

    // Store claim in memory
    claimsStore.push( claim );

    return NextResponse.json( {
      success: true,
      claimId: claim.claimId,
      transactionSignature: body.transactionSignature,
      status: 'submitted',
      message: 'Insurance claim submitted successfully. Awaiting verification.',
    } );

  } catch ( error )
  {
    console.error( 'Error submitting insurance claim:', error );
    return NextResponse.json(
      {
        error: 'Failed to submit insurance claim',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/insurance/claim - Get claim status or list claims
export async function GET ( request: NextRequest )
{
  try
  {
    const { searchParams } = new URL( request.url );
    const claimId = searchParams.get( 'claimId' );
    const patientDID = searchParams.get( 'patientDID' );

    if ( patientDID )
    {
      // List claims for patient
      const claims = claimsStore.filter( c => c.patientDID === patientDID );
      return NextResponse.json( claims );
    }

    if ( !claimId )
    {
      return NextResponse.json(
        { error: 'Claim ID or Patient DID is required' },
        { status: 400 }
      );
    }

    // In production, query blockchain for claim status
    const storageService = new HealthDataStorageService();

    const exists = await storageService.verifyClaimExists( claimId, new PublicKey( "11111111111111111111111111111111" ) );

    if ( exists )
    {
      // Update status in store if needed
      const claim = claimsStore.find( c => c.claimId === claimId );
      if ( claim )
      {
        // In a real app, we'd fetch the actual status from the chain account
        // For now, we just confirm it exists
        claim.status = 'verified';
      }

      return NextResponse.json( {
        claimId,
        status: 'verified',
        verificationTimestamp: Date.now(),
        message: 'Claim found on chain',
      } );
    }

    return NextResponse.json( {
      claimId,
      status: 'pending',
      message: 'Claim not found or pending',
    } );

  } catch ( error )
  {
    console.error( 'Error getting claim status:', error );
    return NextResponse.json(
      { error: 'Failed to get claim status' },
      { status: 500 }
    );
  }
}
