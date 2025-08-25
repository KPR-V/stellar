"use client"

import React, { useState } from 'react'
import { Search } from 'lucide-react'

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(query)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div className="relative flex items-center">
          {/* Search Icon */}
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-3 h-3 sm:w-4 sm:h-4 z-10" 
            strokeWidth={1.5}
          />
          
          {/* Input Field */}
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="
              w-full
              bg-black/20
              backdrop-blur-sm
              border border-white/20
              rounded-full
              pl-8 sm:pl-12
              pr-12 sm:pr-28
              py-2 sm:py-2.5
              text-xs sm:text-sm
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
            "
          />
          
          {/* Shortcut indicator */}
          <div className="absolute right-3 sm:right-5 top-1/2 transform -translate-y-1/2 z-10">
            <span className="text-white/60 text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-white/20">
              /
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}
