'use client'
import React, { useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useMessage } from '../../hooks/useMessage'

interface Props {
  isOpen: boolean
  onClose: () => void
  onRequireStake: () => void
  onProposalCreated?: () => void
}

const ProposalCreationForm: React.FC<Props> = ({ isOpen, onClose, onRequireStake, onProposalCreated }) => {
  const { address, walletKit } = useWallet()
  const { showMessage } = useMessage()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    proposal_type: 'UpdateConfig' as string,
    arbitrage_config_data: {
      enabled: 'true',
      min_profit_bps: '',
      max_trade_size: '',
      slippage_tolerance_bps: '',
      max_gas_price: '',
      min_liquidity: '',
    },
    trading_pair_data: {
      base_asset_symbol: '',
      quote_asset_symbol: '',
      base_asset_address: '',
      quote_asset_address: '',
      target_peg: '',
      max_spread_bps: '',
      enabled: 'true',
    },
    trading_venue_data: {
      name: '',
      venue_address: '',
      fee_bps: '',
      enabled: 'true',
    },
    admin_data: {
      new_admin: '',
    },
    symbol_data: {
      symbol: '',
    },
    generic_data: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name.includes('.')) {
      const [section, field] = name.split('.')
      setForm(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev] as any,
          [field]: value
        }
      }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      proposal_type: 'UpdateConfig',
      arbitrage_config_data: {
        enabled: 'true',
        min_profit_bps: '',
        max_trade_size: '',
        slippage_tolerance_bps: '',
        max_gas_price: '',
        min_liquidity: '',
      },
      trading_pair_data: {
        base_asset_symbol: '',
        quote_asset_symbol: '',
        base_asset_address: '',
        quote_asset_address: '',
        target_peg: '',
        max_spread_bps: '',
        enabled: 'true',
      },
      trading_venue_data: {
        name: '',
        venue_address: '',
        fee_bps: '',
        enabled: 'true',
      },
      admin_data: {
        new_admin: '',
      },
      symbol_data: {
        symbol: '',
      },
      generic_data: '',
    })
    setError(null)
    setSuccess(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address || !walletKit) {
      setError('Please connect your wallet first')
      return
    }
  
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required')
      return
    }
  
    setCreating(true)
    setError(null)
    setSuccess(null)
  
    try {
      console.log('🚀 Creating proposal with data:', form)
  
      const response = await fetch('/api/dao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_proposal',
       
          proposer: address,
          proposal_type: form.proposal_type,
          title: form.title.trim(),
          description: form.description.trim(),
          proposal_data: getStructuredProposalData(form.proposal_type, form)
        }),
      })
  
      const result = await response.json()
      console.log('📋 API Response:', result)
  
      if (!result.success) {
        setError(result.error || 'Failed to prepare proposal transaction')
        return
      }
  
    
      console.log('✍️ Signing transaction with wallet...')
      const signedXdr = await walletKit.signTransaction(result.data.transactionXdr)
      
    
      console.log('📤 Submitting signed transaction...')
      const submitResponse = await fetch('/api/dao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          signedXdr: signedXdr
        }),
      })
  
      const submitResult = await submitResponse.json()
      console.log('✅ Submit result:', submitResult)
  
      if (submitResult.success) {
        const successMessage = `Proposal "${form.title}" created successfully!`
        setSuccess(successMessage)
        showMessage(successMessage)
        resetForm()
        if (onProposalCreated) {
          onProposalCreated()
        }
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(submitResult.error || 'Failed to submit proposal transaction')
      }
  
    } catch (err) {
      console.error('Create proposal error:', err)
      if (err instanceof Error && err.message.includes('stake')) {
        setError('You need to stake KALE tokens before creating proposals')
        onRequireStake()
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create proposal')
      }
    } finally {
      setCreating(false)
    }
  }
  
  // ✅ Add the getStructuredProposalData function
  const getStructuredProposalData = (proposalType: string, formData: any) => {
    switch (proposalType) {
      case 'UpdateConfig':
        return {
          config_data: {
            enabled: formData.arbitrage_config_data.enabled === 'true',
            min_profit_bps: Number(formData.arbitrage_config_data.min_profit_bps) || 50,
            max_trade_size: formData.arbitrage_config_data.max_trade_size || '1000000000000',
            slippage_tolerance_bps: Number(formData.arbitrage_config_data.slippage_tolerance_bps) || 100,
            max_gas_price: formData.arbitrage_config_data.max_gas_price || '2000',
            min_liquidity: formData.arbitrage_config_data.min_liquidity || '1000000000',
          }
        }
      
      case 'AddTradingPair':
        return {
          pair_data: {
            base_asset_address: formData.trading_pair_data.base_asset_address,
            quote_asset_address: formData.trading_pair_data.quote_asset_address,
            base_asset_symbol: formData.trading_pair_data.base_asset_symbol,
            quote_asset_symbol: formData.trading_pair_data.quote_asset_symbol,
            target_peg: formData.trading_pair_data.target_peg || '10000',
            deviation_threshold_bps: Number(formData.trading_pair_data.max_spread_bps) || 50,
            enabled: formData.trading_pair_data.enabled === 'true',
          }
        }
      
      case 'AddTradingVenue':
        return {
          venue_data: {
            name: formData.trading_venue_data.name,
            address: formData.trading_venue_data.venue_address,
            fee_bps: Number(formData.trading_venue_data.fee_bps) || 30,
            enabled: formData.trading_venue_data.enabled === 'true',
            liquidity_threshold: '1000000000',
          }
        }
      
      case 'PausePair':
        return {
          symbol_data: formData.symbol_data.symbol
        }
      
      case 'TransferAdmin':
        return {
          admin_address: formData.admin_data.new_admin
        }
      
      case 'UpdateRiskManager':
      case 'EmergencyStop':
      default:
        return {}
    }
  }

  const renderProposalDataFields = () => {
    switch (form.proposal_type) {
      case 'UpdateConfig':
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Arbitrage Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Status</label>
                <div className="relative">
                  <select
                    name="arbitrage_config_data.enabled"
                    value={form.arbitrage_config_data.enabled}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white transition-all duration-300 outline-none font-raleway appearance-none cursor-pointer"
                  >
                    <option value="true" className="bg-black/90 text-white">Enabled</option>
                    <option value="false" className="bg-black/90 text-white">Disabled</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Min Profit (BPS)</label>
                <input
                  type="number"
                  name="arbitrage_config_data.min_profit_bps"
                  value={form.arbitrage_config_data.min_profit_bps}
                  onChange={handleInputChange}
                  placeholder="e.g., 50"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Max Trade Size</label>
                <input
                  type="text"
                  name="arbitrage_config_data.max_trade_size"
                  value={form.arbitrage_config_data.max_trade_size}
                  onChange={handleInputChange}
                  placeholder="e.g., 1000000000000"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Slippage Tolerance (BPS)</label>
                <input
                  type="number"
                  name="arbitrage_config_data.slippage_tolerance_bps"
                  value={form.arbitrage_config_data.slippage_tolerance_bps}
                  onChange={handleInputChange}
                  placeholder="e.g., 100"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Max Gas Price</label>
                <input
                  type="text"
                  name="arbitrage_config_data.max_gas_price"
                  value={form.arbitrage_config_data.max_gas_price}
                  onChange={handleInputChange}
                  placeholder="e.g., 2000"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Min Liquidity</label>
                <input
                  type="text"
                  name="arbitrage_config_data.min_liquidity"
                  value={form.arbitrage_config_data.min_liquidity}
                  onChange={handleInputChange}
                  placeholder="e.g., 1000000000"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
            </div>
          </div>
        )

      case 'AddTradingPair':
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Trading Pair Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Base Asset Symbol</label>
                <input
                  type="text"
                  name="trading_pair_data.base_asset_symbol"
                  value={form.trading_pair_data.base_asset_symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., USDC"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Quote Asset Symbol</label>
                <input
                  type="text"
                  name="trading_pair_data.quote_asset_symbol"
                  value={form.trading_pair_data.quote_asset_symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., EURC"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Base Asset Address</label>
                <input
                  type="text"
                  name="trading_pair_data.base_asset_address"
                  value={form.trading_pair_data.base_asset_address}
                  onChange={handleInputChange}
                  placeholder="Contract address"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Quote Asset Address</label>
                <input
                  type="text"
                  name="trading_pair_data.quote_asset_address"
                  value={form.trading_pair_data.quote_asset_address}
                  onChange={handleInputChange}
                  placeholder="Contract address"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
            </div>
          </div>
        )

      case 'AddTradingVenue':
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Trading Venue Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Venue Name</label>
                <input
                  type="text"
                  name="trading_venue_data.name"
                  value={form.trading_venue_data.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Stellar DEX"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Venue Address</label>
                <input
                  type="text"
                  name="trading_venue_data.venue_address"
                  value={form.trading_venue_data.venue_address}
                  onChange={handleInputChange}
                  placeholder="Contract address of the venue"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Fee (BPS)</label>
                <input
                  type="number"
                  name="trading_venue_data.fee_bps"
                  value={form.trading_venue_data.fee_bps}
                  onChange={handleInputChange}
                  placeholder="e.g., 30 (0.3%)"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Status</label>
                <div className="relative">
                  <select
                    name="trading_venue_data.enabled"
                    value={form.trading_venue_data.enabled}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white transition-all duration-300 outline-none font-raleway appearance-none cursor-pointer"
                  >
                    <option value="true" className="bg-black/90 text-white">Enabled</option>
                    <option value="false" className="bg-black/90 text-white">Disabled</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'PausePair':
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Pause Trading Pair</h4>
            <div>
              <label className="block text-white/70 text-sm mb-3 font-raleway">Stablecoin Symbol to Pause</label>
              <input
                type="text"
                name="symbol_data.symbol"
                value={form.symbol_data.symbol}
                onChange={handleInputChange}
                placeholder="e.g., USDC or EURC"
                className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
              />
              <p className="text-white/50 text-xs mt-2 font-raleway">This will pause all trading activities for the specified stablecoin pair.</p>
            </div>
          </div>
        )

      case 'UpdateRiskManager':
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Risk Manager Update</h4>
            <div>
              <label className="block text-white/70 text-sm mb-3 font-raleway">New Risk Manager Address</label>
              <input
                type="text"
                name="admin_data.new_admin"
                value={form.admin_data.new_admin}
                onChange={handleInputChange}
                placeholder="New risk manager contract address"
                className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
              />
              <p className="text-white/50 text-xs mt-2 font-raleway">This will update the risk management system with new parameters and controls.</p>
            </div>
          </div>
        )

      case 'EmergencyStop':
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Emergency Stop</h4>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h5 className="text-red-400 font-medium font-raleway">⚠️ Warning: Emergency Action</h5>
              </div>
              <p className="text-red-300/90 text-sm font-raleway leading-relaxed">
                This proposal will immediately halt all arbitrage bot operations across all trading pairs and venues. 
                This is an emergency measure that should only be used in critical situations such as:
              </p>
              <ul className="text-red-300/80 text-sm mt-3 space-y-1 font-raleway">
                <li>• Market manipulation detected</li>
                <li>• Critical security vulnerability discovered</li>
                <li>• System malfunction causing significant losses</li>
              </ul>
              <p className="text-red-300/70 text-xs mt-4 font-raleway">
                Once executed, manual intervention will be required to restart operations.
              </p>
            </div>
          </div>
        )
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Admin Transfer</h4>
            <div>
              <label className="block text-white/70 text-sm mb-3 font-raleway">New Admin Address</label>
              <input
                type="text"
                name="admin_data.new_admin"
                value={form.admin_data.new_admin}
                onChange={handleInputChange}
                placeholder="New admin address"
                className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-6">
            <h4 className="text-white/90 font-medium font-raleway text-lg border-b border-white/10 pb-3">Generic Data</h4>
            <div>
              <label className="block text-white/70 text-sm mb-3 font-raleway">Additional Data</label>
              <textarea
                name="generic_data"
                value={form.generic_data}
                onChange={handleInputChange}
                placeholder="Enter any additional data for this proposal type"
                rows={3}
                className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none transition-all duration-300 outline-none font-raleway"
              />
            </div>
          </div>
        )
    }
  }

  // Don't render if modal is not open
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto faq-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 top-0 bg-black/80 backdrop-blur-lg sticky z-50">
          <h2 className="text-white/90 text-xl font-medium font-raleway">Create Proposal</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white/90 transition-all duration-300 p-2 hover:bg-white/5 rounded-xl"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-emerald-400 font-raleway">{success}</div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-red-400 font-raleway">{error}</div>
            </div>
          )}

          {/* Proposal Creation Form */}
          <form onSubmit={handleCreate} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Brief title for your proposal"
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 transition-all duration-300 outline-none font-raleway"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Detailed description of your proposal"
                  rows={4}
                  className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none transition-all duration-300 outline-none font-raleway"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-3 font-raleway">Proposal Type</label>
                <div className="relative">
                  <select
                    name="proposal_type"
                    value={form.proposal_type}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white transition-all duration-300 outline-none font-raleway appearance-none cursor-pointer"
                  >
                    <option value="UpdateConfig" className="bg-black/90 text-white">Update Configuration</option>
                    <option value="AddTradingPair" className="bg-black/90 text-white">Add Trading Pair</option>
                    <option value="AddTradingVenue" className="bg-black/90 text-white">Add Trading Venue</option>
                    <option value="PausePair" className="bg-black/90 text-white">Pause Trading Pair</option>
                    <option value="UpdateRiskManager" className="bg-black/90 text-white">Update Risk Manager</option>
                    <option value="EmergencyStop" className="bg-black/90 text-white">Emergency Stop</option>
                    <option value="TransferAdmin" className="bg-black/90 text-white">Transfer Admin</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Proposal-Specific Data */}
            {renderProposalDataFields()}

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white/90 px-6 py-3 rounded-xl font-medium transition-all duration-300 font-raleway"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-black/30 hover:bg-black/50 disabled:bg-black/10 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20 hover:border-white/30 disabled:border-white/10 text-white/90 disabled:text-white/50 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 font-raleway"
              >
                {creating ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProposalCreationForm
