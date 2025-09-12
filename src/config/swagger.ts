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
      Event: {
        type: 'object',
        required: ['name', 'date', 'startTime', 'endTime', 'maxParticipants'],
        properties: {
          id: {
            type: 'string',
            description: 'Event ID',
          },
          name: {
            type: 'string',
            description: 'Event name',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Event date',
          },
          startTime: {
            type: 'string',
            description: 'Start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'End time (HH:MM)',
          },
          maxParticipants: {
            type: 'number',
            minimum: 1,
            description: 'Maximum number of participants',
          },
          currentParticipants: {
            type: 'number',
            description: 'Current number of participants',
          },
          status: {
            type: 'string',
            enum: ['active', 'canceled', 'completed'],
            description: 'Event status',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
          createdBy: {
            type: 'string',
            description: 'User ID who created the event',
          },
        },
      },
      EventCreate: {
        type: 'object',
        required: ['name', 'date', 'startTime', 'endTime', 'maxParticipants'],
        properties: {
          name: {
            type: 'string',
            description: 'Event name',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Event date',
          },
          startTime: {
            type: 'string',
            description: 'Start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'End time (HH:MM)',
          },
          maxParticipants: {
            type: 'number',
            minimum: 1,
            description: 'Maximum number of participants',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
        },
      },
      EventUpdate: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Event name',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Event date',
          },
          startTime: {
            type: 'string',
            description: 'Start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'End time (HH:MM)',
          },
          maxParticipants: {
            type: 'number',
            minimum: 1,
            description: 'Maximum number of participants',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
          status: {
            type: 'string',
            enum: ['active', 'canceled', 'completed'],
            description: 'Event status',
          },
        },
      },
      Court: {
        type: 'object',
        required: ['courtNumber', 'maxPlayers'],
        properties: {
          id: {
            type: 'string',
            description: 'Court ID',
          },
          eventId: {
            type: 'string',
            description: 'Event ID',
          },
          courtNumber: {
            type: 'number',
            minimum: 1,
            description: 'Court number',
          },
          maxPlayers: {
            type: 'number',
            minimum: 1,
            description: 'Maximum players per court',
          },
          currentPlayers: {
            type: 'number',
            description: 'Current number of players',
          },
          status: {
            type: 'string',
            enum: ['available', 'occupied', 'maintenance'],
            description: 'Court status',
          },
        },
      },
      CourtCreate: {
        type: 'object',
        required: ['courtNumber', 'maxPlayers'],
        properties: {
          courtNumber: {
            type: 'number',
            minimum: 1,
            description: 'Court number',
          },
          maxPlayers: {
            type: 'number',
            minimum: 1,
            default: 4,
            description: 'Maximum players per court',
          },
        },
      },
      Player: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          id: {
            type: 'string',
            description: 'Player ID',
          },
          eventId: {
            type: 'string',
            description: 'Event ID',
          },
          userId: {
            type: 'string',
            description: 'User ID (if registered user)',
          },
          name: {
            type: 'string',
            description: 'Player name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Player email',
          },
          startTime: {
            type: 'string',
            description: 'Preferred start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'Preferred end time (HH:MM)',
          },
          registrationTime: {
            type: 'string',
            format: 'date-time',
            description: 'Registration timestamp',
          },
          status: {
            type: 'string',
            enum: ['registered', 'waitlist', 'canceled'],
            description: 'Player status',
          },
        },
      },
      PlayerRegister: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          userId: {
            type: 'string',
            description: 'User ID (for registered users)',
          },
          name: {
            type: 'string',
            description: 'Player name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Player email',
          },
          startTime: {
            type: 'string',
            description: 'Preferred start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'Preferred end time (HH:MM)',
          },
        },
      },
      EventStatus: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'Event ID',
          },
          status: {
            type: 'string',
            enum: ['active', 'canceled', 'completed'],
            description: 'Event status',
          },
          maxParticipants: {
            type: 'number',
            description: 'Maximum participants',
          },
          currentParticipants: {
            type: 'number',
            description: 'Current participants',
          },
          availableSlots: {
            type: 'number',
            description: 'Available slots',
          },
          isAcceptingRegistrations: {
            type: 'boolean',
            description: 'Whether accepting new registrations',
          },
          waitlistEnabled: {
            type: 'boolean',
            description: 'Whether waitlist is enabled',
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