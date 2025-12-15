import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { encryptHealthDataForBlockchain, decryptHealthDataFromBlockchain, hashHealthData } from './encryption';
import { MinimalHealthData, InsuranceClaim } from './health-models';

// Solana configuration
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('11111111111111111111111111111112'); // System Program for now

// Connection singleton
let connection: Connection;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return connection;
}

// Health data account structure
export interface HealthDataAccount {
  owner: PublicKey;
  dataHash: string;
  encryptedData: string;
  timestamp: number;
  isActive: boolean;
}

// Insurance claim account structure
export interface InsuranceClaimAccount {
  claimId: string;
  patient: PublicKey;
  insuranceProvider: PublicKey;
  healthDataHash: string;
  claimAmount: number;
  status: 'pending' | 'verified' | 'paid' | 'rejected';
  timestamp: number;
  paymentTxId?: string;
}

// Health Data Storage Service
export class HealthDataStorageService {
  private connection: Connection;

  constructor() {
    this.connection = getConnection();
  }

  // Store encrypted health data on Solana
  async storeHealthData(
    healthData: MinimalHealthData,
    encryptionKey: string,
    signer: Keypair
  ): Promise<{ signature: string; dataHash: string }> {
    // Encrypt the data
    const encryptedData = encryptHealthDataForBlockchain(healthData, encryptionKey);
    const dataHash = hashHealthData(JSON.stringify(healthData));

    // Create a simple memo instruction to store the hash and encrypted data
    // In a real implementation, this would use a custom program
    const memoInstruction = {
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(
        JSON.stringify({
          type: 'health_data',
          hash: dataHash,
          data: encryptedData,
          timestamp: healthData.timestamp,
        })
      ),
    };

    // Create transaction
    const transaction = new Transaction().add(memoInstruction);

    // Send transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [signer]
    );

    return { signature, dataHash };
  }

  // Retrieve encrypted health data from Solana
  async retrieveHealthData(
    dataHash: string,
    encryptionKey: string,
    owner: PublicKey
  ): Promise<MinimalHealthData | null> {
    // In a real implementation, this would query a custom program
    // For now, we'll simulate by returning mock data
    // This is a placeholder - actual implementation would require a custom Solana program

    try {
      // Get recent transactions for the owner
      const transactions = await this.connection.getSignaturesForAddress(owner, { limit: 10 });

      for (const tx of transactions) {
        const transaction = await this.connection.getParsedTransaction(tx.signature);
        if (transaction?.meta?.logMessages) {
          for (const log of transaction.meta.logMessages) {
            if (log.includes('health_data')) {
              try {
                const data = JSON.parse(log.split('health_data: ')[1]);
                if (data.hash === dataHash) {
                  return decryptHealthDataFromBlockchain(data.data, encryptionKey);
                }
              } catch (e) {
                continue;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error retrieving health data:', error);
    }

    return null;
  }

  // Submit insurance claim
  async submitInsuranceClaim(
    claim: InsuranceClaim,
    signer: Keypair
  ): Promise<string> {
    // Create memo instruction with claim data
    const memoInstruction = {
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(
        JSON.stringify({
          type: 'insurance_claim',
          claimId: claim.claimId,
          patientDID: claim.patientDID,
          insuranceProviderDID: claim.insuranceProviderDID,
          healthDataHash: claim.healthDataHash,
          claimAmount: claim.claimAmount,
          status: claim.status,
          timestamp: claim.timestamp,
        })
      ),
    };

    const transaction = new Transaction().add(memoInstruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [signer]
    );

    return signature;
  }

  // Verify insurance claim exists
  async verifyClaimExists(claimId: string, patient: PublicKey): Promise<boolean> {
    try {
      const transactions = await this.connection.getSignaturesForAddress(patient, { limit: 20 });

      for (const tx of transactions) {
        const transaction = await this.connection.getParsedTransaction(tx.signature);
        if (transaction?.meta?.logMessages) {
          for (const log of transaction.meta.logMessages) {
            if (log.includes('insurance_claim')) {
              try {
                const data = JSON.parse(log.split('insurance_claim: ')[1]);
                if (data.claimId === claimId) {
                  return true;
                }
              } catch (e) {
                continue;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error verifying claim:', error);
    }

    return false;
  }

  // Get account balance
  async getBalance(publicKey: PublicKey): Promise<number> {
    return await this.connection.getBalance(publicKey);
  }

  // Request airdrop (for devnet)
  async requestAirdrop(publicKey: PublicKey, amount: number = 1): Promise<string> {
    const signature = await this.connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  // Transfer SOL (for insurance payments)
  async transferSOL(
    from: Keypair,
    to: PublicKey,
    amount: number // in SOL
  ): Promise<string> {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [from]
    );

    return signature;
  }
}

// Utility functions
export async function createHealthDataStorageService(): Promise<HealthDataStorageService> {
  return new HealthDataStorageService();
}

export function generateDataHash(healthData: MinimalHealthData): string {
  return hashHealthData(JSON.stringify(healthData));
}

export function validateDataIntegrity(
  healthData: MinimalHealthData,
  storedHash: string
): boolean {
  return generateDataHash(healthData) === storedHash;
}

// Mock functions for development (replace with actual program calls)
export async function storeHealthDataOnChain(
  healthData: MinimalHealthData,
  encryptionKey: string,
  signer: Keypair
): Promise<{ signature: string; dataHash: string }> {
  const service = await createHealthDataStorageService();
  return service.storeHealthData(healthData, encryptionKey, signer);
}

export async function retrieveHealthDataFromChain(
  dataHash: string,
  encryptionKey: string,
  owner: PublicKey
): Promise<MinimalHealthData | null> {
  const service = await createHealthDataStorageService();
  return service.retrieveHealthData(dataHash, encryptionKey, owner);
}

export async function submitClaimToChain(
  claim: InsuranceClaim,
  signer: Keypair
): Promise<string> {
  const service = await createHealthDataStorageService();
  return service.submitInsuranceClaim(claim, signer);
}
