import React, { useState } from 'react'
import { Bell, RefreshCw, Eye, Moon } from 'lucide-react'

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    notifications: false,
    autoRefresh: true,
    darkMode: true,
    privacyMode: false
  })

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <div
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 ${
        enabled 
          ? 'bg-blue-500/60 hover:bg-blue-500/70' 
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-lg ${
          enabled ? 'right-0.5' : 'left-0.5'
        } ${enabled ? '' : 'bg-white/70'}`}
      />
    </div>
  )

  return (
    <div className="p-6 space-y-6 font-raleway">
      <h3 className="font-medium text-white/90 text-lg font-raleway">Settings</h3>
      
      <div className="space-y-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-white/60" />
              <div>
                <span className="text-white/80 text-sm font-medium">Notifications</span>
                <p className="text-white/40 text-xs mt-1">Receive alerts for transactions</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.notifications}
              onChange={() => toggleSetting('notifications')}
            />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-white/60" />
              <div>
                <span className="text-white/80 text-sm font-medium">Auto-refresh</span>
                <p className="text-white/40 text-xs mt-1">Automatically update portfolio data</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.autoRefresh}
              onChange={() => toggleSetting('autoRefresh')}
            />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-white/60" />
              <div>
                <span className="text-white/80 text-sm font-medium">Dark Mode</span>
                <p className="text-white/40 text-xs mt-1">Use dark theme interface</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.darkMode}
              onChange={() => toggleSetting('darkMode')}
            />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-white/60" />
              <div>
                <span className="text-white/80 text-sm font-medium">Privacy Mode</span>
                <p className="text-white/40 text-xs mt-1">Hide sensitive information</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.privacyMode}
              onChange={() => toggleSetting('privacyMode')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab