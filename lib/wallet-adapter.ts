import { Wallet } from '@coral-xyz/anchor';
import { Transaction, VersionedTransaction, PublicKey, Connection } from '@solana/web3.js';
import { UiWallet, UiWalletAccount } from '@wallet-standard/react';

export class StandardWalletAdapter implements Wallet
{
    constructor ( private wallet: UiWallet, private account: UiWalletAccount ) { }

    async signTransaction<T extends Transaction | VersionedTransaction> ( tx: T ): Promise<T>
    {
        const feature = this.wallet.features[ 'solana:signTransaction' ] as any;
        if ( !feature )
        {
            throw new Error( "Wallet does not support signTransaction" );
        }

        // Serialize transaction
        const serialized = tx instanceof VersionedTransaction
            ? tx.serialize()
            : tx.serialize( { requireAllSignatures: false, verifySignatures: false } );

        const output = await feature.signTransaction( {
            account: this.account,
            chain: 'solana:devnet', // or mainnet
            transaction: serialized,
        } );

        const signedTx = output[ 0 ].signedTransaction;

        if ( tx instanceof VersionedTransaction )
        {
            return VersionedTransaction.deserialize( signedTx ) as T;
        } else
        {
            return Transaction.from( signedTx ) as T;
        }
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction> ( txs: T[] ): Promise<T[]>
    {
        const feature = this.wallet.features[ 'solana:signTransaction' ] as any;
        if ( !feature )
        {
            throw new Error( "Wallet does not support signTransaction" );
        }

        const inputs = txs.map( tx => ( {
            account: this.account,
            chain: 'solana:devnet',
            transaction: tx instanceof VersionedTransaction
                ? tx.serialize()
                : tx.serialize( { requireAllSignatures: false, verifySignatures: false } ),
        } ) );

        const outputs = await feature.signTransaction( ...inputs );

        return outputs.map( ( out: any, i: number ) =>
        {
            if ( txs[ i ] instanceof VersionedTransaction )
            {
                return VersionedTransaction.deserialize( out.signedTransaction );
            } else
            {
                return Transaction.from( out.signedTransaction );
            }
        } ) as T[];
    }

    get publicKey (): PublicKey
    {
        return new PublicKey( this.account.address );
    }
}
