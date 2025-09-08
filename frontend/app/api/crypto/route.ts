import { NextResponse } from 'next/server'

function getTimestampRange(timeframe: string) {
  const now = new Date()
  const currentTimestamp = Math.floor(now.getTime() / 1000)
  let fromTimestamp: number

  switch (timeframe) {
    case '1h': 
      fromTimestamp = currentTimestamp - (2 * 60 * 60)
      break
    case '1':
      fromTimestamp = currentTimestamp - (2 * 24 * 60 * 60)
      break
    case '7':
      fromTimestamp = currentTimestamp - (14 * 24 * 60 * 60)
      break
    case '30': 
      fromTimestamp = currentTimestamp - (60 * 24 * 60 * 60)
      break
    case '90':
      fromTimestamp = currentTimestamp - (180 * 24 * 60 * 60)
      break
    case '365':
      fromTimestamp = currentTimestamp - (450 * 24 * 60 * 60)
      break
    default:
      fromTimestamp = currentTimestamp - (30 * 24 * 60 * 60)
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

    if (coinId) {
      const { from, to } = getTimestampRange(days)      
      const chartResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
        {
          ...options,
          signal: AbortSignal.timeout(15000), 
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
      const response = NextResponse.json(chartData)
      response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
      
      return response
    }

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
