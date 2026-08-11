import db from '../config/db.js';
import bcrypt from 'bcrypt';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Register User
export const registerUser = async (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  try {
    if (!email || !password || !firstName) {
      return res.status(400).json(errorResponse('Email, password, and firstName are required', 'VALIDATION_ERROR'));
    }
    
    // Check if user exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json(errorResponse('Email already exists', 'USER_EMAIL_EXISTS'));
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, password_hash, firstName, lastName || null]
    );

    res.status(201).json(
      successResponse('User registered successfully', {
        id: result.insertId,
        email,
        firstName,
        lastName: lastName || null
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

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json(errorResponse('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json(errorResponse('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    res.status(200).json(
      successResponse('User logged in successfully', {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get Users
export const getUsers = async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, first_name, last_name, is_active, created_at FROM users'
    );
    
    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      isActive: Boolean(u.is_active),
      createdAt: u.created_at
    }));

    res.status(200).json(successResponse('Users fetched successfully', mappedUsers));
  } catch (error) {
    next(error);
  }
};

