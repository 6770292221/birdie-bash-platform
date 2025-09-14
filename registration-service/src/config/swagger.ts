import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Birdie Registration Service API',
    version: '1.0.0',
    description: 'Player registration microservice for Birdie Bash Platform',
    contact: {
      name: 'Birdie Bash Platform',
    },
  },
  servers: [
    { url: 'http://localhost:3005', description: 'Registration Service (local)' },
  ],
  components: {
    securitySchemes: {
      GatewayAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'User ID passed from API Gateway after JWT validation',
      },
    },
    schemas: {
      Player: {
        type: 'object',
        properties: {
          playerId: { type: 'string', description: 'Unique player registration ID' },
          userId: { type: 'string', nullable: true, description: 'User ID for member registrations (null for guests)' },
          name: { type: 'string', nullable: true, description: 'Player name' },
          email: { type: 'string', nullable: true, description: 'Player email' },
          phoneNumber: { type: 'string', nullable: true, description: 'Player phone number' },
          startTime: { type: 'string', nullable: true, description: 'Preferred start time (HH:MM format)' },
          endTime: { type: 'string', nullable: true, description: 'Preferred end time (HH:MM format)' },
          status: { type: 'string', enum: ['registered', 'waitlist', 'canceled'], description: 'Player registration status' },
          registrationTime: { type: 'string', format: 'date-time', description: 'Timestamp when player registered' },
          createdBy: { type: 'string', nullable: true, description: 'User ID who created this registration (for guest registrations)' },
        },
      },
      RegisterMemberRequest: {
        type: 'object',
        properties: {
          startTime: { type: 'string', description: 'Preferred start time (HH:MM format)' },
          endTime: { type: 'string', description: 'Preferred end time (HH:MM format)' },
        },
      },
      RegisterGuestRequest: {
        type: 'object',
        required: ['name', 'phoneNumber'],
        properties: {
          name: { type: 'string', description: 'Guest player name' },
          phoneNumber: { type: 'string', description: 'Guest player phone number' },
          startTime: { type: 'string', description: 'Preferred start time (HH:MM format)' },
          endTime: { type: 'string', description: 'Preferred end time (HH:MM format)' },
        },
      },
      PlayerRegistrationResponse: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'Event ID' },
          playerId: { type: 'string', description: 'Unique player registration ID' },
          userId: { type: 'string', nullable: true, description: 'User ID (null for guests)' },
          registrationTime: { type: 'string', format: 'date-time', description: 'Registration timestamp' },
          status: { type: 'string', enum: ['registered', 'waitlist'], description: 'Registration status' },
        },
      },
      PlayersListResponse: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'Event ID' },
          players: { type: 'array', items: { $ref: '#/components/schemas/Player' }, description: 'List of registered players' },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total number of players' },
              registered: { type: 'integer', description: 'Number of registered players' },
              waitlist: { type: 'integer', description: 'Number of waitlisted players' },
              canceled: { type: 'integer', description: 'Number of canceled registrations' },
            },
          },
          pagination: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Number of items per page' },
              offset: { type: 'integer', description: 'Number of items skipped' },
              hasMore: { type: 'boolean', description: 'Whether there are more items available' },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Error code' },
          message: { type: 'string', description: 'Error message' },
          details: { type: 'object', description: 'Additional error details' },
        },
      },
    },
  },
  security: [{ GatewayAuth: [] }],
};

const options = {
  definition: swaggerDefinition,
  apis: ['src/controllers/*.ts', 'src/routes/*.ts'],
};

const specs = swaggerJSDoc(options);
export default specs;
