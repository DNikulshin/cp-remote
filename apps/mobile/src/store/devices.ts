import { create } from 'zustand'
import { api } from '../api/client'

export interface ActiveUser {
  name: string
  session: string   // 'console' | 'rdp' | 'unknown'
  state: string     // 'Active' | 'Disconnected'
  idle: string
  logonTime: string
}

export interface Device {
  id: string
  name: string
  status: 'online' | 'offline' | 'away'
  lastSeenAt: string | null
  cpuPercent: number | null
  ramPercent: number | null
  uptime: number | null
  activeUsers: ActiveUser[]
  agentVersion: string | null
  timezone: string
}

interface DevicesState {
  devices: Device[]
  isLoading: boolean
  error: string | null
  fetchDevices: () => Promise<void>
  sendCommand: (deviceId: string, type: string, delaySeconds?: number) => Promise<{ delivered: boolean }>
  bindDevice: (deviceId: string, secret: string, name: string) => Promise<void>
  deleteDevice: (deviceId: string) => Promise<void>
}

export const useDevicesStore = create<DevicesState>((set) => ({
  devices: [],
  isLoading: false,
  error: null,

  fetchDevices: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get<Device[]>('/devices')
      set({ devices: data, isLoading: false })
    } catch {
      set({ error: 'Не удалось загрузить устройства', isLoading: false })
    }
  },

  sendCommand: async (deviceId, type, delaySeconds = 0) => {
    const { data } = await api.post(`/devices/${deviceId}/commands`, { type, delaySeconds })
    return { delivered: data.delivered }
  },

  bindDevice: async (deviceId, secret, name) => {
    await api.post('/devices/bind', {
      deviceId,
      secret,
      name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    const { data } = await api.get<Device[]>('/devices')
    set({ devices: data })
  },

  deleteDevice: async (deviceId) => {
    await api.delete(`/devices/${deviceId}`)
    set((s) => ({ devices: s.devices.filter((d) => d.id !== deviceId) }))
  },
}))
