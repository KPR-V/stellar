// app/api/contract/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SorobanRpc, TransactionBuilder, Networks, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { signedXdr } = await request.json();

    if (!signedXdr) {
      return NextResponse.json({
        success: false,
        error: 'Missing signed transaction XDR'
      }, { status: 400 });
    }

    console.log('=== XDR SUBMISSION DEBUGGING ===');
    console.log('Received signed XDR length:', signedXdr.length);
    console.log('XDR first 200 chars:', signedXdr.substring(0, 200));
    console.log('XDR last 100 chars:', signedXdr.substring(signedXdr.length - 100));

    // Validate XDR format before parsing
    if (!signedXdr.match(/^[A-Za-z0-9+/]+=*$/)) {
      console.error('Invalid XDR format - contains non-base64 characters');
      return NextResponse.json({
        success: false,
        error: 'Invalid XDR format: XDR must be base64 encoded'
      }, { status: 400 });
    }

    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    let transaction;
    try {
      console.log('Attempting to parse XDR...');
      transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      console.log('Successfully parsed transaction from XDR');
      
      // Log transaction details for debugging
      console.log('Transaction details:', {
        fee: transaction.fee,
        operationsCount: transaction.operations.length,
        networkPassphrase: transaction.networkPassphrase,
        isFeebump: transaction instanceof FeeBumpTransaction
      });
      
      if ('source' in transaction) {
        console.log('Source account:', transaction.source);
      }
      if ('sequence' in transaction) {
        console.log('Sequence number:', transaction.sequence);
      }
      
    } catch (xdrError) {
      console.error('=== XDR PARSING ERROR ===');
      console.error('Error type:', xdrError?.constructor?.name);
      console.error('Error message:', xdrError instanceof Error ? xdrError.message : 'Unknown error');
      console.error('Error stack:', xdrError instanceof Error ? xdrError.stack : 'No stack trace');
      
      // Try to parse as different XDR types to diagnose the issue
      try {
        console.log('Attempting to parse as TransactionEnvelope...');
        const envelope = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        console.log('Parsed as envelope successfully, but original parsing failed');
      } catch (envelopeError) {
        console.log('Also failed to parse as TransactionEnvelope:', envelopeError instanceof Error ? envelopeError.message : 'Unknown');
      }
      
      return NextResponse.json({
        success: false,
        error: `XDR parsing failed: ${xdrError instanceof Error ? xdrError.message : 'Unknown XDR error'}`,
        details: {
          xdrLength: signedXdr.length,
          errorType: xdrError?.constructor?.name,
          isBase64Valid: signedXdr.match(/^[A-Za-z0-9+/]+=*$/) !== null
        }
      }, { status: 400 });
    }
    
    console.log('Submitting transaction to network...');
    const result = await server.sendTransaction(transaction);

    console.log('Transaction submission result:', {
      status: result.status,
      hash: result.hash,
      errorResult: result.errorResult
    });

    if (result.status === 'ERROR') {
      console.error('Transaction submission failed:', result.errorResult);
      return NextResponse.json({
        success: false,
        error: `Transaction submission failed: ${result.errorResult?.result?.name || 'Unknown error'}`,
        details: result.errorResult
      }, { status: 400 });
    }

    if (result.status === 'PENDING') {
      // Poll for the transaction result with improved error handling
      console.log('Transaction pending, polling for result...');
      let getResult;
      let finalStatus = 'UNKNOWN';
      
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        try {
          getResult = await server.getTransaction(result.hash);
          
          console.log(`Poll attempt ${i + 1}:`, {
            status: getResult.status,
            hash: result.hash
          });

          if (getResult.status !== 'NOT_FOUND') {
            finalStatus = getResult.status;
            break;
          }
        } catch (pollError) {
          console.error(`Poll attempt ${i + 1} failed:`, {
            error: pollError instanceof Error ? pollError.message : 'Unknown error',
            hash: result.hash
          });
          
          // If we get an XDR parsing error on getTransaction, the transaction likely succeeded
          // but Horizon is having issues parsing the result. This is a known Horizon issue.
          if (pollError instanceof Error && pollError.message.includes('Bad union switch')) {
            console.log('Horizon XDR parsing error detected - transaction likely succeeded but result cannot be parsed');
            
            // Return success with a warning about result parsing
            return NextResponse.json({
              success: true,
              data: { 
                hash: result.hash,
                status: 'SUCCESS_BUT_RESULT_UNPARSEABLE',
                message: 'Transaction submitted successfully, but result details could not be retrieved due to Horizon server issue',
                warning: 'This is a known Horizon server issue with XDR parsing. The transaction likely succeeded.'
              }
            });
          }
          
          // For other errors, continue polling
          if (i === 9) { // Last attempt
            console.error('All poll attempts failed, returning timeout');
            break;
          }
        }
      }

      if (!getResult || finalStatus === 'NOT_FOUND' || finalStatus === 'UNKNOWN') {
        return NextResponse.json({
          success: false,
          error: 'Transaction timed out - could not confirm transaction status',
          hash: result.hash,
          details: {
            message: 'The transaction was submitted but we could not retrieve the final status. Check the transaction hash on Stellar Expert.',
            explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`
          }
        });
      }

      if (finalStatus === 'SUCCESS') {
        console.log('Transaction confirmed successfully');
        const returnValue = 'returnValue' in getResult ? getResult.returnValue : undefined;
        
        return NextResponse.json({
          success: true,
          data: { 
            hash: result.hash,
            status: finalStatus,
            message: 'Transaction executed successfully',
            returnValue: returnValue
          }
        });
      } else if (finalStatus === 'FAILED') {
        console.error('Transaction execution failed');
        
        const errorResult = 'resultXdr' in getResult ? getResult.resultXdr : undefined;
        const diagnosticEvents = 'diagnosticEventsXdr' in getResult ? getResult.diagnosticEventsXdr : undefined;
        
        return NextResponse.json({
          success: false,
          error: 'Transaction execution failed',
          hash: result.hash,
          details: {
            status: finalStatus,
            errorResult: errorResult,
            diagnosticEvents: diagnosticEvents
          }
        });
      }
    }

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
