import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware to validate incoming requests against a Zod schema.
 * Sends a 400 Bad Request with field-level errors if validation fails.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      // Map Zod errors to a clear field-level object
      const formattedErrors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json(
        errorResponse('Validation failed', 'VALIDATION_ERROR', formattedErrors)
      );
    }
    next(error);
  }
};
