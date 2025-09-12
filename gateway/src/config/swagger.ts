import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Birdie API Gateway',
    version: '1.0.0',
    description: 'Gateway that proxies requests to Auth and Event services',
  },
  servers: [
    { url: 'http://localhost:8080', description: 'Gateway (local)' },
  ],
  tags: [
    { name: 'Gateway', description: 'Gateway utilities and health' },
    {
      name: 'Auth Proxy',
      description: 'Proxied routes to Auth Service',
      externalDocs: { description: 'Auth Service API', url: 'http://localhost:3001/api-docs' }
    },
    {
      name: 'Event Proxy',
      description: 'Proxied routes to Event Service',
      externalDocs: { description: 'Event Service API', url: 'http://localhost:3002/api-docs' }
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object', required: ['code', 'message'],
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object', additionalProperties: true },
        },
        example: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable', service: 'http://localhost:3002' }
      }
    }
  }
};

const options = {
  definition: swaggerDefinition,
  apis: ['src/**/*.ts'],
};

const specs = swaggerJSDoc(options);
export default specs;

