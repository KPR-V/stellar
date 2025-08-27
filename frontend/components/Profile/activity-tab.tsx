'use client'
import React, { useState } from 'react'
import { Clock, ArrowUpRight, ArrowDownRight, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'
import { SorobanRpc ,Transaction ,Networks } from '@stellar/stellar-sdk'
const ActivityTab = () => {
  const [activeForm, setActiveForm] = useState<'deposit' | 'withdraw' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { address, walletKit } = useWallet()
const RPC_URL = 'https://soroban-testnet.stellar.org'
  // Updated token options with correct Stellar testnet addresses
  const tokenOptions = [
    { 
      symbol: 'XLM', 
      name: 'Stellar Lumens', 
      address: 'native', // XLM is native, no contract address
      isNative: true
    },
    { 
      symbol: 'USDC', 
      name: 'USD Coin', 
      address: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU', // Stellar testnet USDC
      isNative: false
    },
    { 
      symbol: 'EUROC', 
      name: 'Euro Coin', 
      address: 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGX47OAFQNI3OOQKAIJE22LZRY', // Example testnet EUROC
      isNative: false
    }
  ]

  // Form states
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
    const amountInStroops = Math.floor(parseFloat(depositForm.amount) * 10000000).toString()

    const requestBody = {
      action: 'deposit_user_funds',
      userAddress: address,
      amount: amountInStroops,
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
      // Sign the transaction
      const signed = await walletKit.signTransaction(result.data.transactionXdr, {
        address,
        networkPassphrase: 'Test SDF Network ; September 2015'
      })

      // Parse the signed XDR into a Transaction object
      const signedTransaction = new Transaction(signed.signedTxXdr, Networks.TESTNET)

      // Submit the signed transaction
      const rpcServer = new SorobanRpc.Server(RPC_URL)
      const submitResponse = await rpcServer.sendTransaction(signedTransaction)

      console.log('Submit response:', submitResponse) // Add this for debugging

      // Handle different response statuses
      if (submitResponse.status === 'ERROR') {
        console.error('Transaction submission error:', submitResponse)
        throw new Error(`Transaction failed: ${submitResponse.errorResult?.result?.name || 'Unknown error'}`)
      }

      if (submitResponse.status !== 'PENDING') {
        throw new Error(`Unexpected status: ${submitResponse.status}`)
      }

      // Rest of your polling logic...
      let status
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        status = await rpcServer.getTransaction(submitResponse.hash)
        if (status.status !== 'NOT_FOUND') break
      }



      if (!status || status.status === 'NOT_FOUND') {
        throw new Error('Transaction timed out')
      } else if (status.status === 'FAILED') {
        throw new Error('Transaction failed')
      }

      console.log('Transaction confirmed:', status)
      alert(`Deposit of ${depositForm.amount} ${depositForm.asset} successful! Hash: ${submitResponse.hash}`)
      
      setDepositForm({ ...depositForm, amount: '' })
      
    } catch (signError) {
      console.error('Error during signing/submission:', signError)
      alert(`Transaction failed: ${signError instanceof Error ? signError.message : 'Please try again.'}`)
    }
    } else {
      console.error('Deposit failed:', result.error)
      alert(`Deposit failed: ${result.error}`)
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
      // Convert amount to stroops (multiply by 10^7 for Stellar)
      const amountInStroops = Math.floor(parseFloat(withdrawForm.amount) * 10000000).toString()

      const requestBody = {
        action: 'withdraw_user_funds',
        userAddress: address,
        amount: amountInStroops,
        destinationAddress: withdrawForm.destinationAddress,
        ...(withdrawForm.isNative 
          ? { isNative: true, assetCode: 'XLM' }
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
        // Sign and submit transaction
        const signedXdr = await walletKit.signTransaction(result.data.transactionXdr, {
          address,
          networkPassphrase: 'Test SDF Network ; September 2015'
        })

        console.log('Transaction signed successfully:', signedXdr)
        alert(`Withdrawal of ${withdrawForm.amount} ${withdrawForm.asset} initiated successfully!`)
        
        // Reset form
        setWithdrawForm({ ...withdrawForm, amount: '', destinationAddress: '' })
      } else {
        console.error('Withdrawal failed:', result.error)
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
      {/* Accordion-style Deposit and Withdraw */}
      <div className="space-y-3">
        {/* Deposit Accordion */}
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
          
          <div className={`transition-all duration-300 ease-out overflow-hidden ${
            activeForm === 'deposit' ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}>
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

        {/* Withdraw Accordion */}
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
          
          <div className={`transition-all duration-300 ease-out overflow-hidden ${
            activeForm === 'withdraw' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
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

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-white/90 text-lg font-raleway">Recent Activity</h3>
        
        <div className="space-y-3">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Received XLM</p>
                    <p className="text-white/40 text-xs">2 hours ago</p>
                  </div>
                  <p className="text-white/90 text-sm font-medium">+100.00 XLM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Sent USDC</p>
                    <p className="text-white/40 text-xs">5 hours ago</p>
                  </div>
                  <p className="text-white/70 text-sm font-medium">-50.00 USDC</p>
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
