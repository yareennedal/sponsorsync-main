export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      // Arabic for the reader, method+path kept for whoever is debugging.
      message: `المسار غير موجود: ${req.method} ${req.originalUrl}`,
      details: null,
    },
  });
}
