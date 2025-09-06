"use client"
import React from 'react'
import AnimatedBackground from '../../components/animated-background'
import NavBarPage from '../../components/navbar/navBarPage'
import DaoProposals from '../../components/dao/dao-proposals'
import StakeModal from '../../components/dao/stake-modal'

const Page = () => {
  const [isStakeOpen, setIsStakeOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const handleStakeUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="relative min-h-screen w-full">
      <AnimatedBackground />
      <div className="relative z-10">
        <NavBarPage />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-2xl md:text-3xl font-light font-raleway">DAO Governance</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStakeOpen(true)}
                className="bg-white/10 hover:bg-white/15 border border-white/15 text-white px-5 py-2 rounded-full text-sm transition-colors font-raleway"
              >
                Stake KALE
              </button>
            </div>
          </div>

          <DaoProposals 
            key={refreshKey} 
            onRequireStake={() => setIsStakeOpen(true)} 
          />
        </main>
      </div>

      <StakeModal 
        isOpen={isStakeOpen} 
        onClose={() => setIsStakeOpen(false)}
        onStakeUpdate={handleStakeUpdate}
      />
    </div>
  )
}

export default Page
