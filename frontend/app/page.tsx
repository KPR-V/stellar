import React from 'react'
import { AnimatedBackground } from '@/components/animated-background'
import NavBarPage from '@/components/navbar/navBarPage'
import Hero from '@/components/hero'

const Page = () => {
  return (
    <div className="relative min-h-screen font-[var(--font-raleway)]">
      <div className="relative z-10 top-1.5">
        <NavBarPage />
      </div>
      <AnimatedBackground />
      <Hero />
      
    </div>
  )
}

export default Page