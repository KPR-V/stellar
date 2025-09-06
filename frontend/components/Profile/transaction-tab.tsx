// components/profile/transaction-tab.tsx
import React, { useState, useEffect } from 'react'
import { Receipt, Filter, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'

interface TradeExecution {
  executed_amount: string
  actual_profit: string
  gas_cost: string
  execution_timestamp: string
  status: string
  opportunity: {
    pair: {
      stablecoin_symbol: string
      fiat_symbol: string
      stablecoin_address: string
    }
    stablecoin_price: string
    fiat_rate: string
    deviation_bps: number
    estimated_profit: string
    trade_direction: string
    timestamp: string
  }
}

interface TransactionTabProps {
  isActive: boolean
}

const TransactionTab: React.FC<TransactionTabProps> = ({ isActive }) => {
  const { address } = useWallet()
  const [trades, setTrades] = useState<TradeExecution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')

  // ✅ Fetch trades only when tab becomes active
  useEffect(() => {
    if (isActive && address) {
      fetchTradeHistory()
    }
  }, [isActive, address])

  const fetchTradeHistory = async () => {
    if (!address) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_trade_history',
          userAddress: address,
          limit: 50
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setTrades(data.data.trades || [])
      } else {
        setError(data.error || 'Failed to fetch transaction history')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error fetching trade history:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000) // Convert from seconds to milliseconds
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatAmount = (amount: string, decimals: number = 7) => {
    const num = parseFloat(amount) / Math.pow(10, decimals)
    return num.toFixed(4)
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-green-400 bg-green-400/10'
      case 'failed':
        return 'text-red-400 bg-red-400/10'
      default:
        return 'text-yellow-400 bg-yellow-400/10'
    }
  }

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true
    if (filter === 'success') return trade.status.toLowerCase() === 'success'
    if (filter === 'failed') return trade.status.toLowerCase() === 'failed'
    return true
  })

  return (
    <div className="p-6 space-y-6 font-raleway">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white/90 text-lg font-raleway">
          Trade History
          {trades.length > 0 && (
            <span className="ml-2 text-white/50 text-sm">({trades.length} total)</span>
          )}
        </h3>
        
        <div className="flex gap-2">
          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'success' | 'failed')}
            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white/70 hover:text-white/90 transition-all duration-300 hover:border-white/20 text-xs"
          >
            <option value="all">All Trades</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>
          
          <button 
            onClick={fetchTradeHistory}
            disabled={isLoading}
            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white/70 hover:text-white/90 transition-all duration-300 hover:border-white/20 text-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Filter className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
          <div className="text-white/50 text-sm font-medium">Loading Trades...</div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-5 border border-red-500/30">
          <h4 className="text-red-400 text-sm font-medium mb-2">Error Loading Trades</h4>
          <p className="text-red-300/80 text-xs mb-3">{error}</p>
          <button 
            onClick={fetchTradeHistory}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTrades.length === 0 && (
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
          <Receipt className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <div className="text-white/50 text-sm font-medium">No Trades to display</div>
          <p className="text-white/30 text-xs mt-2">
            {trades.length === 0 
              ? 'Your Trade history will appear here'
              : 'No Trades match your current filter'
            }
          </p>
        </div>
      )}

      {/* Trade List */}
      {!isLoading && !error && filteredTrades.length > 0 && (
        <div className="space-y-3">
          {filteredTrades.map((trade, index) => (
            <div key={index} className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {trade.opportunity.trade_direction === 'BUY' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <p className="text-white/80 text-sm font-medium">
                      {trade.opportunity.trade_direction} {trade.opportunity.pair.stablecoin_symbol}
                    </p>
                  </div>
                  <p className="text-white/40 text-xs">
                    Trade Amount: {formatAmount(trade.executed_amount)} XLM
                  </p>
                  <p className="text-white/40 text-xs">
                    Deviation: {trade.opportunity.deviation_bps} bps
                  </p>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${parseFloat(trade.actual_profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(trade.actual_profit) >= 0 ? '+' : ''}{formatAmount(trade.actual_profit)} XLM
                  </div>
                  <p className="text-white/40 text-xs">
                    Gas: {formatAmount(trade.gas_cost)} XLM
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">
                  {formatTimestamp(trade.execution_timestamp)}
                </span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(trade.status)}
                  <span className={`px-2 py-1 rounded-full ${getStatusColor(trade.status)}`}>
                    {trade.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TransactionTab
