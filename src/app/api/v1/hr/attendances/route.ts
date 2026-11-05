import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const limit = Number(searchParams.get('limit')) || 30;

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            biometricId: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(createSuccessResponse(records));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'ATTENDANCE_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

