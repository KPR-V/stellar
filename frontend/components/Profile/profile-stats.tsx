import React from 'react'

const ProfileStats = () => {
  return (
    <div className="p-6 space-y-6 font-raleway">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-sm font-medium mb-2">Total Balance</h4>
          <p className="text-3xl font-light text-white/95 font-raleway">$0.00</p>
          <p className="text-xs text-white/40 mt-2">+0.00% (24h)</p>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-sm font-medium mb-2">Total Assets</h4>
          <p className="text-3xl font-light text-white/95 font-raleway">0</p>
          <p className="text-xs text-white/40 mt-2">Across all networks</p>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
        <h4 className="text-white/60 text-sm font-medium mb-4">Portfolio Breakdown</h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
            <span className="text-white/70 text-sm font-medium">XLM</span>
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm">0.00</span>
              <span className="text-white/40 text-xs bg-white/5 px-2 py-1 rounded-full">0%</span>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
            <span className="text-white/70 text-sm font-medium">USDC</span>
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm">0.00</span>
              <span className="text-white/40 text-xs bg-white/5 px-2 py-1 rounded-full">0%</span>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
            <span className="text-white/70 text-sm font-medium">BTC</span>
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm">0.00</span>
              <span className="text-white/40 text-xs bg-white/5 px-2 py-1 rounded-full">0%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-xs font-medium mb-1">24h Change</h4>
          <p className="text-lg font-light text-green-400">+0.00%</p>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-xs font-medium mb-1">Total Transactions</h4>
          <p className="text-lg font-light text-white/95">0</p>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-xs font-medium mb-1">Active Positions</h4>
          <p className="text-lg font-light text-white/95">0</p>
        </div>
      </div>
    </div>
  )
}

export default ProfileStats