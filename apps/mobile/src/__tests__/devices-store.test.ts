import { __clearStore } from '../__mocks__/expo-secure-store'

jest.mock('expo-secure-store')

// Мокируем axios инстанс напрямую — не делаем реальных HTTP запросов
jest.mock('../api/client', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: 'http://localhost:3000/api' },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  }
  return { api: mockApi, API_URL: 'http://localhost:3000', DEFAULT_API_URL: 'http://localhost:3000' }
})

import type { ActiveUser } from '../store/devices'

const mockDevice = {
  id: 'device-uuid-001',
  name: 'My PC',
  status: 'online' as const,
  lastSeenAt: '2026-03-20T10:00:00Z',
  cpuPercent: 45,
  ramPercent: 60,
  uptime: 3600,
  activeUsers: [] as ActiveUser[],
  agentVersion: '0.0.1',
  timezone: 'Europe/Moscow',
}

describe('useDevicesStore', () => {
  let api: ReturnType<typeof jest.fn>

  beforeEach(() => {
    __clearStore()
    // Получаем замоканный api из модуля
    api = require('../api/client').api
    jest.clearAllMocks()
    // Сбрасываем стор перед каждым тестом
    jest.resetModules()
  })

  describe('fetchDevices', () => {
    it('заполняет devices при успешном ответе', async () => {
      const { api: mockApi } = require('../api/client')
      mockApi.get.mockResolvedValueOnce({ data: [mockDevice] })

      const { useDevicesStore } = require('../store/devices')
      const store = useDevicesStore.getState()
      await store.fetchDevices()

      const { devices, isLoading, error } = useDevicesStore.getState()
      expect(devices).toHaveLength(1)
      expect(devices[0].id).toBe('device-uuid-001')
      expect(isLoading).toBe(false)
      expect(error).toBeNull()
    })

    it('устанавливает error при сетевой ошибке', async () => {
      const { api: mockApi } = require('../api/client')
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'))

      const { useDevicesStore } = require('../store/devices')
      const store = useDevicesStore.getState()
      await store.fetchDevices()

      const { devices, error, isLoading } = useDevicesStore.getState()
      expect(devices).toHaveLength(0)
      expect(error).toBeTruthy()
      expect(isLoading).toBe(false)
    })
  })

  describe('sendCommand', () => {
    it('возвращает delivered:true если сервер подтвердил', async () => {
      const { api: mockApi } = require('../api/client')
      mockApi.post.mockResolvedValueOnce({ data: { delivered: true } })

      const { useDevicesStore } = require('../store/devices')
      const result = await useDevicesStore.getState().sendCommand('device-uuid-001', 'LOCK')
      expect(result.delivered).toBe(true)
    })

    it('передаёт delaySeconds в тело запроса', async () => {
      const { api: mockApi } = require('../api/client')
      mockApi.post.mockResolvedValueOnce({ data: { delivered: false } })

      const { useDevicesStore } = require('../store/devices')
      await useDevicesStore.getState().sendCommand('device-uuid-001', 'SHUTDOWN', 60)

      expect(mockApi.post).toHaveBeenCalledWith(
        '/devices/device-uuid-001/commands',
        { type: 'SHUTDOWN', delaySeconds: 60 }
      )
    })
  })

  describe('deleteDevice', () => {
    it('удаляет устройство из локального стора', async () => {
      const { api: mockApi } = require('../api/client')
      // Сначала заполним стор
      mockApi.get.mockResolvedValueOnce({ data: [mockDevice] })
      mockApi.delete.mockResolvedValueOnce({})

      const { useDevicesStore } = require('../store/devices')
      await useDevicesStore.getState().fetchDevices()
      expect(useDevicesStore.getState().devices).toHaveLength(1)

      await useDevicesStore.getState().deleteDevice('device-uuid-001')
      expect(useDevicesStore.getState().devices).toHaveLength(0)
    })
  })

  describe('ActiveUser структура в Device', () => {
    it('device.activeUsers корректно принимает ActiveUser[]', async () => {
      const users: ActiveUser[] = [
        { name: 'john', session: 'console', state: 'Active', idle: 'none', logonTime: '10:00 AM' },
        { name: 'alice', session: 'rdp', state: 'Disconnected', idle: '5m', logonTime: '09:00 AM' },
      ]
      const { api: mockApi } = require('../api/client')
      mockApi.get.mockResolvedValueOnce({
        data: [{ ...mockDevice, activeUsers: users }],
      })

      const { useDevicesStore } = require('../store/devices')
      await useDevicesStore.getState().fetchDevices()

      const [device] = useDevicesStore.getState().devices
      expect(device.activeUsers).toHaveLength(2)
      expect(device.activeUsers[0]).toMatchObject({ name: 'john', session: 'console', state: 'Active' })
      expect(device.activeUsers[1]).toMatchObject({ name: 'alice', session: 'rdp', state: 'Disconnected' })
    })
  })
})
