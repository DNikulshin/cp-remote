import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    const token = await SecureStore.getItemAsync('accessToken')
    set({ isAuthenticated: !!token, isLoading: false })
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    await SecureStore.setItemAsync('accessToken', data.accessToken)
    await SecureStore.setItemAsync('refreshToken', data.refreshToken)
    set({ isAuthenticated: true })
  },

  register: async (email, password) => {
    const { data } = await api.post('/auth/register', { email, password })
    await SecureStore.setItemAsync('accessToken', data.accessToken)
    await SecureStore.setItemAsync('refreshToken', data.refreshToken)
    set({ isAuthenticated: true })
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken')
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {})
    }
    await SecureStore.deleteItemAsync('accessToken')
    await SecureStore.deleteItemAsync('refreshToken')
    set({ isAuthenticated: false })
  },
}))
