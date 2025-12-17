export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class PaginationHelper {
  /**
   * Parse pagination parameters from request query
   */
  static parsePaginationParams(query: any): PaginationParams {
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));

    return { page, limit };
  }

  /**
   * Calculate skip value for MongoDB query
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Generate pagination metadata
   */
  static generateMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Parse sort parameter from query
   * Example: ?sort=createdAt or ?sort=-createdAt (descending)
   */
  static parseSortParam(sortQuery?: string): string {
    if (!sortQuery) return '-createdAt'; // Default sort

    // Handle descending sort with minus sign
    const sortField = sortQuery.startsWith('-') ? sortQuery.substring(1) : sortQuery;
    const allowedFields = ['createdAt', 'updatedAt', 'name', 'email'];

    if (!allowedFields.includes(sortField)) {
      return '-createdAt';
    }

    return sortQuery;
  }
}

export default PaginationHelper;
