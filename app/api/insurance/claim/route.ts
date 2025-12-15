import { NextRequest, NextResponse } from 'next/server';
import { InsuranceClaim, validateInsuranceClaim } from '@/lib/health-models';
import { submitClaimToChain, HealthDataStorageService } from '@/lib/solana-storage';
import { PatientDIDManager, InsuranceProviderDIDManager } from '@/lib/did';
import { Keypair } from '@solana/web3.js';

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

    // Verify patient DID exists (in production, check against registry)
    const patientManager = new PatientDIDManager();
    if ( claim.patientDID !== patientManager.getDID() )
    {
      return NextResponse.json(
        { error: 'Invalid patient DID' },
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

    // Submit claim to blockchain
    const signer = Keypair.generate(); // In production, use authenticated signer

    // Fund the signer for the demo
    const storageService = new HealthDataStorageService();
    try
    {
      await storageService.requestAirdrop( signer.publicKey, 1 );
    } catch ( e )
    {
      console.warn( "Airdrop failed", e );
    }

    const txSignature = await submitClaimToChain( claim, signer );

    return NextResponse.json( {
      success: true,
      claimId: claim.claimId,
      transactionSignature: txSignature,
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

// GET /api/insurance/claim - Get claim status
export async function GET ( request: NextRequest )
{
  try
  {
    const { searchParams } = new URL( request.url );
    const claimId = searchParams.get( 'claimId' );

    if ( !claimId )
    {
      return NextResponse.json(
        { error: 'Claim ID is required' },
        { status: 400 }
      );
    }

    // In production, query blockchain for claim status
    // For now, return mock status
    const mockStatus = {
      claimId,
      status: 'verified', // pending, verified, paid, rejected
      verificationTimestamp: Date.now() - 3600000,
      paymentAmount: 500,
      paymentTransactionId: 'mock_tx_' + claimId,
      message: 'Claim verified and payment processed',
    };

    return NextResponse.json( mockStatus );

  } catch ( error )
  {
    console.error( 'Error getting claim status:', error );
    return NextResponse.json(
      { error: 'Failed to get claim status' },
      { status: 500 }
    );
  }
}
