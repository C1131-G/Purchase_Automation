export interface PageConfig {
  page: number;
  limit: number;
  total: number;
}

export const paginate = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  return {
    hasNext: page < totalPages,
    hasPrev: page > 1,
    limit,
    page,
    total,
    totalPages,
  };
};

export const pageService = { paginate };
