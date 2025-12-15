import { NextRequest, NextResponse } from 'next/server';
import { MinimalHealthData, validateMinimalHealthData } from '@/lib/health-models';
import { decryptHealthDataFromBlockchain, verifyDataIntegrity } from '@/lib/encryption';
import { retrieveHealthDataFromChain, processClaimPayment, HealthDataStorageService } from '@/lib/solana-storage';
import { extractPublicKeyFromDID } from '@/lib/encryption';
import { PublicKey, Keypair } from '@solana/web3.js';

// POST /api/insurance/verification - Verify health data and process claim
export async function POST ( request: NextRequest )
{
  try
  {
    const body = await request.json();
    const { claimId, patientDID, healthDataHash, encryptionKey, insuranceProviderDID } = body;

    if ( !claimId || !patientDID || !healthDataHash || !encryptionKey || !insuranceProviderDID )
    {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract patient public key from DID
    const patientPublicKey = extractPublicKeyFromDID( patientDID );

    // Retrieve encrypted health data from blockchain
    const decryptedData = await retrieveHealthDataFromChain(
      healthDataHash,
      encryptionKey,
      patientPublicKey
    );

    if ( !decryptedData )
    {
      return NextResponse.json(
        { error: 'Health data not found or invalid encryption key' },
        { status: 404 }
      );
    }

    // Validate the decrypted data
    const healthData: MinimalHealthData = validateMinimalHealthData( decryptedData );

    // Verify data integrity
    const isValid = verifyDataIntegrity( JSON.stringify( healthData ), healthDataHash );
    if ( !isValid )
    {
      return NextResponse.json(
        { error: 'Data integrity verification failed' },
        { status: 400 }
      );
    }

    // Perform insurance-specific verification logic
    const verificationResult = await performInsuranceVerification( healthData );

    if ( !verificationResult.eligible )
    {
      return NextResponse.json( {
        success: false,
        claimId,
        status: 'rejected',
        reason: verificationResult.reason,
        message: 'Claim does not meet insurance criteria',
      } );
    }

    // Calculate payment amount based on health data and policy
    if ( !verificationResult.coverage )
    {
      return NextResponse.json( {
        success: false,
        claimId,
        status: 'rejected',
        reason: 'No coverage available for this claim',
        message: 'Insurance claim was rejected due to coverage limitations',
      } );
    }

    const paymentAmount = calculatePaymentAmount( healthData, { coverage: verificationResult.coverage } );

    // In production, this would trigger the X402 payment from insurance to patient
    // For now, we use the Solana program to process the payment

    // NOTE: In a real production environment, the insurance provider's private key
    // would be securely managed (e.g., via AWS KMS, Vault, or a secure wallet service).
    // For this demo, we generate a keypair and request an airdrop to simulate a funded wallet.
    const providerKeypair = Keypair.generate();

    // Fund the provider wallet for the demo
    const storageService = new HealthDataStorageService();
    try
    {
      await storageService.requestAirdrop( providerKeypair.publicKey, 2 ); // Request 2 SOL
    } catch ( e )
    {
      console.warn( "Airdrop failed, payment might fail if wallet is empty", e );
    }

    const txSignature = await processClaimPayment(
      claimId,
      providerKeypair,
      patientPublicKey
    );

    return NextResponse.json( {
      success: true,
      claimId,
      status: 'verified',
      paymentAmount,
      paymentTransactionId: txSignature,
      verificationTimestamp: Date.now(),
      message: 'Health data verified and payment processed',
      healthDataSummary: {
        disease: healthData.disease,
        result: healthData.result,
        timestamp: healthData.timestamp,
      },
    } );

  } catch ( error )
  {
    console.error( 'Error verifying health data:', error );
    return NextResponse.json(
      {
        error: 'Failed to verify health data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions for insurance verification logic

async function performInsuranceVerification ( healthData: MinimalHealthData ): Promise<{
  eligible: boolean;
  reason?: string;
  coverage?: number;
}>
{
  // Insurance verification logic based on health data
  // This is a simplified example - real logic would be much more complex

  const { disease, result } = healthData;

  // Example coverage rules
  const coverageRules: Record<string, { positive: boolean; coverage: number }> = {
    'COVID-19': { positive: true, coverage: 500 },
    'Diabetes': { positive: true, coverage: 750 },
    'Blood Pressure': { positive: false, coverage: 0 }, // Only high readings covered
    'Cancer Screening': { positive: true, coverage: 1000 },
  };

  const rule = coverageRules[ disease ];

  if ( !rule )
  {
    return {
      eligible: false,
      reason: 'Disease not covered by insurance policy',
    };
  }

  if ( rule.positive && result !== 'positive' )
  {
    return {
      eligible: false,
      reason: 'Test result does not qualify for coverage',
    };
  }

  return {
    eligible: true,
    coverage: rule.coverage,
  };
}

function calculatePaymentAmount (
  healthData: MinimalHealthData,
  verificationResult: { coverage: number }
): number
{
  // Calculate payment based on coverage and any adjustments
  let amount = verificationResult.coverage;

  // Time-based adjustments (newer claims might have higher payouts)
  const daysSinceTest = ( Date.now() - healthData.timestamp ) / ( 1000 * 60 * 60 * 24 );
  if ( daysSinceTest < 30 )
  {
    amount *= 1.1; // 10% bonus for recent tests
  }

  return Math.round( amount * 100 ) / 100; // Round to 2 decimal places
}

async function simulateInsurancePayment (
  patientDID: string,
  insuranceProviderDID: string,
  amount: number,
  claimId: string
): Promise<{ transactionId: string }>
{
  // In production, this would use X402 to trigger payment from insurance to patient
  // For now, simulate with a mock transaction

  // Simulate blockchain delay
  await new Promise( resolve => setTimeout( resolve, 2000 ) );

  return {
    transactionId: `insurance_payment_${ claimId }_${ Date.now() }`,
  };
}
