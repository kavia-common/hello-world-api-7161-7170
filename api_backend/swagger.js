const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digi Portal API',
      version: '1.0.0',
      description: 'Digi Portal API (Express) with MongoDB persistence for core resources and file-based JSON backups.',
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

  /**
   * IMPORTANT:
   * We must scan the actual router entrypoint (src/routes/index.js) plus controllers
   * that contain OpenAPI JSDoc blocks. Otherwise swagger-ui shows:
   * "No operations defined in spec!"
   */
  apis: ['./src/routes/index.js', './src/controllers/*.js', './src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
