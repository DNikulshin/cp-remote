import { z } from 'zod'

export const BindDeviceSchema = z.object({
  deviceId: z.string().uuid(),
  secret: z.string().min(32),
  name: z.string().min(1).max(100),
  timezone: z.string().default('UTC'),
})

export const SendCommandSchema = z.object({
  type: z.enum(['SHUTDOWN', 'REBOOT', 'LOCK', 'SLEEP']),
  delaySeconds: z.number().int().min(0).max(3600).default(0),
  message: z.string().max(200).optional(),
})

export const UpdateScheduleSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string(),
  days: z.record(
    z.string(),
    z.array(
      z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
  ),
})

export type BindDeviceInput = z.infer<typeof BindDeviceSchema>
export type SendCommandInput = z.infer<typeof SendCommandSchema>
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>