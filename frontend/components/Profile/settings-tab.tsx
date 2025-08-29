import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Eye, Edit3, Save, RotateCcw, Info } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'

interface ArbitrageConfig {
  enabled: boolean
  max_gas_price: string
  max_trade_size: string
  min_liquidity: string
  min_profit_bps: number
  slippage_tolerance_bps: number
}

const SettingsTab = () => {
  const { address, walletKit } = useWallet()
  const [settings, setSettings] = useState({
    autoRefresh: true,
    privacyMode: false
  })
  
  const [userConfig, setUserConfig] = useState<ArbitrageConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<ArbitrageConfig | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch user config when component mounts
  useEffect(() => {
    if (address) {
      fetchUserConfig()
    }
  }, [address])

 const fetchUserConfig = async () => {
  if (!address) return
  
  setIsLoading(true)
  setFetchError(null)
  try {
    const response = await fetch('/api/contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_user_config',
        userAddress: address,
      }),
    })

    const data = await response.json()
    if (data.success) {
      setUserConfig(data.data.config)
      setEditForm(data.data.config)
      console.log('user config fetched successfully')
    } else {
      if (data.error === 'USER_NOT_INITIALIZED') {
        setFetchError('USER_NOT_INITIALIZED')
      } else {
        setFetchError(data.error || 'Failed to fetch configuration')
      }
      console.error('Failed to fetch user config:', data.error)
    }
  } catch (error) {
    setFetchError('Network error occurred')
    console.error('Error fetching user config:', error)
  } finally {
    setIsLoading(false)
  }
}

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const startEditing = () => {
    setIsEditing(true)
    setEditForm(userConfig ? { ...userConfig } : null)
    setHasChanges(false)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm(userConfig ? { ...userConfig } : null)
    setHasChanges(false)
  }

  const resetForm = () => {
    if (userConfig) {
      setEditForm({ ...userConfig })
      setHasChanges(false)
    }
  }

const handleFormChange = (field: keyof ArbitrageConfig, value: any) => {
  if (!editForm || !userConfig) return
  
  const newForm = { ...editForm, [field]: value }
  setEditForm(newForm)
  
  // Check if there are changes
  const hasFormChanges = Object.keys(newForm).some(key => {
    const formKey = key as keyof ArbitrageConfig
    return newForm[formKey] !== userConfig[formKey]
  })
  setHasChanges(hasFormChanges)
}

const handleNumericStringChange = (field: keyof ArbitrageConfig, value: string) => {
  // Remove any non-numeric characters except for leading digits
  const cleanValue = value.replace(/[^\d]/g, '');
  
  // Ensure minimum value
  const finalValue = cleanValue === '' ? '0' : cleanValue;
  
  handleFormChange(field, finalValue);
};


  const handleUpdate = async () => {
    if (!editForm || !address) {
      console.error('No form data or address available')
      return
    }

    // ✅ Check if walletKit is available
    if (!walletKit) {
      console.error('Wallet not connected')
      // You might want to show a user-friendly message here
      return
    }

    setIsUpdating(true)

    try {
      // Step 1: Get transaction XDR from server
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user_config',
          userAddress: address,
          newConfig: editForm,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // ✅ Step 2: Sign transaction with wallet using walletKit from hook
        const { signedTxXdr } = await walletKit.signTransaction(data.data.transactionXdr, {
          address: address,
          networkPassphrase: 'Test SDF Network ; September 2015',
        });

        // Step 3: Submit signed transaction
        await submitSignedTransaction(signedTxXdr);
        
        // Step 4: Update local state and exit edit mode
        setUserConfig(editForm)
        setIsEditing(false)
        setHasChanges(false)
        
        console.log('Configuration updated successfully!')
        
      } else {
        throw new Error(data.error || 'Failed to prepare update transaction')
      }
    } catch (error) {
      console.error('Error updating config:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsUpdating(false)
    }
  }

   const submitSignedTransaction = async (signedXdr: string) => {
    const response = await fetch('/api/contract/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedXdr }),
    })

    if (!response.ok) {
      throw new Error('Failed to submit transaction')
    }

    return response.json()
  }

  const configInfo = {
    enabled: "Controls whether automated trading is active for your account. When disabled, no trades will be executed.",
    min_profit_bps: "Minimum profit required before executing a trade (in basis points). 100 bps = 1%. Higher values mean more selective trading.",
    max_trade_size: "Maximum amount that can be traded in a single transaction (in stroops). Helps manage risk exposure.",
    slippage_tolerance_bps: "Maximum acceptable price movement during trade execution (in basis points). Higher values allow trades in more volatile conditions.",
    max_gas_price: "Maximum fee willing to pay for transaction execution (in stroops). Higher values ensure faster execution during network congestion.",
    min_liquidity: "Minimum liquidity required in a market before considering it for trading (in stroops). Ensures trades can be executed efficiently."
  }

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <div
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 ${
        enabled 
          ? 'bg-blue-500/60 hover:bg-blue-500/70' 
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-lg ${
          enabled ? 'right-0.5' : 'left-0.5'
        } ${enabled ? '' : 'bg-white/70'}`}
      />
    </div>
  )

  return (
    <div className="p-6 space-y-6 font-raleway">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white/90 text-lg font-raleway">Settings</h3>
        {isLoading && (
          <div className="text-white/60 text-sm">Loading config...</div>
        )}
      </div>

      {/* Display User Configuration from Contract */}
      {userConfig && !isEditing && (
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/25 mb-6 relative">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-white/80 text-sm font-medium">Current Trading Configuration</h4>
            <button
              onClick={startEditing}
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
            >
              <Edit3 size={12} />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-white/50">Trading Enabled:</span>
              <span className={`ml-2 ${userConfig.enabled ? 'text-green-400' : 'text-red-400'}`}>
                {userConfig.enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-white/50">Min Profit (bps):</span>
              <span className="text-white/70 ml-2">{userConfig.min_profit_bps}</span>
            </div>
            <div>
              <span className="text-white/50">Max Trade Size:</span>
              <span className="text-white/70 ml-2">{userConfig.max_trade_size?.toString()}</span>
            </div>
            <div>
              <span className="text-white/50">Slippage Tolerance (bps):</span>
              <span className="text-white/70 ml-2">{userConfig.slippage_tolerance_bps}</span>
            </div>
            <div>
              <span className="text-white/50">Max Gas Price:</span>
              <span className="text-white/70 ml-2">{userConfig.max_gas_price?.toString()}</span>
            </div>
            <div>
              <span className="text-white/50">Min Liquidity:</span>
              <span className="text-white/70 ml-2">{userConfig.min_liquidity?.toString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {userConfig && isEditing && editForm && (
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/25 mb-6 relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white/80 text-sm font-medium">Edit Trading Configuration</h4>
            <div className="flex gap-2">
              {hasChanges && (
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
              <button
                onClick={cancelEditing}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Trading Enabled Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs font-medium">Trading Enabled</label>
                <div className="group relative">
                  <Info size={12} className="text-white/40 hover:text-white/60 cursor-help" />
                  <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
                    {configInfo.enabled}
                  </div>
                </div>
              </div>
              <ToggleSwitch 
                enabled={editForm.enabled} 
                onChange={() => handleFormChange('enabled', !editForm.enabled)}
              />
            </div>

            {/* Min Profit BPS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs font-medium">Min Profit (basis points)</label>
                <div className="group relative">
                  <Info size={12} className="text-white/40 hover:text-white/60 cursor-help" />
                  <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
                    {configInfo.min_profit_bps}
                  </div>
                </div>
              </div>
              <input
    type="number"
    value={editForm.min_profit_bps}
    onChange={(e) => handleFormChange('min_profit_bps', parseInt(e.target.value) || 0)} // ✅ Keep as number
    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:border-blue-400/50 focus:outline-none transition-all duration-300"
    placeholder="100"
  />
            </div>

            {/* Max Trade Size */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs font-medium">Max Trade Size (stroops)</label>
                <div className="group relative">
                  <Info size={12} className="text-white/40 hover:text-white/60 cursor-help" />
                  <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
                    {configInfo.max_trade_size}
                  </div>
                </div>
              </div>
             <input
    type="text"
    value={editForm.max_trade_size.toString()}
    onChange={(e) => handleNumericStringChange('max_trade_size', e.target.value)} // ✅ Keep as string
    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:border-blue-400/50 focus:outline-none transition-all duration-300"
    placeholder="1000000000"
  />
            </div>

            {/* Slippage Tolerance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs font-medium">Slippage Tolerance (basis points)</label>
                <div className="group relative">
                  <Info size={12} className="text-white/40 hover:text-white/60 cursor-help" />
                  <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
                    {configInfo.slippage_tolerance_bps}
                  </div>
                </div>
              </div>
              <input
    type="number"
    value={editForm.slippage_tolerance_bps}
    onChange={(e) => handleFormChange('slippage_tolerance_bps', parseInt(e.target.value) || 0)} // ✅ Keep as number
    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:border-blue-400/50 focus:outline-none transition-all duration-300"
    placeholder="100"
  />
            </div>

            {/* Max Gas Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs font-medium">Max Gas Price (stroops)</label>
                <div className="group relative">
                  <Info size={12} className="text-white/40 hover:text-white/60 cursor-help" />
                  <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
                    {configInfo.max_gas_price}
                  </div>
                </div>
              </div>
               <input
    type="text"
    value={editForm.max_gas_price.toString()}
    onChange={(e) => handleNumericStringChange('max_gas_price', e.target.value)} // ✅ Keep as string
    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:border-blue-400/50 focus:outline-none transition-all duration-300"
    placeholder="100000"
  />
            </div>

            {/* Min Liquidity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs font-medium">Min Liquidity (stroops)</label>
                <div className="group relative">
                  <Info size={12} className="text-white/40 hover:text-white/60 cursor-help" />
                  <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
                    {configInfo.min_liquidity}
                  </div>
                </div>
              </div>
              <input
    type="text"
    value={editForm.min_liquidity.toString()}
    onChange={(e) => handleNumericStringChange('min_liquidity', e.target.value)} // ✅ Keep as string
    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:border-blue-400/50 focus:outline-none transition-all duration-300"
    placeholder="100000000"
  />
            </div>
          </div>

          {/* Action Buttons */}
          {userConfig && isEditing && editForm && (
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleUpdate}
            disabled={isUpdating || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              isUpdating || !hasChanges
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
            }`}
          >
            <Save size={14} />
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        </div>
      )}
        </div>
      )}
      
      {/* Error State - Only show if there's an actual error */}
      {fetchError && fetchError !== 'USER_NOT_INITIALIZED' && (
        <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-5 border border-red-500/30 mb-6">
          <h4 className="text-red-400 text-sm font-medium mb-2">Error Loading Configuration</h4>
          <p className="text-red-300/80 text-xs mb-3">
            {fetchError}
          </p>
          <button 
            onClick={fetchUserConfig}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Account Not Initialized - Only show for this specific error */}
      {fetchError === 'USER_NOT_INITIALIZED' && (
        <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-5 border border-yellow-500/30 mb-6">
          <h4 className="text-yellow-400 text-sm font-medium mb-2">Account Not Initialized</h4>
          <p className="text-yellow-300/80 text-xs mb-3">
            Your account needs to be initialized before viewing configuration.
          </p>
          <button 
            onClick={() => {/* trigger initialization */}}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          >
            Initialize Account
          </button>
        </div>
      )}
      
      {/* UI Settings Section */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-white/5 space-y-4">
        <h4 className="text-white/80 text-sm font-medium mb-4">Interface Settings</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-white/50" />
              <div>
                <p className="text-white/70 text-sm">Auto Refresh</p>
                <p className="text-white/40 text-xs">Automatically update data every 30 seconds</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.autoRefresh} 
              onChange={() => toggleSetting('autoRefresh')} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-white/50" />
              <div>
                <p className="text-white/70 text-sm">Privacy Mode</p>
                <p className="text-white/40 text-xs">Hide sensitive information</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.privacyMode} 
              onChange={() => toggleSetting('privacyMode')} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab