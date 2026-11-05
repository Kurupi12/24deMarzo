import { prisma } from '@/lib/prisma';
import { EmployeeFilterParams } from '../types/hr.types';

export class HrRepository {
  async findEmployees(params: EmployeeFilterParams) {
    const { search, department, status = 'ACTIVE', page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { status };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = department;
    }

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          salaryStructure: true,
        },
        orderBy: { lastName: 'asc' },
      }),
    ]);

    return { total, items, page, limit };
  }

  async findEmployeeByBiometricId(biometricId: string) {
    return prisma.employee.findUnique({
      where: { biometricId },
    });
  }

  async createAttendanceRecord(data: {
    employeeId: string;
    recordedAt: Date;
    type: any;
    source: any;
    confidenceScore?: number;
    deviceId?: string;
    snapshotUrl?: string;
    rawPayload?: any;
  }) {
    return prisma.attendanceRecord.create({
      data: {
        employeeId: data.employeeId,
        recordedAt: data.recordedAt,
        type: data.type,
        source: data.source,
        confidenceScore: data.confidenceScore ?? null,
        deviceId: data.deviceId ?? null,
        snapshotUrl: data.snapshotUrl ?? null,
        rawPayload: data.rawPayload ?? null,
        isVerified: true,
      },
    });
  }

  async getRecentAttendances(limit = 10) {
    return prisma.attendanceRecord.findMany({
      take: limit,
      orderBy: { recordedAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
          },
        },
      },
    });
  }
}

