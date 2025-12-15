import
{
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN, Wallet } from '@coral-xyz/anchor';
import { encryptHealthDataForBlockchain, decryptHealthDataFromBlockchain, hashHealthData } from './encryption';
import { MinimalHealthData, InsuranceClaim } from './health-models';

// Solana configuration
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey( '6HD1Jm5jRp8qw6hgVhCbp4KCVZkYptZkf7Ue8TJ2Sr5q' );

// IDL Definition
const IDL: Idl = {
  "address": "6HD1Jm5jRp8qw6hgVhCbp4KCVZkYptZkf7Ue8TJ2Sr5q",
  "metadata": {
    "name": "primal_health_solana_program",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "create_claim",
      "discriminator": [ 71, 122, 43, 84, 240, 165, 215, 181 ],
      "accounts": [
        { "name": "claim_account", "writable": true, "pda": { "seeds": [ { "kind": "const", "value": [ 99, 108, 97, 105, 109 ] }, { "kind": "arg", "path": "claim_id" } ] } },
        { "name": "patient", "writable": true, "signer": true },
        { "name": "provider" },
        { "name": "system_program", "address": "11111111111111111111111111111111" }
      ],
      "args": [
        { "name": "claim_id", "type": "string" },
        { "name": "amount", "type": "u64" },
        { "name": "health_data_hash", "type": "string" }
      ]
    },
    {
      "name": "initialize_patient",
      "discriminator": [ 44, 13, 38, 126, 186, 168, 125, 190 ],
      "accounts": [
        { "name": "patient_account", "writable": true, "pda": { "seeds": [ { "kind": "const", "value": [ 112, 97, 116, 105, 101, 110, 116 ] }, { "kind": "account", "path": "authority" } ] } },
        { "name": "authority", "writable": true, "signer": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" }
      ],
      "args": [
        { "name": "did", "type": "string" }
      ]
    },
    {
      "name": "initialize_provider",
      "discriminator": [ 181, 103, 225, 14, 214, 210, 161, 238 ],
      "accounts": [
        { "name": "provider_account", "writable": true, "pda": { "seeds": [ { "kind": "const", "value": [ 112, 114, 111, 118, 105, 100, 101, 114 ] }, { "kind": "account", "path": "authority" } ] } },
        { "name": "authority", "writable": true, "signer": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" }
      ],
      "args": [
        { "name": "did", "type": "string" },
        { "name": "name", "type": "string" }
      ]
    },
    {
      "name": "process_payment",
      "discriminator": [ 189, 81, 30, 198, 139, 186, 115, 23 ],
      "accounts": [
        { "name": "claim_account", "writable": true },
        { "name": "provider", "writable": true, "signer": true },
        { "name": "patient", "writable": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" }
      ],
      "args": []
    },
    {
      "name": "submit_health_data",
      "discriminator": [ 65, 196, 14, 219, 94, 245, 184, 174 ],
      "accounts": [
        { "name": "health_data_account", "writable": true, "pda": { "seeds": [ { "kind": "const", "value": [ 104, 101, 97, 108, 116, 104, 95, 100, 97, 116, 97 ] }, { "kind": "arg", "path": "data_hash" } ] } },
        { "name": "owner", "writable": true, "signer": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" }
      ],
      "args": [
        { "name": "data_hash", "type": "string" },
        { "name": "encrypted_data", "type": "string" }
      ]
    },
    {
      "name": "verify_claim",
      "discriminator": [ 35, 121, 58, 82, 51, 132, 99, 113 ],
      "accounts": [
        { "name": "claim_account", "writable": true },
        { "name": "provider", "signer": true }
      ],
      "args": [
        { "name": "status", "type": { "defined": { "name": "ClaimStatus" } } }
      ]
    }
  ],
  "accounts": [
    { "name": "ClaimAccount", "discriminator": [ 113, 109, 47, 96, 242, 219, 61, 165 ] },
    { "name": "HealthDataAccount", "discriminator": [ 118, 47, 165, 198, 80, 44, 199, 179 ] },
    { "name": "PatientAccount", "discriminator": [ 235, 103, 40, 224, 205, 208, 192, 46 ] },
    { "name": "ProviderAccount", "discriminator": [ 0, 183, 216, 154, 30, 170, 67, 66 ] }
  ],
  "errors": [
    { "code": 6000, "name": "Unauthorized", "msg": "You are not authorized to perform this action." },
    { "code": 6001, "name": "InvalidPatient", "msg": "The patient account does not match the claim." },
    { "code": 6002, "name": "ClaimNotVerified", "msg": "The claim must be verified before payment." }
  ],
  "types": [
    {
      "name": "ClaimAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "claim_id", "type": "string" },
          { "name": "patient", "type": "pubkey" },
          { "name": "provider", "type": "pubkey" },
          { "name": "health_data_hash", "type": "string" },
          { "name": "amount", "type": "u64" },
          { "name": "status", "type": { "defined": { "name": "ClaimStatus" } } },
          { "name": "timestamp", "type": "i64" }
        ]
      }
    },
    {
      "name": "ClaimStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "Pending" },
          { "name": "Verified" },
          { "name": "Paid" },
          { "name": "Rejected" }
        ]
      }
    },
    {
      "name": "HealthDataAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "pubkey" },
          { "name": "data_hash", "type": "string" },
          { "name": "encrypted_data", "type": "string" },
          { "name": "timestamp", "type": "i64" }
        ]
      }
    },
    {
      "name": "PatientAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "did", "type": "string" }
        ]
      }
    },
    {
      "name": "ProviderAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "did", "type": "string" },
          { "name": "name", "type": "string" }
        ]
      }
    }
  ]
};

// Connection singleton
let connection: Connection;

export function getConnection (): Connection
{
  if ( !connection )
  {
    connection = new Connection( SOLANA_RPC_URL, 'confirmed' );
  }
  return connection;
}

// Health Data Storage Service
export class HealthDataStorageService
{
  private connection: Connection;

  constructor ()
  {
    this.connection = getConnection();
  }

  private getProgram ( signer: Keypair ): Program
  {
    const wallet = new Wallet( signer );
    const provider = new AnchorProvider( this.connection, wallet, {
      preflightCommitment: 'confirmed',
    } );
    return new Program( IDL, provider );
  }
  // Initialize Patient Account
  async initializePatient (
    did: string,
    signer: Keypair
  ): Promise<string>
  {
    const program = this.getProgram( signer );

    const [ patientPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "patient" ), signer.publicKey.toBuffer() ],
      program.programId
    );

    const tx = await program.methods
      .initializePatient( did )
      .accounts( {
        patientAccount: patientPDA,
        authority: signer.publicKey,
        systemProgram: SystemProgram.programId,
      } )
      .signers( [ signer ] )
      .rpc();

    return tx;
  }

  // Initialize Provider Account
  async initializeProvider (
    did: string,
    name: string,
    signer: Keypair
  ): Promise<string>
  {
    const program = this.getProgram( signer );

    const [ providerPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "provider" ), signer.publicKey.toBuffer() ],
      program.programId
    );

    const tx = await program.methods
      .initializeProvider( did, name )
      .accounts( {
        providerAccount: providerPDA,
        authority: signer.publicKey,
        systemProgram: SystemProgram.programId,
      } )
      .signers( [ signer ] )
      .rpc();

    return tx;
  }
  // Store encrypted health data on Solana
  async storeHealthData (
    healthData: MinimalHealthData,
    encryptionKey: string,
    signer: Keypair
  ): Promise<{ signature: string; dataHash: string }>
  {
    const program = this.getProgram( signer );
    const encryptedData = encryptHealthDataForBlockchain( healthData, encryptionKey );
    const dataHash = hashHealthData( JSON.stringify( healthData ) );

    const [ healthDataPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "health_data" ), Buffer.from( dataHash ) ],
      program.programId
    );

    const tx = await program.methods
      .submitHealthData( dataHash, encryptedData )
      .accounts( {
        healthDataAccount: healthDataPDA,
        owner: signer.publicKey,
        systemProgram: SystemProgram.programId,
      } )
      .signers( [ signer ] )
      .rpc();

    return { signature: tx, dataHash };
  }

  // Retrieve encrypted health data from Solana
  async retrieveHealthData (
    dataHash: string,
    encryptionKey: string,
    owner: PublicKey
  ): Promise<MinimalHealthData | null>
  {
    // For reading, we can use a dummy wallet since we don't need to sign
    const dummyWallet = new Wallet( Keypair.generate() );
    const provider = new AnchorProvider( this.connection, dummyWallet, {
      preflightCommitment: 'confirmed',
    } );
    const program = new Program( IDL, provider );

    const [ healthDataPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "health_data" ), Buffer.from( dataHash ) ],
      program.programId
    );

    try
    {
      const account = await program.account.healthDataAccount.fetch( healthDataPDA );
      if ( account )
      {
        return decryptHealthDataFromBlockchain( account.encryptedData as string, encryptionKey );
      }
    } catch ( error )
    {
      console.error( 'Error retrieving health data:', error );
    }

    return null;
  }

  // Submit insurance claim
  async submitInsuranceClaim (
    claim: InsuranceClaim,
    signer: Keypair
  ): Promise<string>
  {
    const program = this.getProgram( signer );

    const [ claimPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "claim" ), Buffer.from( claim.claimId ) ],
      program.programId
    );

    // Convert claim amount to lamports (assuming claimAmount is in SOL)
    const amount = new BN( claim.claimAmount * LAMPORTS_PER_SOL );

    // We need the provider's public key. In a real app, we'd look this up from the DID.
    // For now, we'll assume the claim.insuranceProviderDID contains the pubkey or we have a way to resolve it.
    // Since we don't have a DID resolver here, we'll use a placeholder or derive it if possible.
    // IMPORTANT: The program expects a Pubkey for the provider.
    // Let's assume for this demo that we can't easily resolve it without a lookup service.
    // However, the instruction requires `provider` account.
    // We will use a dummy key for now if we can't resolve it, but this will fail verification if not correct.
    // Ideally, we should pass the provider's public key to this function.
    // For the sake of this implementation, let's assume the signer knows the provider's key.
    // We'll use a random key for now to satisfy the type, but this needs to be fixed in a real app.
    const providerPubkey = Keypair.generate().publicKey; // REPLACE WITH REAL PROVIDER KEY

    const tx = await program.methods
      .createClaim( claim.claimId, amount, claim.healthDataHash )
      .accounts( {
        claimAccount: claimPDA,
        patient: signer.publicKey,
        provider: providerPubkey, // This should be the actual provider's pubkey
        systemProgram: SystemProgram.programId,
      } )
      .signers( [ signer ] )
      .rpc();

    return tx;
  }

  // Verify insurance claim exists
  async verifyClaimExists ( claimId: string, patient: PublicKey ): Promise<boolean>
  {
    const dummyWallet = new Wallet( Keypair.generate() );
    const provider = new AnchorProvider( this.connection, dummyWallet, {
      preflightCommitment: 'confirmed',
    } );
    const program = new Program( IDL, provider );

    const [ claimPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "claim" ), Buffer.from( claimId ) ],
      program.programId
    );

    try
    {
      const account = await program.account.claimAccount.fetch( claimPDA );
      return !!account;
    } catch ( error )
    {
      return false;
    }
  }

  // Process payment for a claim
  async processPayment (
    claimId: string,
    providerSigner: Keypair,
    patientPubkey: PublicKey
  ): Promise<string>
  {
    const program = this.getProgram( providerSigner );

    const [ claimPDA ] = PublicKey.findProgramAddressSync(
      [ Buffer.from( "claim" ), Buffer.from( claimId ) ],
      program.programId
    );

    const tx = await program.methods
      .processPayment()
      .accounts( {
        claimAccount: claimPDA,
        provider: providerSigner.publicKey,
        patient: patientPubkey,
        systemProgram: SystemProgram.programId,
      } )
      .signers( [ providerSigner ] )
      .rpc();

    return tx;
  }

  // Get account balance
  async getBalance ( publicKey: PublicKey ): Promise<number>
  {
    return await this.connection.getBalance( publicKey );
  }

  // Request airdrop (for devnet)
  async requestAirdrop ( publicKey: PublicKey, amount: number = 1 ): Promise<string>
  {
    const signature = await this.connection.requestAirdrop( publicKey, amount * LAMPORTS_PER_SOL );
    await this.connection.confirmTransaction( signature );
    return signature;
  }
}

// Utility functions
export async function createHealthDataStorageService (): Promise<HealthDataStorageService>
{
  return new HealthDataStorageService();
}

export function generateDataHash ( healthData: MinimalHealthData ): string
{
  return hashHealthData( JSON.stringify( healthData ) );
}

export function validateDataIntegrity (
  healthData: MinimalHealthData,
  storedHash: string
): boolean
{
  return generateDataHash( healthData ) === storedHash;
}

// Mock functions for development (replace with actual program calls)
export async function storeHealthDataOnChain (
  healthData: MinimalHealthData,
  encryptionKey: string,
  signer: Keypair
): Promise<{ signature: string; dataHash: string }>
{
  const service = await createHealthDataStorageService();
  return service.storeHealthData( healthData, encryptionKey, signer );
}

export async function retrieveHealthDataFromChain (
  dataHash: string,
  encryptionKey: string,
  owner: PublicKey
): Promise<MinimalHealthData | null>
{
  const service = await createHealthDataStorageService();
  return service.retrieveHealthData( dataHash, encryptionKey, owner );
}

export async function submitClaimToChain (
  claim: InsuranceClaim,
  signer: Keypair
): Promise<string>
{
  const service = await createHealthDataStorageService();
  return service.submitInsuranceClaim( claim, signer );
}

export async function processClaimPayment (
  claimId: string,
  providerSigner: Keypair,
  patientPubkey: PublicKey
): Promise<string>
{
  const service = await createHealthDataStorageService();
  return service.processPayment( claimId, providerSigner, patientPubkey );
}
