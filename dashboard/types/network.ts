import type { Pagination } from "./logs";

export interface NetworkRequest {
  id: number;
  fingerprint: string;
  app_name: string;
  method: string;
  url: string;
  status: number | null;
  duration_ms: number | null;
  error: string | null;
  count: number;
  first_seen: number;
  last_seen: number;
}

export interface NetworkRequestsResponse {
  data: NetworkRequest[];
  pagination: Pagination;
}
