import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { api, BASE, registerUser } from './helpers.js'
import { randomUUID } from 'crypto'
import { io as socketClient } from 'socket.io-client'

describe('Devices API', () => {
  let accessToken: string
  let deviceId: string
  let deviceSecret: string

  // Регистрируем юзера один раз для всего suite
  beforeAll(async () => {
    const user = await registerUser()
    accessToken = user.accessToken
  })

  // ─── /api/devices/init (публичный) ────────────────────────────────────────

  describe('POST /api/devices/init', () => {
    it('201 — агент регистрирует устройство', async () => {
      deviceId = randomUUID()
      const { status, body } = await api('/api/devices/init', {
        method: 'POST',
        body: JSON.stringify({ deviceId, timezone: 'Europe/Moscow' }),
      })
      expect(status).toBe(201)
      const b = body as Record<string, unknown>
      expect(b).toMatchObject({ deviceId, secret: expect.any(String) })
      deviceSecret = b['secret'] as string
    })

    it('400 — без deviceId', async () => {
      const { status } = await api('/api/devices/init', {
        method: 'POST',
        body: JSON.stringify({ timezone: 'UTC' }),
      })
      expect(status).toBe(400)
    })

    it('409 — повторная инициализация того же deviceId', async () => {
      const { status } = await api('/api/devices/init', {
        method: 'POST',
        body: JSON.stringify({ deviceId, timezone: 'UTC' }),
      })
      expect(status).toBe(409)
    })
  })

  // ─── /api/devices/bind ────────────────────────────────────────────────────

  describe('POST /api/devices/bind', () => {
    it('201 — привязывает устройство к юзеру', async () => {
      const { status, body } = await api('/api/devices/bind', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ deviceId, secret: deviceSecret, name: 'Test PC' }),
      })
      expect(status).toBe(201)
      const b = body as { device: { id: string } }
      expect(b.device.id).toBe(deviceId)
    })

    it('401 — без токена', async () => {
      const { status } = await api('/api/devices/bind', {
        method: 'POST',
        body: JSON.stringify({ deviceId: randomUUID(), secret: 'any', name: 'X' }),
      })
      expect(status).toBe(401)
    })

    it('403 — неверный secret', async () => {
      const newId = randomUUID()
      await api('/api/devices/init', {
        method: 'POST',
        body: JSON.stringify({ deviceId: newId }),
      })
      const { status } = await api('/api/devices/bind', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ deviceId: newId, secret: 'a'.repeat(32), name: 'X' }),
      })
      expect(status).toBe(403)
    })
  })

  // ─── GET /api/devices ─────────────────────────────────────────────────────

  describe('GET /api/devices', () => {
    it('200 — возвращает список устройств юзера', async () => {
      const { status, body } = await api('/api/devices', { token: accessToken })
      expect(status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      const list = body as Array<{ id: string }>
      expect(list.some((d) => d.id === deviceId)).toBe(true)
    })

    it('401 — без токена', async () => {
      const { status } = await api('/api/devices')
      expect(status).toBe(401)
    })
  })

  // ─── GET /api/devices/:id ─────────────────────────────────────────────────

  describe('GET /api/devices/:id', () => {
    it('200 — возвращает устройство', async () => {
      const { status, body } = await api(`/api/devices/${deviceId}`, {
        token: accessToken,
      })
      expect(status).toBe(200)
      const b = body as Record<string, unknown>
      expect(b['id']).toBe(deviceId)
      // secret и agentToken не должны утекать
      expect(b['secret']).toBeUndefined()
      expect(b['agentToken']).toBeUndefined()
    })

    it('404 — несуществующий id', async () => {
      const { status } = await api(`/api/devices/${randomUUID()}`, {
        token: accessToken,
      })
      expect(status).toBe(404)
    })
  })

  // ─── POST /api/devices/:id/commands ───────────────────────────────────────

  describe('POST /api/devices/:id/commands', () => {
    it('202 — команда принята', async () => {
      const { status, body } = await api(`/api/devices/${deviceId}/commands`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ type: 'LOCK' }),
      })
      expect(status).toBe(202)
      const b = body as { command: { id: string; type: string; status: string }; delivered: boolean }
      expect(b.command).toMatchObject({ id: expect.any(String), type: 'LOCK' })
      expect(typeof b.delivered).toBe('boolean')
    })

    it('400 — неизвестный тип команды', async () => {
      const { status } = await api(`/api/devices/${deviceId}/commands`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ type: 'UNKNOWN_CMD' }),
      })
      expect(status).toBe(400)
    })
  })

  // ─── GET /api/devices/:id/commands ────────────────────────────────────────

  describe('GET /api/devices/:id/commands', () => {
    it('200 — возвращает историю команд', async () => {
      const { status, body } = await api(`/api/devices/${deviceId}/commands`, {
        token: accessToken,
      })
      expect(status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
    })
  })

  // ─── DELETE /api/devices/:id ──────────────────────────────────────────────

  describe('DELETE /api/devices/:id', () => {
    it('204 — удаляет устройство', async () => {
      // Создаём отдельное устройство специально для удаления
      const tempId = randomUUID()
      const initRes = await api('/api/devices/init', {
        method: 'POST',
        body: JSON.stringify({ deviceId: tempId }),
      })
      const { secret } = initRes.body as { secret: string }
      await api('/api/devices/bind', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ deviceId: tempId, secret, name: 'Temp PC' }),
      })

      const { status } = await api(`/api/devices/${tempId}`, {
        method: 'DELETE',
        token: accessToken,
      })
      expect(status).toBe(204)
    })

    it('404 — удаление чужого/несуществующего устройства', async () => {
      const { status } = await api(`/api/devices/${randomUUID()}`, {
        method: 'DELETE',
        token: accessToken,
      })
      expect(status).toBe(404)
    })
  })

  // ─── WebSocket: agent heartbeat с activeUsers ─────────────────────────────

  describe('WebSocket /agents — heartbeat с activeUsers', () => {
    let agentToken: string
    let wsDeviceId: string

    beforeAll(async () => {
      // Регистрируем новое устройство специально для WS-теста
      wsDeviceId = randomUUID()
      const initRes = await api('/api/devices/init', {
        method: 'POST',
        body: JSON.stringify({ deviceId: wsDeviceId, timezone: 'UTC' }),
      })
      const { secret } = initRes.body as { secret: string }
      const bindRes = await api('/api/devices/bind', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ deviceId: wsDeviceId, secret, name: 'WS Test PC' }),
      })
      agentToken = (bindRes.body as { agentToken: string }).agentToken
    })

    it('агент подключается и хартбит обновляет activeUsers', async () => {
      const users = [
        { name: 'TestUser', session: 'console', state: 'Active', idle: 'none', logonTime: '10:00 AM' },
        { name: 'RemoteUser', session: 'rdp', state: 'Active', idle: '5m', logonTime: '09:30 AM' },
      ]

      await new Promise<void>((resolve, reject) => {
        const socket = socketClient(`${BASE}/agents`, {
          auth: { token: agentToken },
          transports: ['websocket'],
        })

        const timeout = setTimeout(() => {
          socket.disconnect()
          reject(new Error('WebSocket connection timed out'))
        }, 8000)

        socket.on('connect', () => {
          socket.emit('agent:heartbeat', {
            deviceId: wsDeviceId,
            timestamp: new Date().toISOString(),
            cpuPercent: 55,
            ramPercent: 70,
            uptime: 3600,
            agentVersion: '0.0.1',
            activeUsers: users,
          })
          // Даём серверу время обработать
          setTimeout(() => {
            clearTimeout(timeout)
            socket.disconnect()
            resolve()
          }, 500)
        })

        socket.on('connect_error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })
      })

      // Проверяем что данные сохранились в БД
      const { body } = await api(`/api/devices/${wsDeviceId}`, { token: accessToken })
      const device = body as {
        cpuPercent: number
        activeUsers: typeof users
        status: string
      }

      expect(device.cpuPercent).toBe(55)
      expect(device.activeUsers).toHaveLength(2)
      expect(device.activeUsers[0]).toMatchObject({ name: 'TestUser', session: 'console' })
      expect(device.activeUsers[1]).toMatchObject({ name: 'RemoteUser', session: 'rdp' })
    })
  })
})
