import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Birdie Bash Platform API',
    version: '1.0.0',
    description: 'A microservice platform for managing users and authentication',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['email', 'name', 'skill', 'role'],
        properties: {
          id: {
            type: 'string',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          name: {
            type: 'string',
            description: 'User name',
          },
          skill: {
            type: 'string',
            enum: ['S', 'P', 'BG', 'N'],
            description: 'User skill level (S=Striker, P=Player, BG=Beginner, N=Newbie)',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            description: 'User role',
          },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['email', 'password', 'name', 'skill'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'User password',
          },
          name: {
            type: 'string',
            description: 'User name',
          },
          skill: {
            type: 'string',
            enum: ['S', 'P', 'BG', 'N'],
            description: 'User skill level (S=Striker, P=Player, BG=Beginner, N=Newbie)',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            default: 'user',
            description: 'User role',
          },
        },
      },
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            description: 'User password',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Response message',
          },
          token: {
            type: 'string',
            description: 'JWT token',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJSDoc(options);

export default specs;