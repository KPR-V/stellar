// api/deploy-sac/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  Networks, 
  TransactionBuilder, 
  Asset, 
  Operation,
  Account,
  BASE_FEE
} from '@stellar/stellar-sdk';
import { SorobanRpc } from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userAddress, assetType, assetCode, issuerAddress } = body;

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'User address is required'
      }, { status: 400 });
    }

    console.log('Deploying SAC for:', { assetType, assetCode, issuerAddress });

    const server = new SorobanRpc.Server(RPC_URL);
    
    // Get user account details
    const sourceAccount = await server.getAccount(userAddress);
    const account = new Account(sourceAccount.accountId(), sourceAccount.sequenceNumber());

    let asset: Asset;
    let contractAddress: string;

    // Create the appropriate asset
    if (assetType === 'native' || assetCode === 'XLM') {
      asset = Asset.native();
      contractAddress = asset.contractId(Networks.TESTNET);
      console.log('Deploying native XLM SAC, contract address:', contractAddress);
    } else if (assetCode && issuerAddress) {
      asset = new Asset(assetCode, issuerAddress);
      contractAddress = asset.contractId(Networks.TESTNET);
      console.log(`Deploying ${assetCode} SAC, contract address:`, contractAddress);
    } else {
      return NextResponse.json({
        success: false,
        error: 'For non-native assets, both assetCode and issuerAddress are required'
      }, { status: 400 });
    }

    // Check if SAC already exists by trying to simulate a call
    try {
      console.log('Checking if SAC already exists...');
      // Simple approach: assume it doesn't exist and let deployment handle duplicates
      console.log('Proceeding with deployment (deployment will handle if already exists)');
    } catch (error) {
      // Continue with deployment
      console.log('Proceeding with deployment');
    }

    // Create the deployment operation
    const deployOperation = Operation.createStellarAssetContract({
      asset: asset,
      source: userAddress
    });

    // Build the transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(deployOperation)
      .setTimeout(30)
      .build();

    console.log('Built deployment transaction');

    // Prepare the transaction
    const preparedTransaction = await server.prepareTransaction(transaction);
    const finalXdr = preparedTransaction.toXDR();

    console.log('SAC deployment transaction prepared, XDR length:', finalXdr.length);

    // Validate the XDR
    try {
      const testParse = TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET);
      console.log('Deployment XDR validation successful');
    } catch (validateError) {
      console.error('CRITICAL: Deployment XDR is invalid!', validateError);
      throw new Error(`Generated invalid deployment XDR: ${validateError instanceof Error ? validateError.message : 'Unknown validation error'}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `${assetCode || 'XLM'} Stellar Asset Contract deployment transaction prepared`,
        transactionXdr: finalXdr,
        contractAddress: contractAddress,
        assetCode: assetCode || 'XLM',
        assetType: assetType || 'native'
      }
    });

  } catch (error) {
    console.error('Error preparing SAC deployment:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: `Failed to prepare SAC deployment: ${errorMessage}`
    }, { status: 500 });
  }
}