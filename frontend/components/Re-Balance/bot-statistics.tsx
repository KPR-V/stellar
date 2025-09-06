'use client'
import React, { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {ChartConfig, ChartContainer, ChartTooltip} from "@/components/ui/chart"

interface ProfitDataPoint {
  date: string
  profit: number
  timestamp: number
}

interface BotStatisticsProps {
  className?: string
}

const chartConfig = {
  profit: {
    label: "Daily Profit",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const BotStatistics: React.FC<BotStatisticsProps> = ({ className = '' }) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [chartData, setChartData] = useState<ProfitDataPoint[]>([])
  const [dailyProfit, setDailyProfit] = useState<number>(0)
  const [dailyProfitPercentage, setDailyProfitPercentage] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousTotalProfitRef = useRef<number | null>(null)

  useEffect(() => {
    const savedChartData = localStorage.getItem('bot_profit_chart_data')
    if (savedChartData) {
      try {
        const parsedData = JSON.parse(savedChartData)
        setChartData(parsedData)
      } catch (err) {
        console.error('BotStatistics: Error parsing saved chart data:', err)
      }
    }

    const savedPreviousProfit = localStorage.getItem('bot_previous_total_profit')
    if (savedPreviousProfit) {
      previousTotalProfitRef.current = parseFloat(savedPreviousProfit)
    }

    const savedDailyProfit = localStorage.getItem('bot_daily_profit')
    if (savedDailyProfit) {
      const parsedProfit = JSON.parse(savedDailyProfit)
      setDailyProfit(parsedProfit.profit)
      setDailyProfitPercentage(parsedProfit.percentage)
    }
    fetchBotPerformanceMetrics()
    intervalRef.current = setInterval(() => {
      console.log('BotStatistics: Daily interval triggered')
      fetchBotPerformanceMetrics()
    }, 86400000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        console.log('BotStatistics: Cleared daily interval')
      }
    }
  }, [])

  const fetchBotPerformanceMetrics = async () => {
    setIsLoadingMetrics(true)
    setError(null)
    
    try {      
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_performance_metrics',
          days: 30
        }),
      })

      const data = await response.json()
      
      if (data.success && data.data.metrics) {
        setPerformanceMetrics(data.data.metrics)
        calculateDailyProfit(data.data.metrics)
        setLastUpdated(new Date())
      } else {
        console.error('BotStatistics: Failed to fetch bot performance metrics:', data.error)
        setError(data.error || 'Failed to fetch bot performance')
        setPerformanceMetrics({
          total_trades: 0,
          successful_trades: 0,
          total_profit: '0',
          total_volume: '0',
          success_rate: '0.00',
          win_rate: '0.00',
          avg_profit_per_trade: '0',
          period_days: 30
        })
      }
    } catch (err) {
      console.error('BotStatistics: Error fetching bot performance metrics:', err)
      setError('Network error occurred')
      setPerformanceMetrics({
        total_trades: 0,
        successful_trades: 0,
        total_profit: '0',
        total_volume: '0',
        success_rate: '0.00',
        win_rate: '0.00',
        avg_profit_per_trade: '0',
        period_days: 30
      })
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  const calculateDailyProfit = (metrics: any) => {
    const currentTotalProfit = parseFloat(metrics.total_profit || '0') / 1e7
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    let calculatedDailyProfit = 0
    let calculatedPercentage = 0

    if (previousTotalProfitRef.current !== null) {
      calculatedDailyProfit = currentTotalProfit - previousTotalProfitRef.current
      const totalVolume = parseFloat(metrics.total_volume || '0') / 1e7
      if (totalVolume > 0 && Math.abs(calculatedDailyProfit) > 0.01) {
        calculatedPercentage = (calculatedDailyProfit / totalVolume) * 100
      }
      setDailyProfit(calculatedDailyProfit)
      setDailyProfitPercentage(calculatedPercentage)

      const profitData = {
        profit: calculatedDailyProfit,
        percentage: calculatedPercentage,
        timestamp: Date.now()
      }
      localStorage.setItem('bot_daily_profit', JSON.stringify(profitData))

      updateChartData(todayString, calculatedDailyProfit)
    }

    previousTotalProfitRef.current = currentTotalProfit
    localStorage.setItem('bot_previous_total_profit', currentTotalProfit.toString())
  }

  const updateChartData = (dateString: string, profitValue: number) => {
    setChartData(prevData => {
      const existingIndex = prevData.findIndex(point => point.date === dateString)
      const newDataPoint: ProfitDataPoint = {
        date: dateString,
        profit: parseFloat(profitValue.toFixed(4)),
        timestamp: new Date().getTime()
      }

      let newData: ProfitDataPoint[]
      if (existingIndex >= 0) {
        newData = [...prevData]
        newData[existingIndex] = newDataPoint
      } else {
        newData = [...prevData, newDataPoint]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-30)
      }

      localStorage.setItem('bot_profit_chart_data', JSON.stringify(newData))      
      return newData
    })
  }

  const formatProfit = (profit: number) => {
    const absProfit = Math.abs(profit)
    if (absProfit < 0.01) {
      return `$${profit.toFixed(4)}`
    }
    return `$${profit.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const totalChartProfit = chartData.reduce((sum, point) => sum + point.profit, 0)
  const isChartPositive = totalChartProfit >= 0

  if (error) {
    return (
      <div className={`bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300 ${className}`}>
        <div className="text-center py-8">
          <div className="text-white/70 text-sm mb-2">Failed to load bot statistics</div>
          <div className="text-white/50 text-xs mb-4">{error}</div>
          <button 
            onClick={fetchBotPerformanceMetrics}
            className="mt-4 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white/80 text-lg">CalibreX Performance</h3>
        <div className="flex items-center gap-2 text-xs text-white/50">
          {isLoadingMetrics && (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </>
          )}
          {lastUpdated && !isLoadingMetrics && (
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15 hover:border-white/25 transition-all duration-300">
          <h4 className="text-white/80 text-sm font-medium mb-2">Platform Total Profit</h4>
          <p className="text-3xl font-bold text-white/95 font-raleway">
            {performanceMetrics ? `$${(parseFloat(performanceMetrics.total_profit) / 1e7).toFixed(2)}` : '$0.00'}
          </p>
          <p className={`text-xs mt-2 ${dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dailyProfit >= 0 ? '+' : ''}${dailyProfit.toFixed(2)} (24h)
          </p>
          
          <div className="mt-4">
            <div className="bg-black/20 border border-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white text-xs mb-1">Platform Daily Profit Trend</div>
              </div>
              <div className="h-[130px]">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-white/40 text-xs text-center">
                      <div>No Platform trading data available</div>
                      <div className="text-white/30 mt-1">Platform will start generating data soon</div>
                    </div>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart
                      data={chartData}
                      margin={{top: 5, right: 5, left: 5, bottom: 5}}
                    >
                      <defs>
                        <linearGradient id="botProfitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isChartPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={isChartPositive ? "#10b981" : "#ef4444"} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.1)" vertical={false} />

                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickFormatter={formatDate} interval="preserveStartEnd" />

                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        tickFormatter={(value) => {
                          if (Math.abs(value) < 0.01) return '$0'
                          return `$${value.toFixed(1)}`
                        }}
                        width={35}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      
                      <ChartTooltip
                        cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null
                          const value = payload[0].value as number
                          return (
                            <div className="bg-black/90 border border-white/20 backdrop-blur-lg rounded-lg p-2 shadow-xl">
                              <div className="text-white/80 text-xs font-medium mb-1">
                                {formatDate(label)}
                              </div>
                              <div className={`text-sm font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                Bot Profit: {formatProfit(value)}
                              </div>
                            </div>
                          )
                        }}
                      />
                      
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke={isChartPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={1.5}
                        fill="url(#botProfitGradient)"
                        fillOpacity={1}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15 hover:border-white/25 transition-all duration-300">
          <h4 className="text-white/80 text-sm font-medium mb-4">Platform Performance Metrics</h4>
          
          {!performanceMetrics && !isLoadingMetrics ? (
            <div className="text-center py-8">
              <div className="text-white/60 text-sm mb-1">No Platform trading data available</div>
              <div className="text-white/40 text-xs">Platform hasn't executed any trades yet</div>
            </div>
          ) : performanceMetrics ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Total Trades</div>
                <div className="text-white/90 text-lg font-semibold">
                  {performanceMetrics.total_trades || 0}
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Successful</div>
                <div className="text-green-400 text-lg font-semibold">
                  {performanceMetrics.successful_trades || 0}
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Success Rate</div>
                <div className="text-blue-400 text-lg font-semibold">
                  {performanceMetrics.success_rate || '0.00'}%
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Win Rate</div>
                <div className="text-purple-400 text-lg font-semibold">
                  {performanceMetrics.win_rate || '0.00'}%
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Total Volume</div>
                <div className="text-white/90 text-lg font-semibold">
                  ${(parseFloat(performanceMetrics.total_volume || '0') / 1e7).toFixed(2)}
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Avg Profit/Trade</div>
                <div className="text-yellow-400 text-lg font-semibold">
                  ${(parseFloat(performanceMetrics.avg_profit_per_trade || '0') / 1e7).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-black/20 rounded-lg p-3 border border-white/5">
                  <div className="animate-pulse">
                    <div className="h-3 bg-white/10 rounded mb-2"></div>
                    <div className="h-5 bg-white/10 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BotStatistics
