'use client'
import React, { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import FAQModal from './faq'
import StatisticsCard from './statisticsCard'

const Hero = () => {
  const [isFAQOpen, setIsFAQOpen] = useState(false)

  return (
    <>
      <div className="relative flex items-end justify-start min-h-[80vh] px-4 sm:px-6 lg:px-16 pb-16">
        <div className="flex justify-between items-end w-full max-w-full">
          {/* Left Content */}
          <div className="max-w-4xl">
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 lg:gap-8 mb-6">
              {/* Main Title */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-wide font-prompt flex">
                <span style={{
                  WebkitTextStroke: '1px white',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent'
                }}>
                  CalibreX
                </span>
              </h1>
            </div>
            
            {/* Subtitle/Description */}
            <p className="text-base sm:text-lg text-white/70 leading-relaxed font-extralight text-left font-raleway max-w-3xl">
              Automatically optimize your crypto allocations with precision algorithms.<br className="hidden sm:block"/>
              Minimize risk exposure while maximizing returns through intelligent automation.<br className="hidden sm:block"/>
              Transform volatility into opportunity with data-driven investment strategies.
            </p>
          </div>

          {/* Statistics Card - Will position itself fixed */}
          <div className="hidden lg:block">
            <StatisticsCard />
          </div>
        </div>

        {/* FAQ Icon - Bottom Left Corner */}
        <button
          onClick={() => setIsFAQOpen(true)}
          className="
            fixed bottom-6 left-14 z-50
            w-12 h-12 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full
            flex items-center justify-center text-white/70 outline-none
            transition-all duration-300 ease-out
            hover:border-white/30 hover:bg-black/40 hover:text-white/90 hover:shadow-lg hover:shadow-white/10
            focus:border-white/40 focus:bg-black/50 focus:ring-2 focus:ring-white/10 focus:text-white/90
            active:scale-[0.95] hover:scale-105
            group
          "
          title="Frequently Asked Questions"
        >
          <HelpCircle 
            size={20} 
            className="transition-transform duration-300 group-hover:rotate-12" 
          />
        </button>
      </div>

      {/* FAQ Modal */}
      <FAQModal isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
      
      {/* Statistics Card for mobile - show at bottom */}
      <div className="lg:hidden">
        <StatisticsCard />
      </div>
    </>
  )
}

export default Hero
