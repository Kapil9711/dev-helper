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

/** One HTTP request instance, rather than an aggregated request group. */
export interface NetworkRequestDetail {
  id: number;
  app_name: string;
  request_id: string;
  method: string;
  url: string;

  params_json: string | null;
  request_headers_json: string | null;
  request_body_json: string | null;

  status: number | null;
  status_text: string | null;
  response_headers_json: string | null;
  response_body_json: string | null;

  duration_ms: number | null;
  error: string | null;

  started_at: number;
  completed_at: number | null;
  updated_at: number;
}

export interface NetworkRequestDetailsResponse {
  data: NetworkRequestDetail[];
  pagination: Pagination;
}
