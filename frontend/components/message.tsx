'use client'
import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface MessageProps {
  message: string
  isVisible: boolean
  onClose: () => void
  duration?: number
}

const Message: React.FC<MessageProps> = ({ 
  message, 
  isVisible, 
  onClose,
  duration = 5000 
}) => {
  const [progress, setProgress] = useState(0)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (duration / 50))
        if (newProgress >= 100) {
          setIsAnimatingOut(true)
          setTimeout(() => {
            onClose()
            setIsAnimatingOut(false)
          }, 300)
          return 100
        }
        return newProgress
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  return (
    <div className={`
      fixed bottom-6 right-6 z-[99999] font-raleway
      transform transition-all duration-300 ease-out
      ${isVisible && !isAnimatingOut 
        ? 'translate-x-0 opacity-100' 
        : 'translate-x-full opacity-0'
      }
    `}>
      <div className="
        bg-black/80 backdrop-blur-sm border border-white/10
        rounded-xl shadow-2xl w-80 max-w-[90vw] relative overflow-hidden
      ">
        {/* Message Content */}
        <div className="flex items-start justify-between p-4">
          <p className="text-white/90 text-sm font-medium leading-relaxed flex-1 pr-2">
            {message}
          </p>
          
          {/* Close Button */}
          <button
            onClick={() => {
              setIsAnimatingOut(true)
              setTimeout(() => {
                onClose()
                setIsAnimatingOut(false)
              }, 300)
            }}
            className="text-white/50 hover:text-white/90 transition-colors duration-200 p-1 hover:bg-white/5 rounded-md flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-white/60 to-white/80 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default Message