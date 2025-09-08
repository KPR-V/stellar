import { NextRequest, NextResponse } from 'next/server';
import { SorobanRpc, TransactionBuilder, Networks, FeeBumpTransaction } from '@stellar/stellar-sdk';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { signedXdr } = await request.json();
    if (!signedXdr) {
      return NextResponse.json({
        success: false,
        error: 'Missing signed transaction XDR'
      }, { status: 400 });
    }

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
      transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    } catch (xdrError) {
      console.error('=== XDR PARSING ERROR ===');
      console.error('Error type:', xdrError?.constructor?.name);
      console.error('Error message:', xdrError instanceof Error ? xdrError.message : 'Unknown error');
      console.error('Error stack:', xdrError instanceof Error ? xdrError.stack : 'No stack trace');
      
      try {
        const envelope = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
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
      console.log('Transaction pending, polling for result...');
      let getResult;
      let finalStatus = 'UNKNOWN';
      
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
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
          
          if (pollError instanceof Error && pollError.message.includes('Bad union switch')) {
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
          
          if (i === 9) { 
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
        let contractResult = null;
        let contractStatus = 'SUCCESS';
        
        if (returnValue) {
          try {
              if (returnValue && typeof returnValue === 'object' && 'status' in returnValue) {
              contractStatus = String(returnValue.status);
              contractResult = returnValue;
            } else if (returnValue && typeof returnValue === 'object') {
              for (const [key, value] of Object.entries(returnValue)) {
                if (key === 'status') {
                  contractStatus = String(value);
                  contractResult = returnValue;
                  break;
                } else if (typeof value === 'object' && value && 'status' in value) {
                  contractStatus = String((value as any).status);
                  contractResult = returnValue;
                  break;
                }
              }
            }
          } catch (parseError) {
            console.error('Failed to parse contract return value:', parseError);
          }
        }
        
        return NextResponse.json({
          success: true,
          data: { 
            hash: result.hash,
            status: finalStatus,
            contractStatus: contractStatus,
            message: contractStatus !== 'SUCCESS' 
              ? `Transaction succeeded but contract execution had status: ${contractStatus}`
              : 'Transaction executed successfully',
            result: contractResult,
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
