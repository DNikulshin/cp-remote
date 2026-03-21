import { z } from 'zod'

export const TimeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
})

// 0 = воскресенье, 1-6 = пн-сб (стандарт JS Date)
export const DayOfWeekSchema = z.number().int().min(0).max(6)

export const WeeklyScheduleSchema = z.object({
  enabled: z.boolean(),
  days: z.record(
    z.coerce.string(),
    z.array(TimeSlotSchema)
  ),
  timezone: z.string(), // 'Europe/Moscow', 'Europe/Riga' и т.д.
})

export const OverrideSchema = z.object({
  id: z.string().uuid(),
  date: z.string().date(), // 'YYYY-MM-DD'
  slots: z.array(TimeSlotSchema),
  reason: z.string().max(100).optional(),
})

export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>
export type Override = z.infer<typeof OverrideSchema>
export type TimeSlot = z.infer<typeof TimeSlotSchema>