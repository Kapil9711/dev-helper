export interface AppSummary {
  app_name: string;
  last_seen: number;
}

export interface AppsResponse {
  data: AppSummary[];
}
