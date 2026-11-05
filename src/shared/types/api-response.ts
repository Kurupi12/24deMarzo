export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export function createSuccessResponse<T>(
  data: T,
  metadata?: ApiResponse<T>['metadata']
): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}

export function createErrorResponse(
  message: string,
  code = 'INTERNAL_SERVER_ERROR',
  details?: unknown
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
}

