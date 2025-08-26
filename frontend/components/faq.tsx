'use client'
import React, { useState } from 'react'
import { Minus, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react'

interface FAQModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FAQItem {
  q: string
  a: string
}

interface FAQCategory {
  questions: FAQItem[]
  checklist?: string[]
}

const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)

  const toggleCategory = (category: string) => {
    setActiveCategory(activeCategory === category ? null : category)
    setActiveQuestion(null) // Close any open questions when switching categories
  }

  const toggleQuestion = (question: string) => {
    setActiveQuestion(activeQuestion === question ? null : question)
  }

  const faqData: Record<string, FAQCategory> = {
    'Getting Started': {
      questions: [
        {
          q: 'What is this platform?',
          a: "We're a decentralized arbitrage trading platform built on Stellar that automatically finds and executes profitable trades across different markets. Think of it as an intelligent trading bot that works for everyone, governed by the community."
        },
        {
          q: 'Do I need trading experience to use this?',
          a: "No! Our smart contracts handle the complex trading logic. You just need to deposit funds and the system does the rest. However, understanding basic trading concepts will help you make better decisions."
        },
        {
          q: 'How do I get started?',
          a: "Simply connect your Stellar wallet (like Freighter), create your trading account, deposit some funds, and you're ready to go. The whole process takes less than 5 minutes."
        },
        {
          q: 'What wallet do I need?',
          a: "Any Stellar-compatible wallet works, but we recommend Freighter for the best experience. It's free, secure, and easy to use."
        }
      ],
      checklist: [
        'Install Freighter wallet',
        'Get some XLM for transaction fees',
        'Connect wallet to our platform',
        'Initialize your trading account (one-time setup)',
        'Deposit funds to start earning from arbitrage',
        'Monitor your performance in the dashboard',
        'Consider staking KALE tokens to participate in governance'
      ]
    },
    'Money & Trading': {
      questions: [
        {
          q: 'How much money do I need to start?',
          a: 'You can start with any amount, but we recommend at least 100 XLM to make meaningful profits after covering transaction fees.'
        },
        {
          q: 'How does arbitrage work?',
          a: 'Arbitrage means buying something cheap in one place and selling it for more somewhere else. Our platform automatically finds these price differences and executes trades to capture the profit.'
        },
        {
          q: 'What are the fees?',
          a: 'Fees are set by community governance and are typically very low (usually under 1%). You can view current fees in your dashboard.'
        },
        {
          q: 'How do I make money?',
          a: 'You earn profits from successful arbitrage trades executed by the platform. The more you deposit, the larger your share of the profits.'
        },
        {
          q: 'Can I lose money?',
          a: 'While arbitrage is generally low-risk, all trading involves some risk. Our Risk Manager contract helps protect you by enforcing safe trading limits and stopping trades if conditions become unfavorable.'
        }
      ]
    },
    'Technical Questions': {
      questions: [
        {
          q: 'What is "initialize user account"?',
          a: 'This is a one-time setup that creates your personal trading account within our smart contracts. It\'s like opening a bank account - you only do it once.'
        },
        {
          q: 'What happens if I disconnect my wallet during a transaction?',
          a: 'Don\'t worry! Stellar transactions are atomic, meaning they either complete fully or don\'t happen at all. You can always reconnect and check your account status.'
        },
        {
          q: 'Can I have multiple accounts?',
          a: 'Currently, each wallet address gets one trading account. If you want multiple accounts, you\'ll need multiple wallets.'
        },
        {
          q: 'What are smart contracts?',
          a: 'Think of them as automatic, tamper-proof programs that execute trades and manage funds without human intervention. They\'re like robot traders that never sleep and always follow the rules.'
        }
      ]
    },
    'Governance & DAO': {
      questions: [
        {
          q: 'What is the DAO?',
          a: 'DAO stands for Decentralized Autonomous Organization. It means the platform is controlled by its users (token holders) rather than a company. You can vote on changes and improvements.'
        },
        {
          q: 'How do I participate in governance?',
          a: 'Hold KALE tokens and stake them to gain voting power. Then you can vote on proposals and even create your own proposals for platform improvements.'
        },
        {
          q: 'What can the DAO decide?',
          a: 'The community can vote to change fees, add new trading pairs, modify risk settings, and upgrade the platform. Major decisions require community approval.'
        },
        {
          q: 'How do I get KALE tokens?',
          a: 'KALE tokens are earned through platform usage and can also be purchased. Active traders and early users typically receive more tokens.'
        }
      ]
    },
    'Safety & Security': {
      questions: [
        {
          q: 'Is my money safe?',
          a: 'Your funds are protected by audited smart contracts on the Stellar blockchain. The contracts have built-in safety mechanisms and are controlled by decentralized governance, not any single person or company.'
        },
        {
          q: 'What if the platform gets hacked?',
          a: 'Our smart contracts are audited and include emergency stop mechanisms. Additionally, funds are never held in centralized accounts - they\'re always in the secure blockchain contracts.'
        },
        {
          q: 'Can the team steal my money?',
          a: 'No. The contracts are decentralized and controlled by the DAO. Even the development team cannot access user funds or override the safety mechanisms.'
        },
        {
          q: 'What is the Risk Manager?',
          a: 'It\'s a smart contract that monitors all trades and enforces safety limits. It can stop trading if risks become too high, protecting all users automatically.'
        }
      ]
    },
    'Monitoring & Analytics': {
      questions: [
        {
          q: 'How do I track my performance?',
          a: 'Your dashboard shows real-time balances, trade history, profits/losses, and performance metrics. Everything is calculated from blockchain data.'
        },
        {
          q: 'Can I see what trades are being made?',
          a: 'Yes! All trades are public on the Stellar blockchain. You can view them in your dashboard or on Stellar\'s block explorer.'
        },
        {
          q: 'How often do arbitrage opportunities occur?',
          a: 'This varies with market conditions. During volatile periods, opportunities may occur every few minutes. During stable periods, they may be less frequent.'
        }
      ]
    },
    'Troubleshooting': {
      questions: [
        {
          q: 'My transaction failed. What do I do?',
          a: 'Check if you have enough XLM for transaction fees, ensure your wallet is connected, and try again. If problems persist, contact support.'
        },
        {
          q: 'I can\'t see my balance. Help!',
          a: 'Refresh your browser, reconnect your wallet, or check if your account is properly initialized. Balance updates can sometimes take a few seconds.'
        },
        {
          q: 'The platform says I need to initialize my account, but I already did.',
          a: 'Try refreshing the page. If the issue persists, there might have been a problem with the original transaction. Check your transaction history or contact support.'
        }
      ]
    },
    'Platform Status': {
      questions: [
        {
          q: 'Is this live on Stellar Mainnet?',
          a: 'Currently, we\'re running on Stellar Testnet for testing and development. Mainnet launch is planned after thorough testing and community approval.'
        },
        {
          q: 'When will new features be added?',
          a: 'Feature development is driven by community governance. Users can propose new features, and if they receive enough votes, they\'ll be implemented.'
        },
        {
          q: 'How can I stay updated?',
          a: 'Follow our social media channels, join our community Discord/Telegram, and check the governance section for upcoming proposals and updates.'
        }
      ]
    },
    'Support': {
      questions: [
        {
          q: 'Where can I get help?',
          a: 'Check this FAQ first, then visit our documentation, community forums, or Discord. For technical issues, you can also contact our development team directly.'
        },
        {
          q: 'Is there a mobile app?',
          a: 'Our web platform works great on mobile browsers. A dedicated mobile app may be developed in the future based on community demand.'
        },
        {
          q: 'Can I suggest improvements?',
          a: 'Absolutely! Create a governance proposal or share ideas in our community channels. This platform belongs to its users, and we value all feedback.'
        }
      ]
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-none flex items-center justify-center z-[9999] font-raleway">
      <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl w-[800px] h-[600px] overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/15 bg-black/20">
          <h2 className="text-white/90 font-raleway font-medium text-xl">
            Frequently Asked Questions
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white/90 transition-all duration-300 p-2 hover:bg-white/5 rounded-xl"
          >
            <Minus size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 bg-black/30 h-[500px] overflow-y-scroll faq-scrollbar">
          <div className="p-6 space-y-4">
            {Object.entries(faqData).map(([category, data]) => (
              <div key={category} className="bg-black/10 backdrop-blur-sm rounded-xl border border-white/15 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all duration-300"
                >
                  <span className="text-white/90 font-medium text-lg">{category}</span>
                  {activeCategory === category ? (
                    <ChevronDown className="w-5 h-5 text-white/50" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white/50" />
                  )}
                </button>

                {/* Category Content */}
                <div className={`transition-all duration-300 ease-out overflow-hidden ${
                  activeCategory === category ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="border-t border-white/5">
                    {/* Quick Start Checklist (only for Getting Started) */}
                    {category === 'Getting Started' && data.checklist && (
                      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/5">
                        <button
                          onClick={() => toggleQuestion('checklist')}
                          className="w-full flex items-center justify-between text-left hover:bg-white/5 rounded-lg p-3 transition-all duration-300"
                        >
                          <span className="text-blue-300 font-medium">🎯 Quick Start Checklist</span>
                          {activeQuestion === 'checklist' ? (
                            <ChevronDown className="w-4 h-4 text-blue-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-blue-300" />
                          )}
                        </button>
                        
                        <div className={`transition-all duration-300 ease-out overflow-hidden ${
                          activeQuestion === 'checklist' ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
                        }`}>
                          <div className="space-y-2 pl-6">
                            {data.checklist.map((item, index) => (
                              <div key={index} className="flex items-center gap-3 py-1">
                                <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <span className="text-white/80 text-sm">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Questions */}
                    <div className="space-y-1 p-4">
                      {data.questions.map((item, index) => (
                        <div key={index} className="border border-white/5 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleQuestion(`${category}-${index}`)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-all duration-300"
                          >
                            <span className="text-white/80 text-sm font-medium pr-4">{item.q}</span>
                            {activeQuestion === `${category}-${index}` ? (
                              <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                            )}
                          </button>
                          
                          <div className={`transition-all duration-300 ease-out overflow-hidden ${
                            activeQuestion === `${category}-${index}` ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          }`}>
                            <div className="p-3 pt-0 border-t border-white/5">
                              <p className="text-white/70 text-sm leading-relaxed">{item.a}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FAQModal