import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { log as logger } from '../utils/logger.js'
import type { WeeklySchedule } from '@pc-remote/shared'

const SCHEDULE_PATH = process.env.NODE_ENV === 'production'
  ? path.join(os.homedir(), 'AppData', 'Roaming', 'pc-remote-agent', 'schedule.json')
  : path.join(process.cwd(), '.agent-schedule.json')

let currentSchedule: WeeklySchedule | null = null

export function loadSchedule(): WeeklySchedule | null {
  try {
    if (fs.existsSync(SCHEDULE_PATH)) {
      const raw = fs.readFileSync(SCHEDULE_PATH, 'utf-8')
      currentSchedule = JSON.parse(raw) as WeeklySchedule
      return currentSchedule
    }
  } catch (err) {
    logger.error({ err }, 'Failed to load schedule')
  }
  return null
}

export function updateSchedule(payload: unknown) {
  try {
    const schedule = (payload as { schedule?: WeeklySchedule })?.schedule
      ?? (payload as WeeklySchedule)

    currentSchedule = schedule
    fs.mkdirSync(path.dirname(SCHEDULE_PATH), { recursive: true })
    fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2))
    logger.info('Schedule saved to disk')
  } catch (err) {
    logger.error({ err }, 'Failed to save schedule')
  }
}

export function getSchedule(): WeeklySchedule | null {
  return currentSchedule
}