/**
 * Standardized success response
 * @param {string} message - Success message
 * @param {any} data - Data to return
 * @returns {object} Standardized response object
 */
export const successResponse = (message, data = null) => {
  return {
    success: true,
    message,
    data,
  };
};

/**
 * Standardized error response
 * @param {string} message - Error message
 * @param {string} errorCode - Specific error code for the frontend to switch on
 * @param {any} data - Additional data if any
 * @returns {object} Standardized error response object
 */
export const errorResponse = (message, errorCode = 'UNKNOWN_ERROR', data = null) => {
  return {
    success: false,
    message,
    data,
    error: {
      code: errorCode
    }
  };
};
