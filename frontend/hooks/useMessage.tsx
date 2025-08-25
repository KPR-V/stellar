'use client'
import { useState, useCallback } from 'react'

interface MessageState {
  message: string
  isVisible: boolean
}

export const useMessage = () => {
  const [messageState, setMessageState] = useState<MessageState>({
    message: '',
    isVisible: false
  })

  const showMessage = useCallback((message: string) => {
    setMessageState({
      message,
      isVisible: true
    })
  }, [])

  const hideMessage = useCallback(() => {
    setMessageState(prev => ({
      ...prev,
      isVisible: false
    }))
  }, [])

  return {
    messageState,
    showMessage,
    hideMessage
  }
}