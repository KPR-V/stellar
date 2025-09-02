'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import SearchBar from './search-bar'
import StellarConnect from '../../app/stellar-connect'
import ProfileModal from '../Profile/profile-modal'
import Link from 'next/link'
const NavBarPage = () => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleProfileClick = () => {
    setIsProfileModalOpen(true)
  }

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      <nav className="h-16 md:h-20 lg:h-24 w-full flex items-center justify-between px-4 sm:px-6 lg:px-16 font-raleway relative">
        {/* Mobile Menu Button - Only visible on small screens */}
        <div className="md:hidden flex-shrink-0">
          <button
            onClick={toggleMobileMenu}
            className="text-white/80 hover:text-white p-2 transition-colors duration-200"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Left side - Logo (desktop) */}
        <div className="hidden md:flex flex-shrink-0 items-center" style={{ minWidth: '120px' }}>
          <div className="text-4xl lg:text-6xl font-thin tracking-tighter font-italianno"
               style={{
                 WebkitTextStroke: '1px white',
                 WebkitTextFillColor: 'transparent',
                 color: 'transparent'
               }}>
            CX
          </div>
        </div>
        
        {/* Center - SearchBar (absolute positioning for exact center) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
          <SearchBar />
        </div>
        
        {/* Right side - Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-shrink-0">
          {/* Three Navigation Buttons */}
          <div className="flex items-center gap-1 lg:gap-3">
            {/* Explore Button */}
            <button className="relative bg-transparent text-white font-medium text-xs lg:text-sm px-2 lg:px-3 py-2 transition-all duration-300 ease-out group whitespace-nowrap">
              <span className="relative">
                Explore
                <div className="absolute -bottom-1 left-0 right-0 h-[1px] w-0 bg-white/60 transition-all duration-300 ease-out group-hover:w-full"></div>
              </span>
            </button>

            {/* DAO Button */}
            <button className="relative bg-transparent text-white font-medium text-xs lg:text-sm px-2 lg:px-3 py-2 transition-all duration-300 ease-out group whitespace-nowrap">
              <span className="relative">
                <Link href="/dao">
                DAO
                
                </Link>
                <div className="absolute -bottom-1 left-0 right-0 h-[1px] w-0 bg-white/60 transition-all duration-300 ease-out group-hover:w-full"></div>
              </span>
            </button>

            {/* Profile Button */}
            <button 
              onClick={handleProfileClick}
              className="relative bg-transparent text-white font-medium text-xs lg:text-sm px-2 lg:px-3 py-2 transition-all duration-300 ease-out group whitespace-nowrap"
            >
              <span className="relative">
                Profile
                <div className="absolute -bottom-1 left-0 right-0 h-[1px] w-0 bg-white/60 transition-all duration-300 ease-out group-hover:w-full"></div>
              </span>
            </button>
          </div>

          <div className="ml-2 lg:ml-4 flex-shrink-0">
            <StellarConnect />
          </div>
        </div>

        {/* Mobile Logo - Centered on mobile (hidden when search is shown) */}
        <div className="md:hidden flex-1 flex justify-center items-center opacity-0">
          <div className="text-3xl font-thin tracking-tighter font-italianno"
               style={{
                 WebkitTextStroke: '1px white',
                 WebkitTextFillColor: 'transparent',
                 color: 'transparent'
               }}>
            CX
          </div>
        </div>

        {/* Mobile StellarConnect - Right side on mobile */}
        <div className="md:hidden flex-shrink-0">
          <StellarConnect />
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-40">
          <div className="flex flex-col h-full pt-20 px-6">
            {/* Mobile Navigation Buttons */}
            <div className="flex flex-col space-y-6">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left text-white/90 font-medium text-lg px-4 py-3 hover:bg-white/5 rounded-lg transition-all duration-300"
              >
                Explore
              </button>
              
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left text-white/90 font-medium text-lg px-4 py-3 hover:bg-white/5 rounded-lg transition-all duration-300"
              >
                DAO
              </button>
              
              <button 
                onClick={() => {
                  handleProfileClick()
                  setIsMobileMenuOpen(false)
                }}
                className="text-left text-white/90 font-medium text-lg px-4 py-3 hover:bg-white/5 rounded-lg transition-all duration-300"
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={handleCloseProfileModal} 
      />
    </>
  )
}

export default NavBarPage