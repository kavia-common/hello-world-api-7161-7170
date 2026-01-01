const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digi Portal API',
      version: '1.0.0',
      description: 'A minimal Express API that returns Hello World.',
    },
    /**
     * Components are defined here so swagger-jsdoc merges them with the JSDoc-defined
     * schemas in routes. We add bearer auth once, then reference it via
     * `security: - bearerAuth: []` on protected operations.
     */
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer <token>"',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
