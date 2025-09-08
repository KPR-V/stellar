"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '../../components/animated-background'
import ProposalCreationForm from '../../components/dao/proposal-creation-form'
import ProposalsList from '../../components/dao/proposals-list'
import ProposalModal from '../../components/dao/proposal-modal'
import StakeModal from '../../components/dao/stake-modal'
import Message from '../../components/message'
import StellarConnect from '../stellar-connect'
import { useWallet } from '../../hooks/useWallet'
import { useProposals } from '../../hooks/useProposals'
import { useMessage } from '../../hooks/useMessage'

const Page = () => {
  const { address } = useWallet()
  const router = useRouter()
  const [isStakeOpen, setIsStakeOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [hasStake, setHasStake] = React.useState(false)
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  
  const {
    selectedProposal,
    isModalOpen,
    openProposalModal,
    closeProposalModal,
    refreshProposal
  } = useProposals()

  const { messageState, hideMessage } = useMessage()
  
  const handleStakeUpdate = () => {
    setRefreshKey(prev => prev + 1)
    setHasStake(true)
  }

  const handleProposalCreated = () => {
    setRefreshKey(prev => prev + 1) 
    setShowCreateForm(false)
  }

  const handleProposalUpdated = (updatedProposal: any) => {
    refreshProposal(updatedProposal)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="relative min-h-screen w-full faq-scrollbar">
      <AnimatedBackground />
      <div className="relative z-10">
        <main className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between relative mb-12">
            <div className="flex-shrink-0 items-center">
              <div className="text-4xl lg:text-6xl font-thin tracking-tighter font-italianno"
                   style={{WebkitTextStroke: '1px white', WebkitTextFillColor: 'transparent', color: 'transparent'}}>
                CX
              </div>
            </div>

            <h1 className="text-white text-2xl md:text-3xl font-semibold font-raleway absolute left-1/2 transform -translate-x-1/2">
              DAO Governance
            </h1>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCreateForm(true)}
                className="relative bg-transparent text-white font-raleway text-xs lg:text-sm px-2 lg:px-3 py-2 transition-all duration-300 ease-out group whitespace-nowrap"
              >
                <span className="relative">
                  Create Proposal
                  <div className="absolute -bottom-1 left-0 right-0 h-[1px] w-0 bg-white/60 transition-all duration-300 ease-out group-hover:w-full"></div>
                </span>
              </button>
               <button
                onClick={() => setIsStakeOpen(true)}
                className="relative bg-transparent text-white font-raleway text-xs lg:text-sm px-2 lg:px-3 py-2 transition-all duration-300 ease-out group whitespace-nowrap"
              >
                <span className="relative">
                  Stake KALE
                  <div className="absolute -bottom-1 left-0 right-0 h-[1px] w-0 bg-white/60 transition-all duration-300 ease-out group-hover:w-full"></div>
                </span>
              </button>

                <button
                onClick={() => router.push('/')}
                className="relative bg-transparent text-white font-raleway text-xs lg:text-sm px-2 lg:px-3 py-2 transition-all duration-300 ease-out group whitespace-nowrap"
              >
                <span className="relative">
                  Home
                  <div className="absolute -bottom-1 left-0 right-0 h-[1px] w-0 bg-white/60 transition-all duration-300 ease-out group-hover:w-full"></div>
                </span>
              </button>

              <div className="ml-2 lg:ml-4 flex-shrink-0">
                <StellarConnect />
              </div>
            </div>
          </div>

          <ProposalsList 
            refreshKey={refreshKey}
            onViewProposal={openProposalModal}
          />
        </main>
      </div>

      <ProposalCreationForm 
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onRequireStake={() => setIsStakeOpen(true)}
        onProposalCreated={handleProposalCreated}
      />

      <ProposalModal
        proposal={selectedProposal}
        isOpen={isModalOpen}
        onClose={closeProposalModal}
        onProposalUpdate={handleProposalUpdated}
      />

      <StakeModal 
        isOpen={isStakeOpen} 
        onClose={() => setIsStakeOpen(false)}
        onStakeUpdate={handleStakeUpdate}
      />

      <Message 
        message={messageState.message}
        isVisible={messageState.isVisible}
        onClose={hideMessage}
      />
    </div>
  )
}

export default Page
