import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // If the error has already been sent, don't try to send it again
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific database errors or default to 500
  res.status(500).json(
    errorResponse(
      'Something went wrong',
      'INTERNAL_SERVER_ERROR'
    )
  );
};
