import { log as logger } from '../utils/logger.js'
import { setPendingLock } from '../local-server.js'
import { isCurrentTimeAllowed } from './checker.js'

const CHECK_INTERVAL_MS = 60_000 // проверяем каждую минуту
let enforcerTimer: NodeJS.Timeout | null = null

function lockSession(reason: string) {
  logger.warn({ reason }, 'Locking session — outside allowed time')

  if (process.platform !== 'win32') {
    logger.info('[DEV MODE] Would lock session')
    return
  }

  // LockWorkStation не работает из session 0 (сервис) — делегируем трею через /status pendingLock
  setPendingLock()
}

export function startEnforcer() {
  stopEnforcer()

  logger.info('Schedule enforcer started')

  const check = () => {
    const allowed = isCurrentTimeAllowed()
    if (!allowed) {
      lockSession('Schedule check failed')
    }
  }

  // Проверяем сразу при старте (защита после перезагрузки)
  check()

  enforcerTimer = setInterval(check, CHECK_INTERVAL_MS)
}

export function stopEnforcer() {
  if (enforcerTimer) {
    clearInterval(enforcerTimer)
    enforcerTimer = null
  }
}