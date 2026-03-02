export interface RequestEntry {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  duration: number; // in ms
  ip: string;
  userAgent: string;
  userId?: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  headers: Record<string, string>;
  response?: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
}

export interface TelescopeStats {
  totalRequests: number;
  avgResponseTime: number;
  requestsByStatus: Record<number, number>;
  requestsByMethod: Record<string, number>;
  slowestEndpoints: Array<{ path: string; avgDuration: number; count: number }>;
}
