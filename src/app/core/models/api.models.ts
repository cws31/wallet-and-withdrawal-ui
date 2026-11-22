export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; 
  first: boolean;
  last: boolean;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error?: string;
  message: string;
  path?: string;
  validationErrors?: Record<string, string>;
}