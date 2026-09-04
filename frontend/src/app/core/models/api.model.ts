/** Standard API envelope returned by the EZiWear backend (/api/v1). */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}
