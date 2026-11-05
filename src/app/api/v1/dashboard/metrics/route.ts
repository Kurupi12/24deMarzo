import { NextResponse } from 'next/server';
import { DashboardService } from '@/modules/dashboard/services/dashboard.service';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

const dashboardService = new DashboardService();

export async function GET() {
  try {
    const metrics = await dashboardService.getExecutiveMetrics();
    return NextResponse.json(createSuccessResponse(metrics));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'DASHBOARD_METRICS_ERROR'),
      { status: 500 }
    );
  }
}

