const paginate = (req, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  let limit = parseInt(req.query.limit) || defaultLimit;
  limit = Math.min(limit, maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const getPaginationMeta = (page, limit, total) => {
  const pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1
  };
};

module.exports = paginate;
module.exports.paginate = paginate;
module.exports.getPaginationMeta = getPaginationMeta;
