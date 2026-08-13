import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Get high level system stats
export const getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await db.users.count();
    const activeUsers = await db.users.count({ where: { is_active: true } });
    const totalTodos = await db.todos.count();
    const completedTodos = await db.todos.count({ where: { is_completed: true } });
    const pendingTodos = totalTodos - completedTodos;

    res.status(200).json(
      successResponse('System stats fetched successfully', {
        users: { total: totalUsers, active: activeUsers },
        todos: { total: totalTodos, completed: completedTodos, pending: pendingTodos }
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get all users (detailed list)
export const getAllUsers = async (req, res, next) => {
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
        _count: {
          select: { todos: true } // Gets total todos per user
        }
      },
      orderBy: { created_at: 'desc' }
    });
    
    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      isActive: Boolean(u.is_active),
      role: u.role,
      createdAt: u.created_at,
      totalTodos: u._count.todos
    }));

    res.status(200).json(successResponse('Users fetched successfully', mappedUsers));
  } catch (error) {
    next(error);
  }
};

// Toggle user active status (block/unblock)
export const toggleUserStatus = async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body; // Boolean

  try {
    if (typeof isActive !== 'boolean') {
      return res.status(400).json(errorResponse('isActive must be a boolean', 'VALIDATION_ERROR'));
    }

    // Ensure they aren't blocking themselves
    if (req.user.id === id) {
       return res.status(400).json(errorResponse('You cannot block your own admin account', 'VALIDATION_ERROR'));
    }

    try {
      // 1. Update user status
      const updatedUser = await db.users.update({
        where: { id: BigInt(id) },
        data: { is_active: isActive }
      });

      // 2. If blocked, instantly kill all their active sessions
      if (!isActive) {
        await db.refresh_tokens.updateMany({
          where: { user_id: BigInt(id), is_revoked: false },
          data: { is_revoked: true }
        });
        
        const io = req.app.get('io');
        if (io) {
          io.emit('account_blocked', { userId: id.toString() });
        }
      }

      res.status(200).json(
        successResponse(`User successfully ${isActive ? 'unblocked' : 'blocked'}`, {
          id: updatedUser.id.toString(),
          isActive: Boolean(updatedUser.is_active)
        })
      );
    } catch (e) {
      if (e.code === 'P2025') { 
        return res.status(404).json(errorResponse('User not found', 'USER_NOT_FOUND'));
      }
      throw e;
    }
  } catch (error) {
    next(error);
  }
};
