import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 font-sans">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-16 px-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-2xl">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Primal Health
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Secure, automated insurance claims with Solana blockchain
            </p>
            <p className="text-gray-500">
              Share minimal encrypted health data and receive instant insurance payments
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-600">End-to-end encrypted health data</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold mb-1">Instant Claims</h3>
              <p className="text-sm text-gray-600">Automated payment processing</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">🏥</div>
              <h3 className="font-semibold mb-1">DID-Based</h3>
              <p className="text-sm text-gray-600">Decentralized patient identity</p>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/diagnostics"
              className="inline-block w-full px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              Submit Health Diagnostics 📊
            </Link>
            <Link
              href="/dashboard"
              className="inline-block w-full px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              View My Claims 📋
            </Link>
          </div>

          <div className="mt-8 text-xs text-gray-400">
            Built on Solana Devnet • X402 Protocol • Privacy-First
          </div>
        </div>
      </main>
    </div>
  )
}
