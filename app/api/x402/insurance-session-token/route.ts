import { NextRequest, NextResponse } from 'next/server';

// Session token endpoint for insurance payments (reverse flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentProof, claimId, patientDID } = body;

    // Validate insurance payment proof
    if (!paymentProof || !claimId || !patientDID) {
      return NextResponse.json(
        { error: 'Payment proof, claim ID, and patient DID required' },
        { status: 400 }
      );
    }

    // Verify the payment was from insurance to patient
    // In production, this would verify the X402 payment proof

    // Issue session token for claim processing
    const sessionToken = `insurance_session_${claimId}_${Date.now()}`;

    return NextResponse.json({
      sessionToken,
      claimId,
      patientDID,
      paymentVerified: true,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      permissions: [`/api/insurance/claim/${claimId}`],
    });

  } catch (error) {
    console.error('Error creating insurance session token:', error);
    return NextResponse.json(
      { error: 'Failed to create insurance session token' },
      { status: 500 }
    );
  }
}
