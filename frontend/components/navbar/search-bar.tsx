"use client"

import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import SearchModal from '../search-modal'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

export default function SearchBar({ 
  placeholder = "Search tokens and pools", 
  onSearch,
  className = "" 
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/') {
        event.preventDefault()
        setIsModalOpen(true)
      }
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(query)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleInputClick = () => {
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <div className={`flex justify-center ${className}`}>
        <form onSubmit={handleSubmit} className="relative w-96">
          <div className="relative flex items-center">
            {/* Search Icon */}
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-4 h-4 z-10" 
              strokeWidth={1.5}
            />
            
            {/* Input Field */}
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onClick={handleInputClick}
              placeholder={placeholder}
              className="
                w-full
                bg-black/20
                backdrop-blur-sm
                border border-white/20
                rounded-full
                px-10
                py-2.5
                text-sm
                text-white
                placeholder-white/50
                outline-none
                transition-all
                duration-300
                focus:border-white/40
                focus:bg-black/30
                focus:shadow-lg
                focus:shadow-white/5
                hover:border-white/30
                hover:bg-black/25
                cursor-pointer
              "
              readOnly
            />
            
            {/* Shortcut indicator */}
            <div className="absolute right-5 top-1/2 transform -translate-y-1/2 z-10">
              <span className="text-white/60 text-sm font-medium px-2 py-1 rounded bg-white/20">
                /
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isModalOpen} onClose={handleModalClose} />
    </>
  )
}
