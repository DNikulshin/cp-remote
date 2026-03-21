jest.mock('expo-secure-store')

import * as SecureStore from 'expo-secure-store'
import { __clearStore } from '../__mocks__/expo-secure-store'
import { setServerUrl, loadServerUrl, api, DEFAULT_API_URL } from '../api/client'

beforeEach(() => {
  __clearStore()
  jest.clearAllMocks()
  // Восстанавливаем baseURL к дефолту перед каждым тестом
  api.defaults.baseURL = `${DEFAULT_API_URL}/api`
})

describe('setServerUrl', () => {
  it('убирает trailing slash из URL', async () => {
    await setServerUrl('http://192.168.1.5:3000/')
    expect(api.defaults.baseURL).toBe('http://192.168.1.5:3000/api')
  })

  it('сохраняет URL в SecureStore', async () => {
    await setServerUrl('http://192.168.1.10:3000')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('serverUrl', 'http://192.168.1.10:3000')
  })

  it('обновляет baseURL у axios инстанса', async () => {
    await setServerUrl('http://10.0.0.1:3000')
    expect(api.defaults.baseURL).toBe('http://10.0.0.1:3000/api')
  })
})

describe('loadServerUrl', () => {
  it('восстанавливает URL из SecureStore при старте', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('http://saved-server:3000')
    await loadServerUrl()
    expect(api.defaults.baseURL).toBe('http://saved-server:3000/api')
  })

  it('оставляет дефолтный URL если в SecureStore ничего нет', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
    await loadServerUrl()
    expect(api.defaults.baseURL).toBe(`${DEFAULT_API_URL}/api`)
  })
})
