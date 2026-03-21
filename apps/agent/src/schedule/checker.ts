import { log as logger } from '../utils/logger.js'
import { getSchedule } from './store.js'
import type { TimeSlot } from '@pc-remote/shared'

// Проверяем входит ли текущее время в разрешённый интервал
export function isCurrentTimeAllowed(): boolean {
  const schedule = getSchedule()

  if (!schedule || !schedule.enabled) {
    return true // расписание не настроено — доступ разрешён
  }

  const now = new Date()

  // Получаем текущее время в timezone устройства
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timezone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const weekday = parts.find((p) => p.type === 'weekday')?.value

  // Конвертируем weekday в номер (0=вс, 1=пн, ..., 6=сб)
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  const dayNumber = weekday ? (weekdayMap[weekday] ?? -1) : -1

  const currentMinutes = parseInt(hour) * 60 + parseInt(minute)
  const daySlots = schedule.days[String(dayNumber)] as TimeSlot[] | undefined

  if (!daySlots || daySlots.length === 0) {
    return false // этот день не разрешён
  }

  return daySlots.some((slot) => {
    const [startH = 0, startM = 0] = slot.start.split(':').map(Number)
    const [endH = 0, endM = 0] = slot.end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  })
}