import { AttendanceSource, AttendanceType, LeaveType } from '@prisma/client';

export interface AttendanceWebhookInput {
  biometricId: string;
  timestamp: string; // ISO String
  type: AttendanceType;
  source: AttendanceSource;
  confidenceScore?: number;
  deviceId?: string;
  snapshotUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface EmployeeFilterParams {
  search?: string;
  department?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdvanceRequestInput {
  employeeId: string;
  amount: number;
  deductionPeriod: string; // "YYYY-MM"
  reason?: string;
}

export interface LeaveRequestInput {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  documentFileUrl?: string;
}

