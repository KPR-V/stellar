'use client'
import { create } from 'zustand'

interface AddPairState {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useAddPair = create<AddPairState>((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}))
