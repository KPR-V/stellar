"use client"

import React, { useState, useEffect } from 'react'
import { Search, MoreHorizontal, X, ChevronDown } from 'lucide-react'
import AdvancedCryptoDataModal from './advanced-crypto-data'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CryptoData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap_rank: number
  total_volume: number
  price_change_percentage_24h: number
  market_cap: number
  market_cap_change_percentage_24h: number
  circulating_supply: number
  total_supply: number | null
  max_supply: number | null
  high_24h: number
  low_24h: number
  price_change_24h: number
  market_cap_change_24h: number
  fully_diluted_valuation: number
  ath: number
  ath_change_percentage: number
  ath_date: string
  atl: number
  atl_change_percentage: number
  atl_date: string
  last_updated: string
}

interface AssetPlatform {
  id: string
  chain_identifier: number | null
  name: string
  shortname: string
  native_coin_id: string
  image: {
    thumb: string
    small: string
    large: string
  }
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<CryptoData[]>([])
  const [showRecentSearches, setShowRecentSearches] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null)
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [assetPlatforms, setAssetPlatforms] = useState<AssetPlatform[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [loadingNetworks, setLoadingNetworks] = useState(false)
  const [networkSearchQuery, setNetworkSearchQuery] = useState('')

  // Filter asset platforms based on network search query
  const filteredAssetPlatforms = assetPlatforms.filter(platform =>
    platform.name?.toLowerCase().includes(networkSearchQuery.toLowerCase()) ||
    platform.shortname?.toLowerCase().includes(networkSearchQuery.toLowerCase())
  )

  // Filter crypto data based on search query
  const filteredData = cryptoData.filter(crypto =>
    crypto.name?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    crypto.symbol?.toLowerCase().includes((searchQuery || '').toLowerCase())
  )

  // Fetch crypto data when modal opens or network changes
  useEffect(() => {
    if (isOpen && cryptoData.length === 0) {
      fetchCryptoData(1)
    }
  }, [isOpen])

  // Fetch asset platforms when modal opens
  useEffect(() => {
    if (isOpen && assetPlatforms.length === 0) {
      fetchAssetPlatforms()
    }
  }, [isOpen])

  // Fetch data when network selection changes
  useEffect(() => {
    if (selectedNetwork !== 'all') {
      fetchCryptoDataByNetwork(selectedNetwork)
    } else if (selectedNetwork === 'all') {
      fetchCryptoData(1)
    }
  }, [selectedNetwork])

  // Handle scroll for infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    // Check if user scrolled to bottom (with small threshold)
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore && !loadingMore) {
      loadMoreData()
    }
  }

  const loadMoreData = async () => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&page=${nextPage}&sparkline=false`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch more crypto data')
      }
      
      const newData = await response.json()
      
      if (newData.length === 0) {
        setHasMore(false)
      } else {
        setCryptoData(prev => [...prev, ...newData])
        setCurrentPage(nextPage)
      }
    } catch (error) {
      console.error('Error loading more crypto data:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showNetworkDropdown) {
          setShowNetworkDropdown(false)
        } else {
          onClose()
        }
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (showNetworkDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.network-dropdown')) {
          setShowNetworkDropdown(false)
          setNetworkSearchQuery('') // Clear network search when closing dropdown
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isOpen, onClose, showNetworkDropdown])

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('recentSearches')
        if (saved) {
          const parsed = JSON.parse(saved)
          // Validate that the parsed data is an array of valid crypto objects
          if (Array.isArray(parsed) && parsed.every(item => item.id && item.name && item.symbol)) {
            setRecentSearches(parsed)
          }
        }
      } catch (error) {
        console.error('Error loading recent searches:', error)
        localStorage.removeItem('recentSearches')
      }
    }
  }, [isOpen])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value || '')
    setShowRecentSearches((value || '').trim() === '')
  }

  // Handle search submission
  const handleSearch = (query: string) => {
    if (!query || !query.trim()) return
    
    setSearchQuery(query)
    setShowRecentSearches(false)
    
    // Find exact match from the filtered list
    const matchedCrypto = filteredData.find(crypto =>
      crypto.name?.toLowerCase() === query.toLowerCase() ||
      crypto.symbol?.toLowerCase() === query.toLowerCase()
    ) || filteredData.find(crypto =>
      crypto.name?.toLowerCase().includes(query.toLowerCase()) ||
      crypto.symbol?.toLowerCase().includes(query.toLowerCase())
    )
    
    // Add to recent searches if found and not already there
    if (matchedCrypto && !recentSearches.some(recent => recent.id === matchedCrypto.id)) {
      const newRecentSearches = [matchedCrypto, ...recentSearches.slice(0, 4)]
      setRecentSearches(newRecentSearches)
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))
    }
  }

  // Handle clicking on a recent search item
  const handleRecentSearchClick = (crypto: CryptoData) => {
    setSearchQuery(crypto.name)
    setShowRecentSearches(false)
  }

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  // Handle three dots click
  const handleThreeDotsClick = (crypto: CryptoData) => {
    // If the crypto is in the filtered list and not already in recent searches, add it
    if (filteredData.some(item => item.id === crypto.id) && !recentSearches.some(recent => recent.id === crypto.id)) {
      const newRecentSearches = [crypto, ...recentSearches.slice(0, 4)]
      setRecentSearches(newRecentSearches)
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))
    }
    setSelectedCrypto(crypto)
    setShowAdvancedModal(true)
  }

  // Close advanced modal
  const closeAdvancedModal = () => {
    setShowAdvancedModal(false)
    setSelectedCrypto(null)
  }

  const fetchAssetPlatforms = async () => {
    setLoadingNetworks(true)
    try {
      const response = await fetch('/api/crypto?assetPlatforms=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch asset platforms')
      }
      
      const data = await response.json()
      setAssetPlatforms(data.filter((platform: AssetPlatform) => platform.image && platform.image.thumb))
    } catch (error) {
      console.error('Error fetching asset platforms:', error)
    } finally {
      setLoadingNetworks(false)
    }
  }

  const fetchCryptoDataByNetwork = async (platformId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/crypto?assetPlatformId=${platformId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto data for network')
      }
      
      const data = await response.json()
      
      // Handle token_lists API response format
      if (data && typeof data === 'object') {
        // If data has tokens array (token_lists format)
        if (data.tokens && Array.isArray(data.tokens)) {
          // Transform token_lists format to match CryptoData interface
          const transformedData = data.tokens.map((token: any) => ({
            id: token.address || token.symbol?.toLowerCase() || '',
            symbol: token.symbol || '',
            name: token.name || '',
            image: token.logoURI || '',
            current_price: 0, // Token lists don't include price data
            market_cap_rank: 0,
            total_volume: 0,
            price_change_percentage_24h: 0,
            market_cap: 0,
            market_cap_change_percentage_24h: 0,
            circulating_supply: 0,
            total_supply: null,
            max_supply: null,
            high_24h: 0,
            low_24h: 0,
            price_change_24h: 0,
            market_cap_change_24h: 0,
            fully_diluted_valuation: 0,
            ath: 0,
            ath_change_percentage: 0,
            ath_date: '',
            atl: 0,
            atl_change_percentage: 0,
            atl_date: '',
            last_updated: ''
          })).filter((token: any) => token.name && token.symbol && token.image) // Filter out invalid tokens
          
          setCryptoData(transformedData)
        } else {
          // If it's already in the right format (array of coins)
          setCryptoData(Array.isArray(data) ? data : [])
        }
      } else {
        setCryptoData([])
      }
      
      setCurrentPage(1)
      setHasMore(false) // Network-specific data doesn't support pagination
    } catch (error) {
      console.error('Error fetching crypto data by network:', error)
      setCryptoData([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCryptoData = async (page: number = 1) => {
    setLoading(true)
    try {
      // Use CoinGecko API for crypto data with pagination
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&page=${page}&sparkline=false`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto data')
      }
      
      const data = await response.json()
      
      if (page === 1) {
        setCryptoData(data)
        setCurrentPage(1)
        setHasMore(data.length === 50) // If we got 50 items, there might be more
      }
    } catch (error) {
      console.error('Error fetching crypto data:', error)
      // Fallback to your existing API
      try {
        const fallbackResponse = await fetch('/api/crypto')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setCryptoData(fallbackData.slice(0, 50)) // Limit to first 50
          setHasMore(fallbackData.length > 50)
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(2)}B`
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(2)}M`
    } else if (volume >= 1e3) {
      return `$${(volume / 1e3).toFixed(2)}K`
    }
    return `$${volume.toFixed(2)}`
  }

  const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0
    return (
      <span className={`${isPositive ? 'text-green-400' : 'text-red-400'} font-medium`}>
        {isPositive ? '+' : ''}{percentage.toFixed(2)}%
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-lg z-[9999] font-raleway flex justify-center items-center">
      <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl w-[700px] h-[600px] overflow-hidden absolute top-1/2">
        {/* Header */}
        <div className="p-6 border-b border-white/15 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white/90 font-raleway font-medium text-xl">
              Search Cryptocurrencies
            </h2>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white/90 transition-all duration-300 p-2 hover:bg-white/5 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>
          {/* Search Input and Network Dropdown */}
          <div className="flex items-center space-x-3">
            {/* Search Input - Reduced width */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery)
                  }
                }}
                placeholder="Search by name or symbol..."
                className="
                  w-full
                  bg-black/30
                  backdrop-blur-sm
                  border border-white/20
                  rounded-full
                  px-10
                  py-2
                  text-sm
                  text-white
                  placeholder-white/40
                  outline-none
                  transition-all
                  duration-300
                  focus:border-white/40
                  focus:bg-black/40
                "
                autoFocus
              />
            </div>

            {/* Network Dropdown */}
            <div className="relative network-dropdown">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="
                  flex items-center space-x-2
                  bg-black/30
                  backdrop-blur-sm
                  border border-white/20
                  rounded-full
                  px-4
                  py-2
                  text-sm
                  text-white
                  outline-none
                  transition-all
                  duration-300
                  hover:border-white/40
                  hover:bg-black/40
                  min-w-[140px]
                "
              >
                {selectedNetwork === 'all' ? (
                  <>
                    {/* All Networks Icon - 2x2 grid of first 4 crypto images */}
                    <div className="w-6 h-6 relative">
                      <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                        {cryptoData.slice(0, 4).map((crypto, index) => (
                          <img
                            key={index}
                            src={crypto.image}
                            alt=""
                            className="w-2.5 h-2.5 rounded-sm"
                          />
                        ))}
                      </div>
                    </div>
                    <span>All Networks</span>
                  </>
                ) : (
                  <>
                    {assetPlatforms.find(p => p.id === selectedNetwork) && (
                      <>
                        <img
                          src={assetPlatforms.find(p => p.id === selectedNetwork)?.image.thumb}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{assetPlatforms.find(p => p.id === selectedNetwork)?.name}</span>
                      </>
                    )}
                  </>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showNetworkDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl z-10 max-h-60 overflow-hidden">
                  {/* Network Search Bar - Fixed at top */}
                  <div className="sticky top-0 p-3 border-b border-white/10 bg-black/90">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/40 w-3 h-3" />
                      <input
                        type="text"
                        value={networkSearchQuery}
                        onChange={(e) => setNetworkSearchQuery(e.target.value)}
                        placeholder="Search networks..."
                        className="
                          w-full
                          bg-black/40
                          backdrop-blur-sm
                          border border-white/20
                          rounded-md
                          pl-7
                          pr-3
                          py-1.5
                          text-xs
                          text-white
                          placeholder-white/40
                          outline-none
                          transition-all
                          duration-200
                          focus:border-white/40
                          focus:bg-black/50
                        "
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Scrollable Networks List */}
                  <div className="max-h-48 overflow-y-auto network-dropdown-scrollbar">
                    {/* All Networks Option */}
                    {(networkSearchQuery === '' || 'all networks'.includes(networkSearchQuery.toLowerCase())) && (
                      <button
                        onClick={() => {
                          setSelectedNetwork('all')
                          setShowNetworkDropdown(false)
                          setNetworkSearchQuery('')
                        }}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors duration-200
                          ${selectedNetwork === 'all' ? 'bg-white/20' : 'hover:bg-white/10'}
                        `}
                      >
                        <div className="w-8 h-8 relative">
                          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                            {cryptoData.slice(0, 4).map((crypto, index) => (
                              <img
                                key={index}
                                src={crypto.image}
                                alt=""
                                className="w-3.5 h-3.5 rounded-sm"
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-white text-sm">All Networks</span>
                      </button>
                    )}

                    {/* Individual Networks */}
                    {loadingNetworks ? (
                      <div className="px-4 py-3 text-white/60 text-sm">Loading networks...</div>
                    ) : filteredAssetPlatforms.length > 0 ? (
                      filteredAssetPlatforms.map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => {
                            setSelectedNetwork(platform.id)
                            setShowNetworkDropdown(false)
                            setNetworkSearchQuery('')
                          }}
                          className={`
                            w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors duration-200
                            ${selectedNetwork === platform.id ? 'bg-white/20' : 'hover:bg-white/10'}
                          `}
                        >
                          <img
                            src={platform.image.thumb}
                            alt={platform.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="text-white text-sm">{platform.name}</span>
                        </button>
                      ))
                    ) : networkSearchQuery !== '' ? (
                      <div className="px-4 py-3 text-white/40 text-sm">No networks found</div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 bg-black/30 h-[600px] overflow-y-auto faq-scrollbar"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-white/60 text-lg">Loading cryptocurrencies...</div>
            </div>
          ) : (
            <div className="p-6">
              {/* Recent Searches Section */}
              {showRecentSearches && recentSearches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white/70 text-sm font-medium">Recent searches</h3>
                    <button
                      onClick={clearRecentSearches}
                      className="text-white/50 hover:text-white/80 text-xs transition-colors duration-200"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((crypto, index) => (
                      <div
                        key={index}
                        onClick={() => handleRecentSearchClick(crypto)}
                        className="
                          flex items-center justify-between
                          p-3 
                          bg-black/10 
                          hover:bg-black/30 
                          border border-white/5 
                          hover:border-white/15 
                          rounded-lg 
                          transition-all 
                          duration-300
                          cursor-pointer
                          group
                          hover:scale-[1.02]
                          transform-gpu
                        "
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={crypto.image}
                            alt={crypto.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="text-white font-medium text-sm">
                              {crypto.name}
                            </div>
                            <div className="text-white/60 text-xs uppercase">
                              {crypto.symbol}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tokens by 24H volume heading */}
              <div className="mb-4">
                <h3 className="text-white/70 text-sm font-medium flex items-center">
                  Tokens by 24H volume
                </h3>
              </div>

              {/* Crypto Data Table */}
              <div className="space-y-1">
                {filteredData.map((crypto) => (
                  <div
                    key={crypto.id}
                    className="
                      flex items-center justify-between
                      p-3 
                      bg-black/10 
                      hover:bg-black/30 
                      border border-white/5 
                      hover:border-white/15 
                      rounded-lg 
                      transition-all 
                      duration-300
                      cursor-pointer
                      group
                      hover:scale-[1.02]
                      transform-gpu
                    "
                    onMouseEnter={() => setHoveredRow(crypto.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Left side - Asset Info */}
                    <div className="flex items-center space-x-3">
                      <img
                        src={crypto.image}
                        alt={crypto.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="text-white font-medium text-sm">
                          {crypto.name}
                        </div>
                        <div className="text-white/60 text-xs uppercase">
                          {crypto.symbol}
                        </div>
                      </div>
                    </div>

                    {/* Right side - Three dots (only on hover) */}
                    <div className="flex items-center space-x-4">
                      {/* Three dots - only show on hover */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        {hoveredRow === crypto.id && (
                          <button 
                            onClick={() => handleThreeDotsClick(crypto)}
                            className="text-white/60 hover:text-white/90 transition-colors duration-200"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No results */}
              {filteredData.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-white/60 text-lg mb-2">No cryptocurrencies found</div>
                  <div className="text-white/40 text-sm">
                    Try adjusting your search terms
                  </div>
                </div>
              )}

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="text-center py-4">
                  <div className="text-white/60 text-sm">Loading more cryptocurrencies...</div>
                </div>
              )}

              {/* End of results indicator */}
              {!hasMore && cryptoData.length > 0 && (
                <div className="text-center py-4">
                  <div className="text-white/40 text-xs">You've reached the end of the list</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Crypto Data Modal */}
      <AdvancedCryptoDataModal
        isOpen={showAdvancedModal}
        onClose={closeAdvancedModal}
        cryptoData={selectedCrypto}
      />
    </div>
  )
}
