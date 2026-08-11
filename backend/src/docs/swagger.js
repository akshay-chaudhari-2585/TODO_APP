import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Todo App API',
      version: '1.0.0',
      description: 'API documentation for the Todo App',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/*.js', './server.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
