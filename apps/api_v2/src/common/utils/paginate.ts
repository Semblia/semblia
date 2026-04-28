import type { V2PaginatedResponse } from "../dto/paginated-response.dto.js";

export function paginate<T>({
  data,
  total,
  page,
  pageSize,
}: {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}): V2PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
