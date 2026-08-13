import swaggerJsdoc from 'swagger-jsdoc';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { loginSchema, registerSchema, createTodoSchema, updateTodoSchema } from '../validators/schemas.js';

const registry = new OpenAPIRegistry();

// Register Zod schemas
registry.register('LoginRequest', loginSchema.shape.body);
registry.register('RegisterRequest', registerSchema.shape.body);
registry.register('CreateTodoRequest', createTodoSchema.shape.body);
registry.register('UpdateTodoRequest', updateTodoSchema.shape.body);

// Register common standard responses
registry.registerComponent('responses', 'ValidationError', {
  description: 'Validation Error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          error: {
            type: 'object',
            properties: { code: { type: 'string', example: 'VALIDATION_ERROR' } }
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email address' }
              }
            }
          }
        }
      }
    }
  }
});

registry.registerComponent('responses', 'UnauthorizedError', {
  description: 'Unauthorized Error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid credentials or token' },
          error: { type: 'object', properties: { code: { type: 'string', example: 'UNAUTHORIZED' } } }
        }
      }
    }
  }
});

registry.registerComponent('responses', 'ForbiddenError', {
  description: 'Forbidden Error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Your account has been suspended' },
          error: { type: 'object', properties: { code: { type: 'string', example: 'ACCOUNT_SUSPENDED' } } }
        }
      }
    }
  }
});

registry.registerComponent('responses', 'ServerError', {
  description: 'Internal Server Error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Internal server error' }
        }
      }
    }
  }
});

// Generate Zod-based components
const generator = new OpenApiGeneratorV3(registry.definitions);
const zodComponents = generator.generateComponents();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Todo App API',
      version: '1.0.0',
      description: 'API documentation for the Todo App with strict Zod validation',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      ...zodComponents.components,
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './server.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
