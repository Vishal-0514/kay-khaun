// Wraps a Zod schema as Express middleware. On failure, responds 400 with
// the first validation issue; on success, replaces req.body with the
// parsed (and type-coerced) data.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      return res.status(400).json({
        success: false,
        error: issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
      });
    }
    req.body = result.data;
    next();
  };
}
