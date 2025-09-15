import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Birdie Auth Service API',
    version: '1.0.0',
    description: 'Authentication microservice for Birdie Bash Platform',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Auth Service (local)' },
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
        example: { code: 'VALIDATION_ERROR', message: 'Missing required fields', details: { missing: ['email','password'] } }
      },
      User: {
        type: 'object', required: ['email','name','skill','role'],
        properties: {
          id: { type: 'string', description: 'User ID' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          skill: { type: 'string', enum: ['S','P','BG','N'] },
          phoneNumber: { type: 'string', description: 'Phone number (optional)', example: '+66812345678' },
          role: { type: 'string', enum: ['admin','user'] },
        }
      },
      UserCreate: {
        type: 'object', required: ['email','password','name','skill'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 6, example: 'password123' },
          name: { type: 'string', example: 'John Doe' },
          skill: { type: 'string', enum: ['S','P','BG','N'], example: 'BG' },
          phoneNumber: { type: 'string', description: 'Phone number (optional)', example: '+66812345678' },
          role: { type: 'string', enum: ['admin','user'], default: 'user' },
        }
      },
      UserLogin: {
        type: 'object', required: ['email','password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string', description: 'JWT access token' },
          user: { $ref: '#/components/schemas/User' }
        }
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

