# Primal Health - Solana Insurance Claims

**A secure, privacy-first health insurance claims platform built on Solana Devnet using X402 payment protocol.**

Primal Health enables patients to submit minimal encrypted health diagnostic data and receive automated insurance payments through blockchain-verified smart contracts. The platform prioritizes patient privacy while ensuring transparent, efficient claims processing.

> ⚠️ **Development Environment** This application is configured for Solana Devnet. All payments use test tokens and data is encrypted for privacy.

## Table of Contents

- [What is Primal Health?](#what-is-primal-health)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Privacy & Security](#privacy--security)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)

---

## What is Primal Health?

**Primal Health** is a decentralized health insurance claims platform that leverages Solana blockchain and X402 payment protocol to create a secure, efficient, and patient-centric claims process.

### Key Benefits

- **Patient Privacy First** - Minimal data sharing with end-to-end encryption
- **Automated Payments** - Smart contract-based insurance payouts
- **DID-Based Identity** - Decentralized identifiers for secure patient authentication
- **Blockchain Transparency** - Immutable claim records with cryptographic verification
- **No Intermediaries** - Direct patient-to-insurance provider transactions

### How It Works

```
1. Patient submits health diagnostic results (encrypted, minimal data)
2. Data is stored on Solana blockchain with cryptographic integrity
3. Patient files insurance claim through secure API
4. Insurance provider verifies claim data automatically
5. Smart contract triggers payment from insurance to patient
6. Patient receives instant blockchain-verified payment
```

---

## Key Features

- **🔐 End-to-End Encryption** - AES-256 encryption for health data
- **🆔 Decentralized Identity** - Solana-based DID system for patients
- **⚡ Automated Claims** - Smart contract-driven insurance payments
- **🛡️ Privacy Controls** - Granular consent management and data rights
- **📊 Real-time Dashboard** - Track claims and payment status
- **🔗 X402 Integration** - Coinbase Pay for seamless crypto payments
- **📱 Responsive UI** - Modern, accessible web interface
- **🔍 Data Verification** - Cryptographic proof of health data integrity

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm, npm, or yarn
- A Solana wallet (Phantom, Solflare, etc.) for testing

### Installation

```bash
# Clone or create from template
npx create-solana-dapp my-app --template primal-health-solana-x402

# Navigate to project
cd my-app

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Visit `http://localhost:3000` to see your app running.

### Test the Health Claims Flow

1. **Submit Diagnostics**: Navigate to `/diagnostics` and submit health diagnostic results
2. **File Insurance Claim**: Go to `/claims` to file an insurance claim using your diagnostic data
3. **Monitor Claims**: Check `/dashboard` to view claim status and payment history
4. **Manage Privacy**: Use the Privacy & Consent tab to control data sharing preferences

### Demo Flow

```
1. Patient submits encrypted health data → Stored on Solana
2. Patient files insurance claim → Claim recorded on blockchain
3. Insurance verifies data integrity → Automated validation
4. Smart contract triggers payment → Patient receives SOL
5. Patient views claim status → Real-time dashboard updates
```

---

## How It Works

This template uses the `x402-next` package which provides middleware to handle the entire payment flow.

### Middleware Configuration

The core of the payment integration is in `middleware.ts`:

```typescript
import { Address } from 'viem'
import { paymentMiddleware, Resource, Network } from 'x402-next'
import { NextRequest } from 'next/server'

// Your Solana wallet address that receives payments
const address = 'CmGgLQL36Y9ubtTsy2zmE46TAxwCBm66onZmPPhUWNqv' as Address
const network = 'solana-devnet' as Network
const facilitatorUrl = 'https://x402.org/facilitator' as Resource
const cdpClientKey = '3uyu43EHCwgVIQx6a8cIfSkxp6cXgU30'

const x402PaymentMiddleware = paymentMiddleware(
  address,
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
    appLogo: '/logos/x402-examples.png',
    appName: 'x402 Demo',
    sessionTokenEndpoint: '/api/x402/session-token',
  },
)

export const middleware = (req: NextRequest) => {
  const delegate = x402PaymentMiddleware as unknown as (
    request: NextRequest,
  ) => ReturnType<typeof x402PaymentMiddleware>
  return delegate(req)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/'],
}
```

### What Happens Under the Hood

1. **Request Interception** - Middleware checks if the requested route requires payment
2. **Payment Check** - If the route is protected, middleware checks for valid payment session
3. **402 Response** - If no valid payment, returns 402 with payment requirements
4. **Coinbase Pay Widget** - User sees payment modal powered by Coinbase
5. **Payment Verification** - After payment, transaction is verified on Solana blockchain via facilitator
6. **Session Creation** - Valid payment creates a session token
7. **Access Granted** - User can now access protected content

---

## Project Structure

```
primal-health-solana-x402/
├── middleware.ts              # 🛡️  X402 payment middleware configuration
├── app/
│   ├── page.tsx              # 🏠 Homepage with links to protected content
│   ├── layout.tsx            # 📐 Root layout
│   ├── globals.css           # 🎨 Global styles
│   └── content/
│       └── [type]/
│           └── page.tsx      # 🔒 Protected content pages
├── components/
│   └── cats-component.tsx    # 🐱 Example content component
├── lib/                      # 📚 Utility functions (if needed)
├── public/                   # 📁 Static assets
└── package.json              # 📦 Dependencies
```

---

## Configuration

### Deployed Program (Devnet)

- **Program ID**: `2LjMTbA2Z3ZftCr8UCJ3c5cauBq48NRBbXbiy6Zkkhao`

### Environment Variables

The template uses sensible defaults, but you can customize by creating a `.env.local` file:

```bash
# Your Solana wallet address (where payments go)
NEXT_PUBLIC_WALLET_ADDRESS=your_solana_address_here

# Network (solana-devnet or solana-mainnet-beta)
NEXT_PUBLIC_NETWORK=solana-devnet

# Coinbase Pay Client Key (get from Coinbase Developer Portal)
NEXT_PUBLIC_CDP_CLIENT_KEY=your_client_key_here

# Facilitator URL (service that verifies payments)
NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator
```

### Customizing Routes and Prices

Edit `middleware.ts` to add or modify protected routes:

```typescript
const x402PaymentMiddleware = paymentMiddleware(
  address,
  {
    '/premium': {
      price: '$1.00',
      config: {
        description: 'Premium content access',
      },
      network: 'solana-mainnet-beta',
    },
    '/api/data': {
      price: '$0.05',
      config: {
        description: 'API data access',
      },
      network: 'solana-mainnet-beta',
    },
  },
  // ... rest of config
)
```

### Network Selection

You can use different networks:

- `solana-devnet` - For testing (use test tokens)
- `solana-mainnet-beta` - For production (real money!)
- `solana-testnet` - Alternative test network

---

## Usage

### Creating Protected Content

Simply create pages under protected routes defined in your middleware:

```tsx
// app/content/premium/page.tsx
export default async function PremiumPage() {
  return (
    <div>
      <h1>Premium Content</h1>
      <p>This content requires payment to access.</p>
      {/* Your protected content here */}
    </div>
  )
}
```

### Adding New Price Tiers

1. Add the route configuration in `middleware.ts`
2. Create the corresponding page component
3. Users will automatically be prompted to pay when accessing the route

### Testing with Devnet

When using `solana-devnet`:

- Payments use test tokens (no real money)
- Perfect for development and testing
- Get test tokens from [Solana Faucet](https://faucet.solana.com/)

### Going to Production

To accept real payments:

1. Change network to `solana-mainnet-beta` in `middleware.ts`
2. Update your wallet address to your production wallet
3. Test thoroughly before deploying!
4. Consider implementing additional security measures

---

## Dependencies

This template uses minimal dependencies:

```json
{
  "dependencies": {
    "next": "16.0.0",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "viem": "^2.38.5",
    "x402-next": "^0.7.1"
  }
}
```

- **next** - Next.js framework
- **react** / **react-dom** - React library
- **viem** - Type-safe Ethereum/Solana types
- **x402-next** - X402 payment middleware (handles all payment logic)

---

## Learn More

### X402 Protocol

- [X402 Specification](https://github.com/coinbase/x402) - Official protocol documentation
- [X402 Next Package](https://www.npmjs.com/package/x402-next) - Middleware used in this template

### Solana

- [Solana Documentation](https://docs.solana.com/) - Official Solana docs
- [Solana Explorer](https://explorer.solana.com/) - View transactions on-chain

### Coinbase Developer

- [CDP Docs](https://docs.cdp.coinbase.com/) - Coinbase Developer documentation

---

## Troubleshooting

### Payment Not Working

1. Check that your wallet address in `middleware.ts` is correct
2. Verify you're using the correct network (devnet vs mainnet)
3. Check browser console for errors
4. Ensure Coinbase Pay client key is valid

### 402 Errors Not Displaying

1. Check middleware matcher configuration in `middleware.ts`
2. Verify route paths match your page structure
3. Clear Next.js cache: `rm -rf .next && pnpm dev`

### Session Not Persisting

1. Check that cookies are enabled in your browser
2. Verify session token endpoint is configured
3. Check for CORS issues if using custom domains

---

## Support

For issues specific to this template, please open an issue on the repository.

For X402 protocol questions, refer to the [official documentation](https://github.com/coinbase/x402).

---

## License

MIT License - Feel free to use this template for your projects.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ from [Kronos](https://www.kronos.build/)**
