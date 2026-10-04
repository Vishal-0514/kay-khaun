// Catches errors from any route/middleware and returns a consistent JSON shape.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    error: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
