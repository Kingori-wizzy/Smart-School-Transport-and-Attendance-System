/**
 * Pagination utility for consistent pagination across routes
 * @param {Object} req - Express request object
 * @param {number} defaultLimit - Default items per page (default: 20)
 * @param {number} maxLimit - Maximum items per page (default: 100)
 * @returns {Object} - { page, limit, skip }
 */
const paginate = (req, defaultLimit = 20, maxLimit = 100) => {
  // Get page from query, default to 1
  const page = Math.max(1, parseInt(req.query.page) || 1);
  
  // Get limit from query, apply max limit
  let limit = parseInt(req.query.limit) || defaultLimit;
  limit = Math.min(limit, maxLimit);
  
  // Calculate skip for MongoDB
  const skip = (page - 1) * limit;
  
  return {
    page,
    limit,
    skip
  };
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} - Pagination metadata
 */
const getPaginationMeta = (page, limit, total) => {
  const pages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
    nextPage: page < pages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

module.exports = {
  paginate,
  getPaginationMeta
};
