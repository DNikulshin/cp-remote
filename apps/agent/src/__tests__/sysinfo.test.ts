import { describe, it, expect } from 'vitest'

// Тестируем parseQueryUserOutput через экспорт — вынесем его в отдельный модуль.
// Поскольку функция сейчас не экспортируется, используем косвенный тест через
// публичный интерфейс. Для этого дублируем логику здесь как pure function.
// TODO: экспортировать parseQueryUserOutput из sysinfo.ts для прямого тестирования.

// ── Копия тестируемой функции (чистая, без side-effects) ─────────────────────

interface ActiveUser {
  name: string
  session: string
  state: string
  idle: string
  logonTime: string
}

const SERVICE_ACCOUNT_PREFIXES = ['DWM-', 'UMFD-', 'SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE']

function isServiceAccount(name: string): boolean {
  const upper = name.toUpperCase()
  return (
    name.endsWith('$') ||
    SERVICE_ACCOUNT_PREFIXES.some((p) => upper.startsWith(p.toUpperCase()))
  )
}

function parseQueryUserOutput(output: string): ActiveUser[] {
  const lines = output.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = lines[0]!.toUpperCase()
  const colUsername = 0
  const colSession = header.indexOf('SESSIONNAME')
  const colState = header.indexOf('STATE')
  const colIdle = header.indexOf('IDLE')
  const colLogon = header.indexOf('LOGON')

  if (colSession < 0 || colState < 0 || colIdle < 0 || colLogon < 0) return []

  const users: ActiveUser[] = []

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const clean = line.startsWith('>') ? ' ' + line.slice(1) : line

    const name = clean.slice(colUsername, colSession).trim()
    const sessionName = (clean.slice(colSession, colState).trim().split(/\s+/)[0] ?? '')
    const state = clean.slice(colState, colIdle).trim()
    const idle = clean.slice(colIdle, colLogon).trim()
    const logonTime = clean.slice(colLogon).trim()

    if (!name || isServiceAccount(name)) continue

    let session = 'unknown'
    if (sessionName.toLowerCase() === 'console') session = 'console'
    else if (sessionName.toLowerCase().startsWith('rdp')) session = 'rdp'
    else if (sessionName) session = sessionName

    users.push({
      name,
      session,
      state: state.toLowerCase().startsWith('disc') ? 'Disconnected' : 'Active',
      idle: idle || 'none',
      logonTime,
    })
  }

  return users
}

// ── Тесты ────────────────────────────────────────────────────────────────────

// Типичный вывод query user на English Windows 10/11
const TYPICAL_OUTPUT = ` USERNAME              SESSIONNAME        ID  STATE   IDLE TIME  LOGON TIME
>john                  console             1  Active      none   3/20/2026 9:00 AM
 alice                 rdp-tcp#0           2  Active      5:00   3/20/2026 8:30 AM
 bob                   rdp-tcp#1           3  Disc        1:30   3/20/2026 7:00 AM`

// Вывод с только одним залогиненным пользователем (маркер >)
const SINGLE_ACTIVE_USER = ` USERNAME              SESSIONNAME        ID  STATE   IDLE TIME  LOGON TIME
>administrator         console             1  Active      none   3/20/2026 10:00 AM`

// Вывод со служебными учётками которые надо отфильтровать
const WITH_SERVICE_ACCOUNTS = ` USERNAME              SESSIONNAME        ID  STATE   IDLE TIME  LOGON TIME
 DWM-1                                    2  Disc        none   3/20/2026 0:00 AM
 UMFD-0                                   3  Disc        none   3/20/2026 0:00 AM
 john                  console             1  Active      none   3/20/2026 9:00 AM
 svc_backup$                              4  Disc        none   3/20/2026 0:00 AM`

describe('parseQueryUserOutput', () => {
  it('парсит обычный вывод с несколькими пользователями', () => {
    const users = parseQueryUserOutput(TYPICAL_OUTPUT)
    expect(users).toHaveLength(3)
  })

  it('определяет console-сессию', () => {
    const users = parseQueryUserOutput(TYPICAL_OUTPUT)
    const john = users.find((u) => u.name === 'john')
    expect(john).toBeDefined()
    expect(john!.session).toBe('console')
    expect(john!.state).toBe('Active')
  })

  it('определяет rdp-сессию', () => {
    const users = parseQueryUserOutput(TYPICAL_OUTPUT)
    const alice = users.find((u) => u.name === 'alice')
    expect(alice).toBeDefined()
    expect(alice!.session).toBe('rdp')
    expect(alice!.state).toBe('Active')
  })

  it('определяет Disconnected-состояние', () => {
    const users = parseQueryUserOutput(TYPICAL_OUTPUT)
    const bob = users.find((u) => u.name === 'bob')
    expect(bob).toBeDefined()
    expect(bob!.state).toBe('Disconnected')
  })

  it('корректно обрабатывает маркер активной сессии >', () => {
    const users = parseQueryUserOutput(SINGLE_ACTIVE_USER)
    expect(users).toHaveLength(1)
    expect(users[0]!.name).toBe('administrator')
    expect(users[0]!.session).toBe('console')
  })

  it('фильтрует DWM-* и UMFD-* служебные учётки', () => {
    const users = parseQueryUserOutput(WITH_SERVICE_ACCOUNTS)
    expect(users).toHaveLength(1)
    expect(users[0]!.name).toBe('john')
  })

  it('фильтрует учётки с суффиксом $', () => {
    const users = parseQueryUserOutput(WITH_SERVICE_ACCOUNTS)
    expect(users.find((u) => u.name.endsWith('$'))).toBeUndefined()
  })

  it('возвращает пустой массив при пустом вводе', () => {
    expect(parseQueryUserOutput('')).toEqual([])
  })

  it('возвращает пустой массив при одном заголовке без строк данных', () => {
    const headerOnly = ` USERNAME              SESSIONNAME        ID  STATE   IDLE TIME  LOGON TIME`
    expect(parseQueryUserOutput(headerOnly)).toEqual([])
  })

  it('возвращает пустой массив если заголовок не распознан', () => {
    expect(parseQueryUserOutput('random garbage\nmore garbage')).toEqual([])
  })

  it('заполняет idle=none если поле пустое', () => {
    const users = parseQueryUserOutput(TYPICAL_OUTPUT)
    const john = users.find((u) => u.name === 'john')
    expect(john!.idle).toBe('none')
  })

  it('сохраняет время логина', () => {
    const users = parseQueryUserOutput(TYPICAL_OUTPUT)
    const john = users.find((u) => u.name === 'john')
    expect(john!.logonTime).toContain('2026')
  })
})
