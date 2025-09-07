"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {ChartConfig,ChartContainer,ChartTooltip} from "@/components/ui/chart"

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
  const [userInitDate, setUserInitDate] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousProfitRef = useRef<number | null>(null)

  useEffect(() => {
    if (!userAddress) return

    const savedData = localStorage.getItem(`profit_chart_${userAddress}`)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setChartData(parsedData)
      } catch (err) {
        console.error('Error parsing saved profit data:', err)
      }
    }

    const savedPreviousProfit = localStorage.getItem(`previous_total_profit_${userAddress}`)
    if (savedPreviousProfit) {
      previousProfitRef.current = parseFloat(savedPreviousProfit)
    }

    // Get user initialization date
    const savedInitDate = localStorage.getItem(`user_init_date_${userAddress}`)
    if (savedInitDate) {
      setUserInitDate(savedInitDate)
    } else {
      // Fetch initialization date from API if not cached
      fetchUserInitDate()
    }
  }, [userAddress])

  const fetchUserInitDate = async () => {
    if (!userAddress) return
    
    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_user_initialized',
          userAddress: userAddress,
        }),
      })

      const data = await response.json()
      
      if (data.success && data.data.initialized) {
        // If we don't have the exact init date, use today as fallback
        // In a real implementation, you'd want to store the init date when user first initializes
        const initDate = new Date().toISOString().split('T')[0]
        setUserInitDate(initDate)
        localStorage.setItem(`user_init_date_${userAddress}`, initDate)
      }
    } catch (err) {
      console.error('Error fetching user init date:', err)
    }
  }

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
          days: 30
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        const currentTotalProfit = parseFloat(data.data.metrics.total_profit) / 1e7 // Convert from stroops
        const today = new Date()
        const todayString = today.toISOString().split('T')[0]
        let dailyProfit = 0
        if (previousProfitRef.current !== null) {
          dailyProfit = currentTotalProfit - previousProfitRef.current
        } else {
          dailyProfit = 0
        }

        previousProfitRef.current = currentTotalProfit
        localStorage.setItem(`previous_total_profit_${userAddress}`, currentTotalProfit.toString())

        const newDataPoint: ProfitDataPoint = {
          date: todayString,
          profit: parseFloat(dailyProfit.toFixed(4)),
          timestamp: today.getTime()
        }

        setChartData(prevData => {
          const existingTodayIndex = prevData.findIndex(point => point.date === todayString)
          
          let newData: ProfitDataPoint[]
          if (existingTodayIndex >= 0) {
            newData = [...prevData]
            newData[existingTodayIndex] = newDataPoint
          } else {
            newData = [...prevData, newDataPoint]
              .sort((a, b) => a.timestamp - b.timestamp)
          }

          // Only keep data from user initialization date onwards
          if (userInitDate) {
            const initTimestamp = new Date(userInitDate).getTime()
            newData = newData.filter(point => point.timestamp >= initTimestamp)
          }

          localStorage.setItem(`profit_chart_${userAddress}`, JSON.stringify(newData))
          return newData
        })

        setLastUpdated(new Date())
      } else {
        setError(data.error)
        console.error(data.error)
      }
    } catch (err) {
      setError('Network error occurred while fetching from smart contract')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userAddress) return
    fetchDailyProfit()
    intervalRef.current = setInterval(() => {
      fetchDailyProfit()
    }, 86400000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [userAddress, userInitDate])

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
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white text-xs mb-1">Daily Profit Trend</div>
        </div>
      </div>

      <div className="h-[130px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-white/40 text-xs text-center">
              <div>No trading data available</div>
              <div className="text-white/30 mt-1">Start trading to see daily profits</div>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              data={chartData}
              margin={{top: 5, right: 5, left: 5, bottom: 5}}
            >
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.05}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.1)" vertical={false}/>
              
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
