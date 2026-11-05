import { z } from 'zod';

export const AttendanceWebhookSchema = z.object({
  biometricId: z.string().min(1, 'El identificador biométrico es obligatorio'),
  timestamp: z.string().datetime({ message: 'Timestamp ISO 8601 requerido' }),
  type: z.enum(['CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN']).default('CHECK_IN'),
  source: z.enum([
    'AI_CAMERA_VISION',
    'BIOMETRIC_DEVICE',
    'WEB_MANUAL_ENTRY',
    'MOBILE_GEO_CHECKIN',
  ]).default('AI_CAMERA_VISION'),
  confidenceScore: z.number().min(0).max(1).optional(),
  deviceId: z.string().optional(),
  snapshotUrl: z.string().url().optional(),
  rawPayload: z.record(z.any()).optional(),
});

export const CreateAdvanceSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  deductionPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de periodo debe ser YYYY-MM'),
  reason: z.string().max(300).optional(),
});

export type AttendanceWebhookDto = z.infer<typeof AttendanceWebhookSchema>;
export type CreateAdvanceDto = z.infer<typeof CreateAdvanceSchema>;

