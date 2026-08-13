import db from '../config/db.js';
import bcrypt from 'bcrypt';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

// Helper function to handle saving refresh token
const createSession = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.refresh_tokens.create({
    data: {
      user_id: BigInt(userId),
      token,
      expires_at: expiresAt
    }
  });
};

// Register User
export const registerUser = async (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  try {
    if (!email || !password || !firstName) {
      return res.status(400).json(errorResponse('Email, password, and firstName are required', 'VALIDATION_ERROR'));
    }
    
    const existingUser = await db.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json(errorResponse('Email already exists', 'USER_EMAIL_EXISTS'));
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await db.users.create({
      data: {
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName || null,
      }
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await createSession(user.id, refreshToken);

    res.status(201).json(
      successResponse('User registered successfully', {
        user: {
          id: user.id.toString(),
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        tokens: { accessToken, refreshToken }
      })
    );
  } catch (error) {
    next(error);
  }
};

// Login User
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required', 'VALIDATION_ERROR'));
    }

    const user = await db.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json(errorResponse('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    if (!user.is_active) {
      return res.status(403).json(errorResponse('Your account has been suspended by an administrator.', 'ACCOUNT_SUSPENDED'));
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json(errorResponse('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await createSession(user.id, refreshToken);

    res.status(200).json(
      successResponse('User logged in successfully', {
        user: {
          id: user.id.toString(),
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        tokens: { accessToken, refreshToken }
      })
    );
  } catch (error) {
    next(error);
  }
};

// Refresh Token
export const refreshTokens = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json(errorResponse('Refresh token is required', 'VALIDATION_ERROR'));
  }

  try {
    // Verify token cryptographically
    const decoded = verifyRefreshToken(refreshToken);
    
    // Verify token exists in database and is not revoked
    const savedToken = await db.refresh_tokens.findUnique({
      where: { token: refreshToken },
      include: { users: true }
    });

    if (!savedToken || savedToken.is_revoked || savedToken.expires_at < new Date()) {
      return res.status(401).json(errorResponse('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN'));
    }

    const user = savedToken.users;
    if (!user.is_active) {
      return res.status(403).json(errorResponse('User account is deactivated', 'FORBIDDEN'));
    }

    // Issue new tokens (Token Rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Revoke old token and save new one
    await db.$transaction([
      db.refresh_tokens.update({
        where: { id: savedToken.id },
        data: { is_revoked: true }
      }),
      db.refresh_tokens.create({
        data: {
          user_id: user.id,
          token: newRefreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    res.status(200).json(
      successResponse('Tokens refreshed successfully', {
        tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken }
      })
    );
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json(errorResponse('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN'));
    }
    next(error);
  }
};

// Logout User
export const logoutUser = async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      await db.refresh_tokens.updateMany({
        where: { token: refreshToken },
        data: { is_revoked: true }
      });
    }
    res.status(200).json(successResponse('Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

// Get Users (Admin only usually)
export const getUsers = async (req, res, next) => {
  try {
    const users = await db.users.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        is_active: true,
        role: true,
        created_at: true,
      }
    });
    
    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      isActive: Boolean(u.is_active),
      role: u.role,
      createdAt: u.created_at
    }));

    res.status(200).json(successResponse('Users fetched successfully', mappedUsers));
  } catch (error) {
    next(error);
  }
};

// Get User Dashboard (Dynamic Response)
export const getUserDashboard = async (req, res, next) => {
  const { detail } = req.query; // 'summary' or 'comprehensive'
  const userId = BigInt(req.user.id);

  try {
    const totalPending = await db.todos.count({ where: { user_id: userId, is_completed: false } });
    const totalCompleted = await db.todos.count({ where: { user_id: userId, is_completed: true } });

    // Summary mode (Default)
    if (detail !== 'comprehensive') {
      return res.status(200).json(
        successResponse('Dashboard summary fetched successfully', {
          totalPending,
          totalCompleted
        })
      );
    }

    // Comprehensive mode
    const recentPending = await db.todos.findMany({
      where: { user_id: userId, is_completed: false },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    const recentCompleted = await db.todos.findMany({
      where: { user_id: userId, is_completed: true },
      orderBy: { updated_at: 'desc' },
      take: 5
    });

    return res.status(200).json(
      successResponse('Dashboard comprehensive data fetched successfully', {
        totalPending,
        totalCompleted,
        recentPending: recentPending.map(t => ({
          id: t.id.toString(),
          title: t.title,
          isCompleted: t.is_completed,
          dueAt: t.due_at
        })),
        recentCompleted: recentCompleted.map(t => ({
          id: t.id.toString(),
          title: t.title,
          isCompleted: t.is_completed,
          updatedAt: t.updated_at
        }))
      })
    );
  } catch (error) {
    next(error);
  }
};
