export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const getPaginationParams = (page: number, pageSize: number = 10): PaginationParams => ({
  page: Math.max(1, page),
  pageSize: Math.min(100, Math.max(1, pageSize)),
});
