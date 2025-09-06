'use client'
import React from 'react'
import StatisticsCard from './statisticsCard'

const Hero = () => {
  return (
    <>
      <div className="relative flex items-end justify-start min-h-[80vh] px-4 sm:px-6 lg:px-16 pb-16">
        <div className="flex justify-between items-end w-full max-w-full">
          <div className="max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 lg:gap-8 mb-6">
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
            
            <p className="text-base sm:text-lg text-white/70 leading-relaxed font-extralight text-left font-raleway max-w-3xl">
              Automatically optimize your crypto allocations with precision algorithms.<br className="hidden sm:block"/>
              Minimize risk exposure while maximizing returns through intelligent automation.<br className="hidden sm:block"/>
              Transform volatility into opportunity with data-driven investment strategies.
            </p>
          </div>

          <div className="hidden lg:block">
            <StatisticsCard />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <StatisticsCard />
      </div>
    </>
  )
}

export default Hero
