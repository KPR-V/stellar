'use client'
import { create } from 'zustand'

interface RebalanceState {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useRebalance = create<RebalanceState>((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}))
