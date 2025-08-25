import React, { useState } from 'react'
import { Clock, ArrowUpRight, ArrowDownRight, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react'

const ActivityTab = () => {
  const [activeForm, setActiveForm] = useState<'deposit' | 'withdraw' | null>(null)

  const toggleForm = (formType: 'deposit' | 'withdraw') => {
    setActiveForm(activeForm === formType ? null : formType)
  }

  return (
    <div className="p-6 space-y-6 font-raleway">
      {/* Accordion-style Deposit and Withdraw */}
      <div className="space-y-3">
        {/* Deposit Accordion */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <button
            onClick={() => toggleForm('deposit')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-white/70" />
              <span className="text-white/90 font-medium">Deposit Funds</span>
            </div>
            {activeForm === 'deposit' ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/50" />
            )}
          </button>
          
          <div className={`transition-all duration-300 ease-out overflow-hidden ${
            activeForm === 'deposit' ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-4 border-t border-white/5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Asset</label>
                  <select className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:border-white/20 focus:outline-none transition-colors">
                    <option value="XLM">XLM - Stellar Lumens</option>
                    <option value="USDC">USDC - USD Coin</option>
                    <option value="BTC">BTC - Bitcoin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                  />
                </div>
                
                <div className="pt-2">
                  <button className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 hover:border-white/30">
                    Confirm Deposit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Withdraw Accordion */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <button
            onClick={() => toggleForm('withdraw')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <Minus className="w-5 h-5 text-white/70" />
              <span className="text-white/90 font-medium">Withdraw Funds</span>
            </div>
            {activeForm === 'withdraw' ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/50" />
            )}
          </button>
          
          <div className={`transition-all duration-300 ease-out overflow-hidden ${
            activeForm === 'withdraw' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-4 border-t border-white/5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Asset</label>
                  <select className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:border-white/20 focus:outline-none transition-colors">
                    <option value="XLM">XLM - Stellar Lumens</option>
                    <option value="USDC">USDC - USD Coin</option>
                    <option value="BTC">BTC - Bitcoin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">Destination Address</label>
                  <input
                    type="text"
                    placeholder="Enter wallet address"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                  />
                </div>
                
                <div className="pt-2">
                  <button className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 hover:border-white/30">
                    Confirm Withdrawal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-white/90 text-lg font-raleway">Recent Activity</h3>
        
        <div className="space-y-3">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Received XLM</p>
                    <p className="text-white/40 text-xs">2 hours ago</p>
                  </div>
                  <p className="text-white/90 text-sm font-medium">+100.00 XLM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Sent USDC</p>
                    <p className="text-white/40 text-xs">5 hours ago</p>
                  </div>
                  <p className="text-white/70 text-sm font-medium">-50.00 USDC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityTab