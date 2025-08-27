// app/api/contract/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SorobanRpc, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { signedXdr } = await request.json();

    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
    const transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    
    const result = await server.sendTransaction(transaction);

    return NextResponse.json({
      success: true,
      data: { 
        hash: result.hash,
        status: result.status,
        message: 'Transaction submitted successfully' 
      }
    });

  } catch (error) {
    console.error('Error submitting transaction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit transaction'
    }, { status: 500 });
  }
}
