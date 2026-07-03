// Helper de paginación reutilizable por los controladores de client,
// project y deliverynote.
export const paginate = async (Model, filter, { page = 1, limit = 10, sort = '-createdAt' }) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, totalItems] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limitNum),
    Model.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limitNum)),
      currentPage: pageNum,
      limit: limitNum
    }
  };
};
