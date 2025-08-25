import React from 'react'

const Hero = () => {
  return (
    <div className="relative flex items-end justify-start min-h-[80vh] px-4 sm:px-6 lg:px-16 pb-16">
      <div className="max-w-4xl w-full">
        {/* Title and Button Row */}
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
          
          {/* Balance Button */}
          <button className="
            bg-black/20 backdrop-blur-sm border border-white/20 rounded-full
            px-6 sm:px-8 py-2 sm:mb-3 text-sm sm:text-base text-white font-medium outline-none
            transition-all duration-300 ease-out
            hover:border-white/30 hover:bg-black/25 hover:shadow-lg hover:shadow-white/5
            focus:border-white/40 focus:bg-black/30 focus:ring-2 focus:ring-white/10
            active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
            hover:scale-105
            flex-shrink-0 self-start sm:self-auto
            font-raleway
          ">
            Balance
          </button>
        </div>
        
        {/* Subtitle/Description */}
        <p className="text-base sm:text-lg text-white/70 leading-relaxed font-extralight text-left font-raleway max-w-3xl">
          Automatically optimize your crypto allocations with precision algorithms.<br className="hidden sm:block"/>
          Minimize risk exposure while maximizing returns through intelligent automation.<br className="hidden sm:block"/>
          Transform volatility into opportunity with data-driven investment strategies.
        </p>
      </div>
    </div>
  )
}

export default Hero
