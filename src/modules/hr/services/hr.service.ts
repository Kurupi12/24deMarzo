import { HrRepository } from '../repositories/hr.repository';
import { AttendanceWebhookInput, EmployeeFilterParams } from '../types/hr.types';
import { NotFoundError } from '@/shared/errors/app-error';

export class HrService {
  private repo: HrRepository;

  constructor() {
    this.repo = new HrRepository();
  }

  async listEmployees(params: EmployeeFilterParams) {
    return this.repo.findEmployees(params);
  }

  async processBiometricEvent(input: AttendanceWebhookInput) {
    // 1. Identificar al empleado por su biometricId registrado
    const employee = await this.repo.findEmployeeByBiometricId(input.biometricId);
    if (!employee) {
      throw new NotFoundError(
        'Empleado no identificado para el identificador biométrico',
        input.biometricId
      );
    }

    // 2. Registrar marcación instantánea
    const record = await this.repo.createAttendanceRecord({
      employeeId: employee.id,
      recordedAt: new Date(input.timestamp),
      type: input.type,
      source: input.source,
      confidenceScore: input.confidenceScore,
      deviceId: input.deviceId,
      snapshotUrl: input.snapshotUrl,
      rawPayload: input.rawPayload,
    });

    return {
      success: true,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.code,
      recordId: record.id,
      recordedAt: record.recordedAt,
    };
  }

  async getRecentActivity() {
    return this.repo.getRecentAttendances(10);
  }
}

