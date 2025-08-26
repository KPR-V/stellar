"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import { useCryptoChart } from "@/hooks/useCryptoChart"

interface CryptoChartProps {
  coinId: string
  coinName: string
  coinSymbol: string
  currentPrice: number
  priceChangePercentage: number
}

const chartConfig = {
  price: {
    label: "Price",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export default function CryptoChart({ 
  coinId, 
  coinName, 
  coinSymbol, 
  currentPrice, 
  priceChangePercentage 
}: CryptoChartProps) {
  const [timeRange, setTimeRange] = useState("7")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { chartData, loading, initialLoading, error, refetch, loadMoreData } = useCryptoChart()
  const [hasPreloaded, setHasPreloaded] = useState(false)

  useEffect(() => {
    if (coinId && !hasPreloaded) {
      refetch(coinId, "7") // Start with 7 days for fast initial load
      setHasPreloaded(true)
    }
  }, [coinId, refetch, hasPreloaded])

  // Update last updated timestamp when data changes
  useEffect(() => {
    if (chartData.length > 0) {
      setLastUpdated(new Date())
    }
  }, [chartData])

  // Handle time range changes with progressive loading
  const handleTimeRangeChange = useCallback(async (newRange: string) => {
    setTimeRange(newRange)
    
    if (coinId) {
      // If it's a larger timeframe, load it progressively
      if (parseInt(newRange) > 7) {
        loadMoreData(coinId, newRange)
      } else {
        refetch(coinId, newRange)
      }
    }
  }, [coinId, loadMoreData, refetch])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const priceChange = {
    value: `${priceChangePercentage >= 0 ? '+' : ''}${priceChangePercentage.toFixed(2)}%`,
    isPositive: priceChangePercentage >= 0,
    color: priceChangePercentage >= 0 ? 'text-green-400' : 'text-red-400'
  }

  const timeRangeOptions = [
    { value: "1h", label: "1H" },
    { value: "1", label: "1D" },
    { value: "7", label: "7D" },
    { value: "30", label: "30D" },
    { value: "90", label: "90D" }
  ]

  if (error) {
    return (
      <div className="bg-black/20 border border-white/10 rounded-xl p-6">
        <div className="text-white/70 text-center">
          <p className="text-red-400 mb-2">Failed to load chart data</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => refetch(coinId, timeRange)}
            className="mt-3 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black/20 border border-white/10 rounded-xl backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h3 className="text-white/90 text-lg font-semibold mb-1">
            {coinName} Price Chart
          </h3>
          <div className="flex items-center space-x-3">
            <span className="text-white text-2xl font-bold">
              {formatPrice(currentPrice)}
            </span>
            <div className={`flex items-center space-x-1 ${priceChange.color}`}>
              {priceChange.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-medium">{priceChange.value}</span>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-white/40 text-xs mt-1 flex items-center space-x-2">
              <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              {loading && (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-3 w-3 border border-white/20 border-t-white/60"></div>
                  <span className="text-white/60 text-xs">Loading...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex bg-black/30 rounded-lg p-1 border border-white/10">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeRangeChange(option.value)}
              disabled={loading}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === option.value
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/10'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
              {loading && timeRange === option.value && (
                <span className="ml-1 inline-block w-2 h-2 bg-current rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        {initialLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white/60"></div>
              <div className="text-white/60">Loading chart data...</div>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-white/60">No chart data available</div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 20,
                left: 20,
                bottom: 20,
              }}
            >
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={priceChange.isPositive ? "#10b981" : "#ef4444"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={priceChange.isPositive ? "#10b981" : "#ef4444"}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  tickFormatter={formatDate}
                />
                
                <YAxis
                  domain={['dataMin - dataMin * 0.01', 'dataMax + dataMax * 0.01']}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(value < 1 ? 4 : 0)}`}
                />
                
                <ChartTooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    
                    return (
                      <div className="bg-black/90 border border-white/20 backdrop-blur-lg rounded-lg p-3 shadow-xl">
                        <div className="text-white/80 text-sm font-medium mb-1">
                          {formatDate(label)}
                        </div>
                        <div className="text-white text-lg font-bold">
                          {formatPrice(payload[0].value as number)}
                        </div>
                      </div>
                    )
                  }}
                />
                
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={priceChange.isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ChartContainer>
        )}
      </div>
    </div>
  )
}
