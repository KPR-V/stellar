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

const CACHE_DURATION = 30 * 1000 // 30 seconds - shorter cache for fresh data
const REFRESH_INTERVAL = 60 * 1000 // Refresh every 1 minute
const INITIAL_LOAD_DAYS = 7 // Load only 7 days initially for fast display

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

    // Check cache first (unless we want to skip it for fresh data)
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
      // Log the API request details for debugging
      console.log(`Fetching chart data for coinId: ${coinId}, days: ${days}`);

      // Use range API with timestamp calculation
      const response = await fetch(`/api/crypto?coinId=${coinId}&days=${days}`, {
        // Add cache-busting parameter for fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      // Log the response status for debugging
      console.log(`API Response Status: ${response.status}`);

      if (!response.ok) {
        // Log the error response for debugging
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error('Failed to fetch chart data');
      }

      const data: ChartApiResponse = await response.json()
      
      if (!data.prices || !Array.isArray(data.prices)) {
        throw new Error('Invalid chart data received')
      }
      
      // Process data with appropriate sampling based on timeframe
      const step = days === '365' ? 5 : days === '90' ? 3 : 1 // Reduce data points for longer periods
      const transformedData: ChartDataPoint[] = data.prices
        .filter((_, index) => index % step === 0) // Sample data points
        .map(([timestamp, price]) => ({
          timestamp,
          price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
          date: new Date(timestamp).toISOString().split('T')[0]
        }))
        .sort((a, b) => a.timestamp - b.timestamp) // Ensure chronological order

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

  // Setup auto-refresh functionality
  const setupAutoRefresh = (coinId: string, days: string) => {
    // Clear existing interval
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current)
    }

    // Set up new refresh interval
    refreshInterval.current = setInterval(() => {
      if (currentCoinId.current && currentTimeframe.current) {
        // Fetch fresh data (skip cache)
        fetchChartData(currentCoinId.current, currentTimeframe.current, false, true)
      }
    }, REFRESH_INTERVAL)
  }

  const refetch = async (coinId: string, days: string) => {
    currentCoinId.current = coinId
    currentTimeframe.current = days
    
    // Setup auto-refresh for this coin/timeframe
    setupAutoRefresh(coinId, days)
    
    // For initial load or switching coins, load minimal data first
    if (days !== INITIAL_LOAD_DAYS.toString() && !getCachedData(coinId, INITIAL_LOAD_DAYS.toString())) {
      await fetchChartData(coinId, INITIAL_LOAD_DAYS.toString(), true)
    }
    
    // Then load the requested timeframe
    if (days !== INITIAL_LOAD_DAYS.toString()) {
      await fetchChartData(coinId, days, false)
    } else {
      await fetchChartData(coinId, days, true)
    }
  }

  const loadMoreData = async (coinId: string, days: string) => {
    // Update current refs
    currentCoinId.current = coinId
    currentTimeframe.current = days
    
    // Setup auto-refresh for new timeframe
    setupAutoRefresh(coinId, days)
    
    // Only load if not already cached and not currently loading
    if (!isDataCached(coinId, days) && !loading && !initialLoading) {
      await fetchChartData(coinId, days, false)
    }
  }

  // Cleanup interval on unmount
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

const timeRangeOptions = [
  { value: "1h", label: "1H" }, // Added 1-hour timeframe
  { value: "1", label: "1D" },
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" }
]; // Removed the 1-year (365 days) timeframe option
