'use client'
import React, { useState } from 'react'
import { Minus } from 'lucide-react'
import ProfileStats from './profile-stats'
import ActivityTab from './activity-tab'
import TransactionTab from './transaction-tab'
import SettingsTab from './settings-tab'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('Statistics')

  const tabs = ['Statistics', 'Activity', 'Transaction History', 'Settings']

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Statistics':
        return <ProfileStats />
      case 'Activity':
        return <ActivityTab />
      case 'Transaction History':
        return <TransactionTab />
      case 'Settings':
        return <SettingsTab />
      default:
        return <ProfileStats />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-none flex items-center justify-center z-[9999] font-raleway">
      <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl w-[800px] h-[600px] overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
          <h2 className="text-white/90 font-raleway font-medium text-xl">
            Portfolio Overview
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white/90 transition-all duration-300 p-2 hover:bg-white/5 rounded-xl"
          >
            <Minus size={20} />
          </button>
        </div>

        {/* Horizontal Tabs */}
        <div className="flex border-b border-white/5 bg-black/10">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                relative px-6 py-3 transition-all duration-300 ease-out font-raleway font-medium text-sm
                ${activeTab === tab
                  ? 'text-white/95 bg-white/5'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/3'
                }
              `}
            >
              {tab}
              
              {/* Active indicator */}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content - Hidden scrollbar */}
        <div className="flex-1 bg-black/30 h-[520px] overflow-y-scroll scrollbar-hide">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default ProfileModal