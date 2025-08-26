import { NextResponse } from 'next/server'

// Helper function to calculate timestamp ranges based on timeframe
function getTimestampRange(timeframe: string) {
  const now = new Date()
  const currentTimestamp = Math.floor(now.getTime() / 1000) // Current time in seconds
  let fromTimestamp: number

  switch (timeframe) {
    case '1h': // 1 hour - show last 2 hours for context
      fromTimestamp = currentTimestamp - (2 * 60 * 60)
      break
    case '1': // 1 day - show last 2 days for context
      fromTimestamp = currentTimestamp - (2 * 24 * 60 * 60)
      break
    case '7': // 7 days - show last 2 weeks for context
      fromTimestamp = currentTimestamp - (14 * 24 * 60 * 60)
      break
    case '30': // 30 days - show last 2 months for context
      fromTimestamp = currentTimestamp - (60 * 24 * 60 * 60)
      break
    case '90': // 90 days - show last 6 months for context
      fromTimestamp = currentTimestamp - (180 * 24 * 60 * 60)
      break
    case '365': // 1 year - show last 1.5 years for context (CoinGecko limit)
      fromTimestamp = currentTimestamp - (450 * 24 * 60 * 60) // 450 days max for free API
      break
    default:
      fromTimestamp = currentTimestamp - (30 * 24 * 60 * 60) // Default to 30 days
  }

  return {
    from: fromTimestamp,
    to: currentTimestamp
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coinId = searchParams.get('coinId')
  const days = searchParams.get('days') || '30'
  const interval = searchParams.get('interval') || 'daily'
  const assetPlatforms = searchParams.get('assetPlatforms')
  const assetPlatformId = searchParams.get('assetPlatformId')
  
  try {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json', 
        'x-cg-demo-api-key': 'CG-d4TkGHRXzK7yDhv8ibZPurwP'
      }
    }

    // If assetPlatforms is requested, fetch list of asset platforms
    if (assetPlatforms === 'true') {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/asset_platforms',
        {
          ...options,
          signal: AbortSignal.timeout(10000),
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch asset platforms')
      }

      const data = await response.json()
      
      const nextResponse = NextResponse.json(data)
      nextResponse.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      
      return nextResponse
    }

    // If assetPlatformId is provided, fetch tokens for that specific platform
    if (assetPlatformId) {
      try {
        const tokenResponse = await fetch(
          `https://api.coingecko.com/api/v3/token_lists/${assetPlatformId}/all.json`,
          {
            ...options,
            signal: AbortSignal.timeout(10000),
          }
        )
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          const nextResponse = NextResponse.json(tokenData)
          nextResponse.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
          return nextResponse
        } else {
          throw new Error('Failed to fetch tokens for asset platform')
        }
      } catch (tokenError) {
        console.error('Token list endpoint failed:', tokenError)
        throw new Error('Failed to fetch tokens for asset platform')
      }
    }

    // If coinId is provided, fetch chart data for that specific coin
    if (coinId) {
      // Calculate timestamp range for the selected timeframe
      const { from, to } = getTimestampRange(days)
      
      console.log(`Fetching chart data for ${coinId}, timeframe: ${days} days, from: ${new Date(from * 1000).toISOString()}, to: ${new Date(to * 1000).toISOString()}`)
      
      const chartResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
        {
          ...options,
          // Add timeout for better performance
          signal: AbortSignal.timeout(15000), // 15 second timeout for longer requests
        }
      )
      
      if (!chartResponse.ok) {
        console.error(`API Error: ${chartResponse.status} - ${chartResponse.statusText}`)
        throw new Error(`Failed to fetch crypto chart data: ${chartResponse.status}`)
      }

      const chartData = await chartResponse.json()
      
      if (!chartData.prices || chartData.prices.length === 0) {
        console.error('No price data received:', chartData)
        throw new Error('No price data available for this timeframe')
      }
      
      console.log(`Received ${chartData.prices.length} data points`)
      
      // Add minimal cache headers since we want fresh data every minute
      const response = NextResponse.json(chartData)
      response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
      
      return response
    }

    // Default behavior: fetch market data for all coins
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50', 
      {
        ...options,
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch crypto data')
    }

    const data = await response.json()
    
    const nextResponse = NextResponse.json(data)
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return nextResponse
  } catch (error) {
    console.error('Error fetching crypto data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    )
  }
}
