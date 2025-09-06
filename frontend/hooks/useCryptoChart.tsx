"use client"

import { useState, useEffect, useRef } from 'react'

interface ChartDataPoint {
  timestamp: number
  price: number
  date: string
}

interface ChartApiResponse {
  prices: [number, number][]
}

interface CachedData {
  [key: string]: {
    data: ChartDataPoint[]
    timestamp: number
  }
}

interface UseCryptoChartReturn {
  chartData: ChartDataPoint[]
  loading: boolean
  error: string | null
  initialLoading: boolean
  refetch: (coinId: string, days: string) => void
  loadMoreData: (coinId: string, days: string) => void
}

const CACHE_DURATION = 30 * 1000 
const REFRESH_INTERVAL = 60 * 1000 
const INITIAL_LOAD_DAYS = 7 

export function useCryptoChart(): UseCryptoChartReturn {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef<CachedData>({})
  const currentCoinId = useRef<string>('')
  const currentTimeframe = useRef<string>('7')
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)

  const getCacheKey = (coinId: string, days: string) => `${coinId}-${days}`
  const isDataCached = (coinId: string, days: string): boolean => {
    const cacheKey = getCacheKey(coinId, days)
    const cached = cache.current[cacheKey]
    return cached && (Date.now() - cached.timestamp) < CACHE_DURATION
  }

  const getCachedData = (coinId: string, days: string): ChartDataPoint[] | null => {
    const cacheKey = getCacheKey(coinId, days)
    const cached = cache.current[cacheKey]
    return cached && (Date.now() - cached.timestamp) < CACHE_DURATION ? cached.data : null
  }

  const setCachedData = (coinId: string, days: string, data: ChartDataPoint[]) => {
    const cacheKey = getCacheKey(coinId, days)
    cache.current[cacheKey] = {
      data,
      timestamp: Date.now()
    }
  }

  const fetchChartData = async (coinId: string, days: string = '7', isInitial: boolean = false, skipCache: boolean = false) => {
    if (!coinId) return
    if (!skipCache) {
      const cachedData = getCachedData(coinId, days)
      if (cachedData) {
        setChartData(cachedData)
        return
      }
    }

    if (isInitial) {
      setInitialLoading(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/crypto?coinId=${coinId}&days=${days}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error('Failed to fetch chart data');
      }

      const data: ChartApiResponse = await response.json()      
      if (!data.prices || !Array.isArray(data.prices)) {
        throw new Error('Invalid chart data received')
      }
      
      const step = days === '365' ? 5 : days === '90' ? 3 : 1 
      const transformedData: ChartDataPoint[] = data.prices
        .filter((_, index) => index % step === 0)
        .map(([timestamp, price]) => ({
          timestamp,
          price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
          date: new Date(timestamp).toISOString().split('T')[0]
        }))
        .sort((a, b) => a.timestamp - b.timestamp)

      if (transformedData.length === 0) {
        throw new Error('No valid price data received')
      }

      setChartData(transformedData)
      setCachedData(coinId, days, transformedData)
    } catch (err) {
      console.error('Error fetching chart data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setChartData([])
    } finally {
      if (isInitial) {
        setInitialLoading(false)
      } else {
        setLoading(false)
      }
    }
  }

  const setupAutoRefresh = (coinId: string, days: string) => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current)
    }

    refreshInterval.current = setInterval(() => {
      if (currentCoinId.current && currentTimeframe.current) {
        fetchChartData(currentCoinId.current, currentTimeframe.current, false, true)
      }
    }, REFRESH_INTERVAL)
  }

  const refetch = async (coinId: string, days: string) => {
    currentCoinId.current = coinId
    currentTimeframe.current = days
    
    setupAutoRefresh(coinId, days)
    
    if (days !== INITIAL_LOAD_DAYS.toString() && !getCachedData(coinId, INITIAL_LOAD_DAYS.toString())) {
      await fetchChartData(coinId, INITIAL_LOAD_DAYS.toString(), true)
    }
    
    if (days !== INITIAL_LOAD_DAYS.toString()) {
      await fetchChartData(coinId, days, false)
    } else {
      await fetchChartData(coinId, days, true)
    }
  }

  const loadMoreData = async (coinId: string, days: string) => {
    currentCoinId.current = coinId
    currentTimeframe.current = days
    setupAutoRefresh(coinId, days)    
    if (!isDataCached(coinId, days) && !loading && !initialLoading) {
      await fetchChartData(coinId, days, false)
    }
  }

  useEffect(() => {
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [])

  return {
    chartData,
    loading,
    initialLoading,
    error,
    refetch,
    loadMoreData
  }
}
