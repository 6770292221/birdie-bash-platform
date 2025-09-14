import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Birdie Registration Service API',
    version: '1.0.0',
    description: 'Player/Registration microservice for Birdie Bash Platform',
  },
  servers: [
    { url: 'http://localhost:3005', description: 'Registration Service (local)' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  }
};

const options = {
  definition: swaggerDefinition,
  apis: ['src/controllers/*.ts'],
};

const specs = swaggerJSDoc(options);
export default specs;

