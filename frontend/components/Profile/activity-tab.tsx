'use client'
import React, { useState } from 'react'
import { Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'

interface ActivityTabProps {
  showMessage: (message: string) => void
}

const ActivityTab: React.FC<ActivityTabProps> = ({ showMessage }) => {
  const [activeForm, setActiveForm] = useState<'deposit' | 'withdraw' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { address, walletKit } = useWallet()
  const tokenOptions = [
    { 
      symbol: 'XLM', 
      name: 'Stellar Lumens', 
      address: 'native',
      isNative: true
    },
    { 
      symbol: 'USDC', 
      name: 'USD Coin', 
      address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      isNative: false
    },
    { 
      symbol: 'EURC', 
      name: 'Euro Coin', 
      address: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
      isNative: false
    }
  ]

  const [depositForm, setDepositForm] = useState({
    asset: 'XLM',
    tokenAddress: 'native',
    amount: '',
    isNative: true
  })

  const [withdrawForm, setWithdrawForm] = useState({
    asset: 'XLM',
    tokenAddress: 'native',
    amount: '',
    destinationAddress: '',
    isNative: true
  })

  const toggleForm = (formType: 'deposit' | 'withdraw') => {
    setActiveForm(activeForm === formType ? null : formType)
  }

  const handleDepositAssetChange = (asset: string) => {
    const selectedToken = tokenOptions.find(token => token.symbol === asset)
    console.log('Selected asset for deposit:', { 
      asset, 
      selectedToken,
      tokenAddress: selectedToken?.address,
      isNative: selectedToken?.isNative 
    })
    setDepositForm(prev => ({
      ...prev,
      asset,
      tokenAddress: selectedToken?.address || '',
      isNative: selectedToken?.isNative || false
    }))
  }

  const handleWithdrawAssetChange = (asset: string) => {
    const selectedToken = tokenOptions.find(token => token.symbol === asset)
    setWithdrawForm(prev => ({
      ...prev,
      asset,
      tokenAddress: selectedToken?.address || '',
      isNative: selectedToken?.isNative || false
    }))
  }

 const handleDeposit = async () => {
  if (!address || !walletKit) {
    alert('Please connect your wallet first')
    return
  }

  if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
    alert('Please enter a valid amount')
    return
  }

  setIsLoading(true)
  
  try {
    const initCheckResponse = await fetch('/api/contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'check_user_initialized',
        userAddress: address
      }),
    })

    const initCheckResult = await initCheckResponse.json()
    
    if (initCheckResult.success && !initCheckResult.data.isInitialized) {
      alert('Your account needs to be initialized first. Please initialize your account before depositing funds.')
      setIsLoading(false)
      return
    }

    const amountInStroops = Math.floor(parseFloat(depositForm.amount) * 10000000).toString()

    const requestBody = {
      action: 'deposit_user_funds',
      userAddress: address,
      amount: amountInStroops,
      assetCode: depositForm.asset,
      ...(depositForm.isNative 
        ? { isNative: true }
        : { tokenAddress: depositForm.tokenAddress, isNative: false }
      )
    }

    const response = await fetch('/api/contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()

    if (result.success && result.data.transactionXdr) {
      try {
          const signed = await walletKit.signTransaction(result.data.transactionXdr, {
          address,
          networkPassphrase: 'Test SDF Network ; September 2015'
        })

        try {
          const { TransactionBuilder, Networks } = await import('@stellar/stellar-sdk');
          const validatedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET);
        } catch (validationError) {
          throw new Error(`Wallet returned corrupted XDR: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`);
        }

        const submitResponse = await fetch('/api/contract/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ signedXdr: signed.signedTxXdr }),
        })

        const submitResult = await submitResponse.json()

        if (submitResult.success) {
          console.log('Transaction confirmed:', submitResult.data)
          showMessage(`Your Deposit was successfully executed! ${depositForm.amount} ${depositForm.asset} deposited successfully.`)
          setDepositForm({ ...depositForm, amount: '' })
        } else {
          console.error('Transaction failed:', submitResult)
          
          let errorMessage = submitResult.error || 'Transaction failed'
          if (errorMessage.includes('not initialized')) {
            errorMessage = 'Account not initialized. Please initialize your account first.'
          } else if (errorMessage.includes('insufficient')) {
            errorMessage = 'Insufficient balance or allowance for this transaction.'
          } else if (errorMessage.includes('auth')) {
            errorMessage = 'Authentication failed. Please check your wallet connection.'
          }
          
          alert(`Transaction failed: ${errorMessage}`)
          if (submitResult.details) {
            console.error('Detailed error information:', submitResult.details)
          }
        }
        
      } catch (signError) {
        console.error('Error during signing/submission:', signError)
        alert(`Transaction failed: ${signError instanceof Error ? signError.message : 'Please try again.'}`)
      }
    } else {
      console.error('Deposit preparation failed:', result.error)
      
      if (result.error && result.error.includes('Stellar Asset Contract needs to be deployed')) {
        showMessage('Native XLM Stellar Asset Contract needs to be deployed first. This is a one-time setup required for XLM transactions.');
        
        const shouldDeploy = confirm(
          `The native XLM Stellar Asset Contract (SAC) needs to be deployed first. This is a one-time setup.\n\n` +
          `Would you like to deploy it now? This will require a small transaction fee.`
        )
        
        if (shouldDeploy) {
          try {
            console.log('Preparing SAC deployment...')
            const deployResponse = await fetch('/api/deploy-sac', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userAddress: address }),
            })

            const deployResult = await deployResponse.json()

            if (deployResult.success) {
              if (deployResult.data.alreadyExists) {
                showMessage('Native XLM SAC is already deployed! Please try your deposit again.')
              } else {
                showMessage('Preparing SAC deployment transaction for signing...')
                const deployedSigned = await walletKit.signTransaction(deployResult.data.transactionXdr, {
                  address,
                  networkPassphrase: 'Test SDF Network ; September 2015'
                })

                const deploySubmitResponse = await fetch('/api/contract/submit', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ signedXdr: deployedSigned.signedTxXdr }),
                })

                const deploySubmitResult = await deploySubmitResponse.json()

                if (deploySubmitResult.success) {
                  showMessage('Native XLM SAC deployed successfully! Please try your deposit again.')
                } else {
                  showMessage(`SAC deployment failed: ${deploySubmitResult.error}`)
                }
              }
            } else {
              showMessage(`SAC deployment preparation failed: ${deployResult.error}`)
            }
          } catch (deployError) {
            console.error('Error during SAC deployment:', deployError)
            showMessage(`SAC deployment failed: ${deployError instanceof Error ? deployError.message : 'Please try again.'}`)
          }
        }
      } else {
        let errorMessage = result.error || 'Failed to prepare transaction'
        if (errorMessage.includes('not initialized')) {
          errorMessage = 'Your account needs to be initialized first. Please initialize your account before depositing funds.'
        }
        showMessage(`Deposit failed: ${errorMessage}`)
      }
    }
  } catch (error) {
    console.error('Error during deposit:', error)
    alert(`Deposit failed: ${error instanceof Error ? error.message : 'Please try again.'}`)
  } finally {
    setIsLoading(false)
  }
}


  const handleWithdraw = async () => {
    if (!address || !walletKit) {
      alert('Please connect your wallet first')
      return
    }

    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!withdrawForm.destinationAddress) {
      alert('Please enter a destination address')
      return
    }

    setIsLoading(true)
    
    try {
      const amountInStroops = Math.floor(parseFloat(withdrawForm.amount) * 10000000).toString()
      const requestBody = {
        action: 'withdraw_user_funds',
        userAddress: address,
        amount: amountInStroops,
        destinationAddress: withdrawForm.destinationAddress,
        assetCode: withdrawForm.asset,
        ...(withdrawForm.isNative 
          ? { isNative: true }
          : { tokenAddress: withdrawForm.tokenAddress, isNative: false }
        )
      }

      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (result.success && result.data.transactionXdr) {
        try {
          const signed = await walletKit.signTransaction(result.data.transactionXdr, {
            address,
            networkPassphrase: 'Test SDF Network ; September 2015'
          })

          try {
            const { TransactionBuilder, Networks } = await import('@stellar/stellar-sdk');
            const validatedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET);
          } catch (validationError) {
            console.error('CRITICAL: Signed withdrawal XDR is corrupted!', validationError);
            throw new Error(`Wallet returned corrupted withdrawal XDR: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`);
          }

          const submitResponse = await fetch('/api/contract/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signedXdr: signed.signedTxXdr }),
          })

          const submitResult = await submitResponse.json()

          if (submitResult.success) {
              showMessage(`Your Withdrawal was successfully executed! ${withdrawForm.amount} ${withdrawForm.asset} withdrawn successfully.`)
              setWithdrawForm({ ...withdrawForm, amount: '', destinationAddress: '' })
          } else {
            console.error('Withdrawal failed:', submitResult)
            alert(`Withdrawal failed: ${submitResult.error}`)
            
            if (submitResult.details) {
              console.error('Detailed error information:', submitResult.details)
            }
          }
        } catch (signError) {
          console.error('Error during withdrawal signing/submission:', signError)
          alert(`Withdrawal failed: ${signError instanceof Error ? signError.message : 'Please try again.'}`)
        }
      } else {
        console.error('Withdrawal preparation failed:', result.error)
        alert(`Withdrawal failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error during withdrawal:', error)
      alert('Withdrawal failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 font-raleway">
      <div className="space-y-3">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <button
            onClick={() => toggleForm('deposit')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-white/70" />
              <span className="text-white/90 font-medium">Deposit Funds</span>
            </div>
            {activeForm === 'deposit' ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/50" />
            )}
          </button>
          
          <div className={`transition-all duration-300 ease-out overflow-hidden ${activeForm === 'deposit' ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 border-t border-white/5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Asset</label>
                  <select 
                    value={depositForm.asset}
                    onChange={(e) => handleDepositAssetChange(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:border-white/20 focus:outline-none transition-colors"
                  >
                    {tokenOptions.map(token => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    {depositForm.isNative ? 'Native XLM' : `Token: ${depositForm.tokenAddress.slice(0, 10)}...`}
                  </p>
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={handleDeposit}
                    disabled={isLoading || !address}
                    className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Confirm Deposit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Withdraw */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <button
            onClick={() => toggleForm('withdraw')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <Minus className="w-5 h-5 text-white/70" />
              <span className="text-white/90 font-medium">Withdraw Funds</span>
            </div>
            {activeForm === 'withdraw' ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/50" />
            )}
          </button>
          
          <div className={`transition-all duration-300 ease-out overflow-hidden ${activeForm === 'withdraw' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 border-t border-white/5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Asset</label>
                  <select 
                    value={withdrawForm.asset}
                    onChange={(e) => handleWithdrawAssetChange(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:border-white/20 focus:outline-none transition-colors"
                  >
                    {tokenOptions.map(token => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    {withdrawForm.isNative ? 'Native XLM' : `Token: ${withdrawForm.tokenAddress.slice(0, 10)}...`}
                  </p>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Destination Address</label>
                  <input
                    type="text"
                    placeholder="G... (Stellar address)"
                    value={withdrawForm.destinationAddress}
                    onChange={(e) => setWithdrawForm(prev => ({ ...prev, destinationAddress: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    Enter a Stellar address starting with 'G'
                  </p>
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={handleWithdraw}
                    disabled={isLoading || !address}
                    className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityTab
