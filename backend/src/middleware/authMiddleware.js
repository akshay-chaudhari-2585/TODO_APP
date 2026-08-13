import { verifyAccessToken } from '../utils/jwt.js';
import { errorResponse } from '../utils/apiResponse.js';
import db from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = verifyAccessToken(token);

      // Get user from token
      const user = await db.users.findUnique({
        where: { id: BigInt(decoded.id) },
        select: { id: true, email: true, role: true, is_active: true }
      });

      if (!user) {
        return res.status(401).json(errorResponse('Not authorized, user not found', 'UNAUTHORIZED'));
      }

      if (!user.is_active) {
        return res.status(403).json(errorResponse('User account is deactivated', 'FORBIDDEN'));
      }

      // Attach user to request
      req.user = {
        ...user,
        id: user.id.toString()
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(errorResponse('Token expired', 'TOKEN_EXPIRED'));
      }
      return res.status(401).json(errorResponse('Not authorized, token failed', 'UNAUTHORIZED'));
    }
  } else {
    return res.status(401).json(errorResponse('Not authorized, no token', 'UNAUTHORIZED'));
  }
};

// Middleware to restrict access based on roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json(errorResponse('You do not have permission to perform this action', 'FORBIDDEN'));
    }
    next();
  };
};
