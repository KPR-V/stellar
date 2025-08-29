"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ProfitDataPoint {
  date: string
  profit: number
  timestamp: number
}

interface ProfitChartProps {
  userAddress: string
  className?: string
}

const chartConfig = {
  profit: {
    label: "Daily Profit",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export default function ProfitChart({ userAddress, className = "" }: ProfitChartProps) {
  const [chartData, setChartData] = useState<ProfitDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousProfitRef = useRef<number | null>(null)

  // Load hardcoded data from localStorage on component mount
  useEffect(() => {
    if (!userAddress) return

    const savedData = localStorage.getItem(`profit_chart_${userAddress}`)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setChartData(parsedData)
        console.log('Loaded profit chart data from localStorage:', parsedData)
      } catch (err) {
        console.error('Error parsing saved profit data:', err)
      }
    }

    // Load previous total profit for calculations
    const savedPreviousProfit = localStorage.getItem(`previous_total_profit_${userAddress}`)
    if (savedPreviousProfit) {
      previousProfitRef.current = parseFloat(savedPreviousProfit)
      console.log('Loaded previous total profit:', previousProfitRef.current)
    }
  }, [userAddress])

  // Function to fetch performance metrics and calculate daily profit
  // Logic: Call get_user_performance_metrics API every day, subtract previous day's total profit 
  // from current total profit to get daily profit, then hardcode this data for the chart
  const fetchDailyProfit = async () => {
    if (!userAddress) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_performance_metrics',
          userAddress: userAddress,
          days: 30 // Get 30 days of data
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        const currentTotalProfit = parseFloat(data.data.metrics.total_profit) / 1e7 // Convert from stroops
        const today = new Date()
        const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD format

        console.log('Current total profit from smart contract:', currentTotalProfit)
        console.log('Previous total profit stored:', previousProfitRef.current)

        // Calculate daily profit by subtracting previous day's total profit
        let dailyProfit = 0
        if (previousProfitRef.current !== null) {
          dailyProfit = currentTotalProfit - previousProfitRef.current
          console.log('Daily profit calculated:', dailyProfit)
        } else {
          // First time - no previous data, so daily profit is 0
          dailyProfit = 0
          console.log('First time fetching - setting daily profit to 0')
        }

        // Store current total profit for next day's calculation
        previousProfitRef.current = currentTotalProfit
        localStorage.setItem(`previous_total_profit_${userAddress}`, currentTotalProfit.toString())

        // Create new data point with calculated daily profit
        const newDataPoint: ProfitDataPoint = {
          date: todayString,
          profit: parseFloat(dailyProfit.toFixed(4)),
          timestamp: today.getTime()
        }

        // Hardcode this data into localStorage for the chart
        setChartData(prevData => {
          // Check if we already have data for today
          const existingTodayIndex = prevData.findIndex(point => point.date === todayString)
          
          let newData: ProfitDataPoint[]
          if (existingTodayIndex >= 0) {
            // Update existing data point for today
            newData = [...prevData]
            newData[existingTodayIndex] = newDataPoint
            console.log('Updated existing data point for today:', newDataPoint)
          } else {
            // Add new data point and keep only last 30 days
            newData = [...prevData, newDataPoint]
              .sort((a, b) => a.timestamp - b.timestamp)
              .slice(-30) // Keep only last 30 days
            console.log('Added new data point for today:', newDataPoint)
          }

          // Hardcode the calculated data in localStorage
          localStorage.setItem(`profit_chart_${userAddress}`, JSON.stringify(newData))
          console.log('Hardcoded profit chart data to localStorage:', newData)
          
          return newData
        })

        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch performance metrics from smart contract')
        console.error('❌ Failed to fetch performance metrics:', data.error)
      }
    } catch (err) {
      setError('Network error occurred while fetching from smart contract')
      console.error('❌ Error fetching performance metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Set up daily interval for fetching data from smart contract
  useEffect(() => {
    if (!userAddress) return

    // Fetch immediately when component mounts
    fetchDailyProfit()

    // Set up interval to call API every 1 day (24 hours = 86400000 ms)
    intervalRef.current = setInterval(() => {
      console.log('Daily interval triggered - fetching performance metrics from smart contract')
      fetchDailyProfit()
    }, 86400000) // 24 hours

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        console.log('Cleared daily profit fetch interval')
      }
    }
  }, [userAddress])

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

  const totalProfit = chartData.reduce((sum, point) => sum + point.profit, 0)
  const isPositive = totalProfit >= 0

  if (error) {
    return (
      <div className={`bg-black/20 border border-white/5 rounded-lg p-3 ${className}`}>
        <div className="text-center py-4">
          <p className="text-red-400 text-xs mb-1">Failed to load profit data from smart contract</p>
          <p className="text-white/40 text-xs mb-2">{error}</p>
          <button 
            onClick={fetchDailyProfit}
            className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-black/20 border border-white/5 rounded-lg p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white text-xs mb-1">Daily Profit Trend</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[130px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-white/40 text-xs text-center">
              <div className="text-white/30 mb-1">📊</div>
              <div>No trading data available</div>
              <div className="text-white/30 mt-1">Start trading to see daily profits</div>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              data={chartData}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? "#10b981" : "#ef4444"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? "#10b981" : "#ef4444"}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke="rgba(255,255,255,0.1)"
                vertical={false}
              />
              
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                tickFormatter={formatDate}
                interval="preserveStartEnd"
              />
              
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                tickFormatter={(value) => {
                  if (Math.abs(value) < 0.01) return '$0'
                  return `$${value.toFixed(1)}`
                }}
                width={35}
                domain={['dataMin - 1', 'dataMax + 1']} // Add padding to Y-axis
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
                        Daily Profit: {formatProfit(value)}
                      </div>
                    </div>
                  )
                }}
              />
              
              <Area
                type="monotone"
                dataKey="profit"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={1.5}
                fill="url(#profitGradient)"
                fillOpacity={1}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
