import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './src/config/db.js';
import userRoutes from './src/routes/userRoutes.js';
import todoRoutes from './src/routes/todoRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { successResponse, errorResponse } from './src/utils/apiResponse.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/todos', todoRoutes);

// Test Route: Check server health and DB connectivity
app.get('/api/health', async (req, res, next) => {
  try {
    // Run a simple query to verify MySQL connection
    const [result] = await db.query('SELECT 1 + 1 AS solution');
    res.status(200).json(
      successResponse('Server and Database are connected successfully!', {
        dbTest: result[0].solution
      })
    );
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
