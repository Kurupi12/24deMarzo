import { NextRequest, NextResponse } from 'next/server';
import { HrService } from '@/modules/hr/services/hr.service';
import { AttendanceWebhookSchema } from '@/modules/hr/validators/attendance.schema';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const hrService = new HrService();

export async function POST(req: NextRequest) {
  try {
    // Verificación de API Key secreta para webhooks externos de visión/cámaras
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.ERP_API_KEY_BIOMETRICS;

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        createErrorResponse('Clave de API inválida para webhook biométrico', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedDto = AttendanceWebhookSchema.parse(body);

    const result = await hrService.processBiometricEvent({
      ...validatedDto,
      source: validatedDto.source as any,
      type: validatedDto.type as any,
    });

    return NextResponse.json(createSuccessResponse(result), { status: 200 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Estructura de marcación inválida', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'BIOMETRIC_EVENT_ERROR'),
      { status: statusCode }
    );
  }
}

