"use client"

import React from 'react'
import { LabelList, Pie, PieChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface BalanceData {
  balance: string
  usdValue: number
  price: number
}

interface PieChartProps {
  balancesWithPrices: {[key: string]: BalanceData}
  portfolioValue: string
  className?: string
}

interface ChartDataPoint {
  asset: string
  symbol: string
  value: number
  percentage: number
  fill: string
}

const PortfolioPieChart: React.FC<PieChartProps> = ({
  balancesWithPrices,
  portfolioValue,
  className = ''
}) => {
  // Enhanced token mapping with comprehensive list
  const getTokenInfo = (tokenAddress: string) => {
    const tokenMap: { [key: string]: { symbol: string, name: string } } = {
      // Native
      'native': { symbol: 'XLM', name: 'Stellar Lumens' },
      
      // Current active SAC addresses
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGCN6FM': { symbol: 'XLM', name: 'Stellar Lumens' },
      'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': { symbol: 'USDC', name: 'USD Coin' },
      'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ': { symbol: 'EURC', name: 'Euro Coin' },
      
      // Alternative SAC addresses
      'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2DA2KTP5PS': { symbol: 'USDC', name: 'USD Coin' },
      
      // Known testnet issuer addresses
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': { symbol: 'USDC', name: 'USD Coin' },
      'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': { symbol: 'EURC', name: 'Euro Coin' },
      
      // Mainnet common tokens
      'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA': { symbol: 'USDC', name: 'USD Coin (Mainnet)' },
      'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU': { symbol: 'USDC', name: 'USD Coin' }
    }
    
    const cleanAddress = tokenAddress.trim();
    
    if (tokenMap[cleanAddress]) {
      return tokenMap[cleanAddress];
    }
    
    for (const [key, value] of Object.entries(tokenMap)) {
      if (key.startsWith(cleanAddress.slice(0, 8)) || cleanAddress.startsWith(key.slice(0, 8))) {
        return value;
      }
    }
    
    return { 
      symbol: tokenAddress.slice(0, 8) + '...', 
      name: 'Unknown Token' 
    }
  }

  // Color palette for the chart
  const chartColors = [
    "var(--chart-1)", // Blue
    "var(--chart-2)", // Green  
    "var(--chart-3)", // Orange
    "var(--chart-4)", // Purple
    "var(--chart-5)", // Red
    "#10b981", // Emerald
    "#8b5cf6", // Violet
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#06b6d4", // Cyan
  ]

  // Transform balance data into chart data
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    const totalValue = parseFloat(portfolioValue.replace(/[,$]/g, '')) || 0
    
    if (totalValue === 0 || Object.keys(balancesWithPrices).length === 0) {
      return []
    }

    return Object.entries(balancesWithPrices)
      .filter(([_, data]) => data.usdValue > 0)
      .map(([tokenAddress, data], index) => {
        const tokenInfo = getTokenInfo(tokenAddress)
        const percentage = (data.usdValue / totalValue) * 100
        
        return {
          asset: tokenAddress,
          symbol: tokenInfo.symbol,
          value: data.usdValue,
          percentage: parseFloat(percentage.toFixed(2)),
          fill: chartColors[index % chartColors.length]
        }
      })
      .sort((a, b) => b.value - a.value) // Sort by value descending
  }, [balancesWithPrices, portfolioValue])

  // Create chart config dynamically
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: "Value",
      },
    }

    chartData.forEach((item, index) => {
      config[item.asset] = {
        label: item.symbol,
        color: chartColors[index % chartColors.length],
      }
    })

    return config
  }, [chartData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  if (chartData.length === 0) {
    return (
      <div className={`bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300 ${className}`}>
        <div className="text-white/50 text-sm text-center py-8">
          <div className="mb-2">📊</div>
          <div>No portfolio data available</div>
          <div className="text-xs text-white/40 mt-2">Connect your wallet and ensure you have assets</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 hover:border-white/8 transition-all duration-300 ${className}`}>
      <div className="p-4">
        <h3 className="text-white/80 text-sm font-medium mb-4">Portfolio Allocation</h3>
        
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px] [&_.recharts-text]:fill-white [&_.recharts-text]:text-[10px]"
        >
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null

                const data = payload[0].payload as ChartDataPoint
                return (
                  <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-xs">
                    <div className="text-white/90 font-medium mb-1">
                      {data.symbol}
                    </div>
                    <div className="text-white/70">
                      {formatCurrency(data.value)} ({data.percentage}%)
                    </div>
                  </div>
                )
              }}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="symbol"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
            >
              <LabelList
                dataKey="symbol"
                className="fill-white text-[10px] font-medium"
                stroke="none"
                fontSize={10}
                formatter={(value: string) => {
                  // Find the corresponding data point to check percentage
                  const dataPoint = chartData.find(item => item.symbol === value)
                  if (!dataPoint || dataPoint.percentage <= 5) {
                    return ''
                  }
                  return value
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="mt-4 space-y-2">
          {chartData.slice(0, 5).map((item) => (
            <div key={item.asset} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-white/80">{item.symbol}</span>
              </div>
              <div className="text-white/60">
                {item.percentage}%
              </div>
            </div>
          ))}
          {chartData.length > 5 && (
            <div className="text-xs text-white/40 text-center pt-1">
              +{chartData.length - 5} more assets
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PortfolioPieChart
