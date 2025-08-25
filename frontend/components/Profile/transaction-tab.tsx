import React from 'react'
import { Receipt, Filter } from 'lucide-react'

const TransactionTab = () => {
  return (
    <div className="p-6 space-y-6 font-raleway">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white/90 text-lg font-raleway">Transaction History</h3>
        <button className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white/70 hover:text-white/90 transition-all duration-300 hover:border-white/20 text-xs flex items-center gap-2">
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>
      
      {/* Empty state for now - you can replace this with actual transaction data */}
      <div className="bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
        <Receipt className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <div className="text-white/50 text-sm font-medium">No transactions to display</div>
        <p className="text-white/30 text-xs mt-2">Your transaction history will appear here</p>
      </div>

      {/* Sample transaction structure - uncomment when you have data */}
      
      <div className="space-y-3">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-white/80 text-sm font-medium">Payment Sent</p>
              <p className="text-white/40 text-xs">Transaction ID: 1a2b3c4d...</p>
            </div>
            <span className="text-red-400 text-sm font-medium">-50.00 XLM</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/40">Jan 15, 2024 2:30 PM</span>
            <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Confirmed</span>
          </div>
        </div>
      </div>
     
    </div>
  )
}

export default TransactionTab