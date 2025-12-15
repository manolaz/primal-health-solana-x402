import { Address } from 'viem'
import { paymentMiddleware, Resource, Network } from 'x402-next'
import { NextRequest } from 'next/server'

// Configuration for Primal Health insurance claims
const insuranceReceiverAddress = process.env.NEXT_PUBLIC_INSURANCE_ADDRESS as Address || '11111111111111111111111111111112'
const patientAddress = process.env.NEXT_PUBLIC_PATIENT_ADDRESS as Address || '11111111111111111111111111111112'
const network = (process.env.NEXT_PUBLIC_NETWORK as Network) || 'solana-devnet'
const facilitatorUrl = (process.env.NEXT_PUBLIC_FACILITATOR_URL as Resource) || 'https://x402.org/facilitator'
const cdpClientKey = process.env.NEXT_PUBLIC_CDP_CLIENT_KEY as string

// Traditional content payment middleware (for demo purposes)
const contentPaymentMiddleware = paymentMiddleware(
  insuranceReceiverAddress,
  {
    '/content/cheap': {
      price: '$0.01',
      config: {
        description: 'Access to cheap content',
      },
      network,
    },
    '/content/expensive': {
      price: '$0.25',
      config: {
        description: 'Access to expensive content',
      },
      network,
    },
  },
  {
    url: facilitatorUrl,
  },
  {
    cdpClientKey,
    appLogo: '/logos/primal-health.png',
    appName: 'Primal Health',
    sessionTokenEndpoint: '/api/x402/session-token',
  },
)

// Insurance claim payment middleware - reversed flow (insurance pays patient)
const insurancePaymentMiddleware = paymentMiddleware(
  patientAddress, // Patient receives payment
  {
    '/api/insurance/claim': {
      price: '-$0.50', // Negative price indicates insurance payout
      config: {
        description: 'Insurance claim payment for verified health data',
      },
      network,
    },
    '/api/insurance/verification': {
      price: '-$0.25', // Verification fee reimbursement
      config: {
        description: 'Verification service reimbursement',
      },
      network,
    },
  },
  {
    url: facilitatorUrl,
  },
  {
    cdpClientKey,
    appLogo: '/logos/primal-health.png',
    appName: 'Primal Health Insurance',
    sessionTokenEndpoint: '/api/x402/insurance-session-token',
  },
)

export const middleware = (req: NextRequest) => {
  const path = req.nextUrl.pathname

  // Route to appropriate middleware based on path
  if (path.startsWith('/api/insurance/')) {
    // Insurance claim routes - insurance pays patient
    const delegate = insurancePaymentMiddleware as unknown as (
      request: NextRequest,
    ) => ReturnType<typeof insurancePaymentMiddleware>
    return delegate(req)
  } else if (path.startsWith('/content/')) {
    // Content access routes - traditional payment
    const delegate = contentPaymentMiddleware as unknown as (
      request: NextRequest,
    ) => ReturnType<typeof contentPaymentMiddleware>
    return delegate(req)
  }

  // Default - no payment required
  return
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata files)
     * - api/health (health data submission - no payment required)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
    '/', // Include the root path explicitly
  ],
}
