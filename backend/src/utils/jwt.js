import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id.toString(), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' } // Short lived access token
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.id.toString(),
      jti: crypto.randomUUID() // Ensure uniqueness
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Long lived refresh token
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
