import { createLogger, format, transports } from 'winston'
import path from 'node:path'
import os from 'node:os'

const logDir = process.env.NODE_ENV === 'production'
  ? path.join(os.homedir(), 'AppData', 'Roaming', 'pc-remote-agent', 'logs')
  : './logs'

const prettyFormat = format.printf(({ timestamp, level, message, ...meta }) => {
  const msg = typeof message === 'object'
    ? JSON.stringify(message)
    : String(message)

  const { splat: _splat, ...rest } = meta as Record<string, unknown> & { splat?: unknown }
  const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : ''

  return `${String(timestamp)} [${level}]: ${msg}${extra}`
})

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    prettyFormat,
  ),
  transports: [
    new transports.File({
      filename: path.join(logDir, 'agent.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
      tailable: true,
    }),
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new transports.Console({
          format: format.combine(
            format.colorize(),
            prettyFormat,
          ),
        })]
      : []),
  ],
})

type LogMeta = Record<string, unknown>

function formatArgs(
  msgOrMeta: string | LogMeta,
  maybeMsg?: string
): { message: string; meta: LogMeta } {
  if (typeof msgOrMeta === 'string') {
    return { message: msgOrMeta, meta: {} }
  }
  return { message: maybeMsg ?? '', meta: msgOrMeta }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerAny = logger as any

export const log = {
  info: (msgOrMeta: string | LogMeta, msg?: string) => {
    const { message, meta } = formatArgs(msgOrMeta, msg)
    Object.keys(meta).length
      ? loggerAny.info(message, meta)
      : loggerAny.info(message)
  },
  warn: (msgOrMeta: string | LogMeta, msg?: string) => {
    const { message, meta } = formatArgs(msgOrMeta, msg)
    Object.keys(meta).length
      ? loggerAny.warn(message, meta)
      : loggerAny.warn(message)
  },
  error: (msgOrMeta: string | LogMeta, msg?: string) => {
    const { message, meta } = formatArgs(msgOrMeta, msg)
    Object.keys(meta).length
      ? loggerAny.error(message, meta)
      : loggerAny.error(message)
  },
  debug: (msgOrMeta: string | LogMeta, msg?: string) => {
    const { message, meta } = formatArgs(msgOrMeta, msg)
    Object.keys(meta).length
      ? loggerAny.debug(message, meta)
      : loggerAny.debug(message)
  },
}