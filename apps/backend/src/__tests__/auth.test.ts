import { describe, it, expect, beforeAll } from 'vitest'
import { api, uniqueEmail, registerUser } from './helpers.js'

describe('Auth API', () => {
  // ─── /register ────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('201 — регистрирует нового юзера', async () => {
      const { status, body } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: uniqueEmail(), password: 'Test1234' }),
      })
      expect(status).toBe(201)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
    })

    it('401 — дубликат email (сервер не раскрывает что email занят)', async () => {
      const email = uniqueEmail()
      await registerUser(email)
      const { status, body } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'Test1234' }),
      })
      expect(status).toBe(401)
      expect(body).toMatchObject({ error: expect.any(String) })
    })

    it('400 — невалидное тело', async () => {
      const { status } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email', password: '123' }),
      })
      expect(status).toBe(400)
    })
  })

  // ─── /login ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    let email: string
    beforeAll(async () => {
      const u = await registerUser()
      email = u.email
    })

    it('200 — успешный логин', async () => {
      const { status, body } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'Test1234' }),
      })
      expect(status).toBe(200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
    })

    it('401 — неверный пароль', async () => {
      const { status } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'WrongPass1' }),
      })
      expect(status).toBe(401)
    })

    it('401 — несуществующий email', async () => {
      const { status } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: uniqueEmail(), password: 'Test1234' }),
      })
      expect(status).toBe(401)
    })
  })

  // ─── /refresh ─────────────────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('200 — возвращает новые токены', async () => {
      const { refreshToken } = await registerUser()
      const { status, body } = await api('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
      expect(status).toBe(200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
    })

    it('401 — невалидный refresh token', async () => {
      const { status } = await api('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'invalid.token.here' }),
      })
      expect(status).toBe(401)
    })
  })

  // ─── /logout ──────────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('204 — успешный logout', async () => {
      const { accessToken, refreshToken } = await registerUser()
      const { status } = await api('/api/auth/logout', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ refreshToken }),
      })
      expect(status).toBe(204)
    })

    it('401 — без access токена', async () => {
      const { refreshToken } = await registerUser()
      const { status } = await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
      expect(status).toBe(401)
    })
  })

  // ─── /logout-all ──────────────────────────────────────────────────────────

  describe('POST /api/auth/logout-all', () => {
    it('204 — разлогинивает все сессии', async () => {
      const { accessToken } = await registerUser()
      const { status } = await api('/api/auth/logout-all', {
        method: 'POST',
        token: accessToken,
      })
      expect(status).toBe(204)
    })
  })
})
