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

  const filteredAssetPlatforms = assetPlatforms.filter(platform =>
    platform.name?.toLowerCase().includes(networkSearchQuery.toLowerCase()) ||
    platform.shortname?.toLowerCase().includes(networkSearchQuery.toLowerCase())
  )

  const filteredData = cryptoData.filter(crypto =>
    crypto.name?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    crypto.symbol?.toLowerCase().includes((searchQuery || '').toLowerCase())
  )

  useEffect(() => {
    if (isOpen && cryptoData.length === 0) {
      fetchCryptoData(1)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && assetPlatforms.length === 0) {
      fetchAssetPlatforms()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedNetwork !== 'all') {
      fetchCryptoDataByNetwork(selectedNetwork)
    } else if (selectedNetwork === 'all') {
      fetchCryptoData(1)
    }
  }, [selectedNetwork])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
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
          setNetworkSearchQuery('') 
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

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('recentSearches')
        if (saved) {
          const parsed = JSON.parse(saved)
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value || '')
    setShowRecentSearches((value || '').trim() === '')
  }

  const handleSearch = (query: string) => {
    if (!query || !query.trim()) return
    
    setSearchQuery(query)
    setShowRecentSearches(false)
    
    const matchedCrypto = filteredData.find(crypto =>
      crypto.name?.toLowerCase() === query.toLowerCase() ||
      crypto.symbol?.toLowerCase() === query.toLowerCase()
    ) || filteredData.find(crypto =>
      crypto.name?.toLowerCase().includes(query.toLowerCase()) ||
      crypto.symbol?.toLowerCase().includes(query.toLowerCase())
    )
    
    if (matchedCrypto && !recentSearches.some(recent => recent.id === matchedCrypto.id)) {
      const newRecentSearches = [matchedCrypto, ...recentSearches.slice(0, 4)]
      setRecentSearches(newRecentSearches)
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))
    }
  }

  const handleRecentSearchClick = (crypto: CryptoData) => {
    setSearchQuery(crypto.name)
    setShowRecentSearches(false)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const handleThreeDotsClick = (crypto: CryptoData) => {
    if (filteredData.some(item => item.id === crypto.id) && !recentSearches.some(recent => recent.id === crypto.id)) {
      const newRecentSearches = [crypto, ...recentSearches.slice(0, 4)]
      setRecentSearches(newRecentSearches)
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))
    }
    setSelectedCrypto(crypto)
    setShowAdvancedModal(true)
  }

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
      
      if (data && typeof data === 'object') {
        if (data.tokens && Array.isArray(data.tokens)) {
          const transformedData = data.tokens.map((token: any) => ({
            id: token.address || token.symbol?.toLowerCase() || '',
            symbol: token.symbol || '',
            name: token.name || '',
            image: token.logoURI || '',
            current_price: 0,
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
          setCryptoData(Array.isArray(data) ? data : [])
        }
      } else {
        setCryptoData([])
      }
      
      setCurrentPage(1)
      setHasMore(false) 
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
        setHasMore(data.length === 50) 
      }
    } catch (error) {
      console.error('Error fetching crypto data:', error)
      try {
        const fallbackResponse = await fetch('/api/crypto')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setCryptoData(fallbackData.slice(0, 50)) 
          setHasMore(fallbackData.length > 50)
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-lg z-[9999] font-raleway flex justify-center items-center">
      <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl w-[700px] h-[600px] overflow-hidden absolute top-1/2">
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
          <div className="flex items-center space-x-3">
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
                className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-10 py-2 text-sm text-white placeholder-white/40 outline-none transition-all duration-300 focus:border-white/40 focus:bg-black/40"
                autoFocus
              />
            </div>

            <div className="relative network-dropdown">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-white outline-none transition-all duration-300 hover:border-white/40 hover:bg-black/40 min-w-[140px]"
              >
                {selectedNetwork === 'all' ? (
                  <>
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

              {showNetworkDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl z-10 max-h-60 overflow-hidden">
                  <div className="sticky top-0 p-3 border-b border-white/10 bg-black/90">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/40 w-3 h-3" />
                      <input
                        type="text"
                        value={networkSearchQuery}
                        onChange={(e) => setNetworkSearchQuery(e.target.value)}
                        placeholder="Search networks..."
                        className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-md pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none transition-all duration-200 focus:border-white/40 focus:bg-black/50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto network-dropdown-scrollbar">
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
                          className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors duration-200
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
                        className="flex items-center justify-between p-3 bg-black/10 hover:bg-black/30 border border-white/5 hover:border-white/15 rounded-lg transition-all duration-300 cursor-pointer group hover:scale-[1.02] transform-gpu"
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

              <div className="mb-4">
                <h3 className="text-white/70 text-sm font-medium flex items-center">
                  Tokens by 24H volume
                </h3>
              </div>

              <div className="space-y-1">
                {filteredData.map((crypto) => (
                  <div
                    key={crypto.id}
                    className="flex items-center justify-between p-3 bg-black/10 hover:bg-black/30 border border-white/5 hover:border-white/15 rounded-lg transition-all duration-300 cursor-pointer group hover:scale-[1.02] transform-gpu"
                    onMouseEnter={() => setHoveredRow(crypto.id)}
                    onMouseLeave={() => setHoveredRow(null)}
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

                    <div className="flex items-center space-x-4">
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

              {filteredData.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-white/60 text-lg mb-2">No cryptocurrencies found</div>
                  <div className="text-white/40 text-sm">
                    Try adjusting your search terms
                  </div>
                </div>
              )}

              {loadingMore && (
                <div className="text-center py-4">
                  <div className="text-white/60 text-sm">Loading more cryptocurrencies...</div>
                </div>
              )}

              {!hasMore && cryptoData.length > 0 && (
                <div className="text-center py-4">
                  <div className="text-white/40 text-xs">You've reached the end of the list</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AdvancedCryptoDataModal
        isOpen={showAdvancedModal}
        onClose={closeAdvancedModal}
        cryptoData={selectedCrypto}
      />
    </div>
  )
}
