import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/docs/swagger.js';
import db from './src/config/db.js';
import adminRoutes from './src/routes/adminRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import todoRoutes from './src/routes/todoRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { successResponse, errorResponse } from './src/utils/apiResponse.js';
import { requestLogger } from './src/middleware/loggerMiddleware.js';
import { initGameServer } from './src/socket/gameServer.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io Game Server
const io = initGameServer(server);
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/todos', todoRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: API Health Check
 *     description: Returns the health status of the server and database connection.
 *     responses:
 *       200:
 *         description: Server is healthy and connected to the database.
 */
app.get('/api/health', async (req, res, next) => {
  try {
    // Run a simple query to verify Prisma connection
    const result = await db.$queryRaw`SELECT 1 + 1 AS solution`;
    res.status(200).json(
      successResponse('Server and Database are connected successfully!', {
        dbTest: Number(result[0].solution)
      })
    );
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
