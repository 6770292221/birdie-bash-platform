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
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            description: 'Application error code (e.g., VALIDATION_ERROR, NOT_FOUND, INVALID_ID, INTERNAL_SERVER_ERROR)'
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
          },
          details: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional key-value details for client handling',
          },
        },
        example: {
          code: 'VALIDATION_ERROR',
          message: 'maxParticipants must be >= 1',
          details: { field: 'capacity.maxParticipants', min: 1 }
        }
      },
      Event: {
        type: 'object',
        required: ['id', 'eventName', 'eventDate', 'location', 'capacity', 'shuttlecockPrice', 'courtHourlyRate', 'courts'],
        properties: {
          id: { type: 'string', description: 'Event ID' },
          eventName: { type: 'string', description: 'Event name' },
          eventDate: { type: 'string', format: 'date', description: 'Event date' },
          location: { type: 'string', description: 'Location name' },
          status: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['active', 'canceled', 'completed'], description: 'Event state' },
              isAcceptingRegistrations: { type: 'boolean', description: 'Derived accepting flag' },
            },
          },
          capacity: {
            type: 'object',
            required: ['maxParticipants'],
            properties: {
              maxParticipants: { type: 'number', minimum: 1, description: 'Maximum participants' },
              currentParticipants: { type: 'number', description: 'Current participants' },
              availableSlots: { type: 'number', description: 'Derived available slots' },
              waitlistEnabled: { type: 'boolean', description: 'Derived waitlist flag' },
            },
          },
          shuttlecockPrice: { type: 'number', description: 'Shuttlecock price' },
          courtHourlyRate: { type: 'number', description: 'Court hourly rate' },
          courts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                courtNumber: { type: 'number', description: 'Court number' },
                startTime: { type: 'string', description: 'Start time (HH:MM)' },
                endTime: { type: 'string', description: 'End time (HH:MM)' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      EventCreate: {
        type: 'object',
        required: ['eventName', 'eventDate', 'location', 'capacity', 'shuttlecockPrice', 'courtHourlyRate', 'courts'],
        properties: {
          id: { type: 'string', description: 'Optional custom ID' },
          eventName: { type: 'string', description: 'Event name' },
          eventDate: { type: 'string', format: 'date', description: 'Event date' },
          location: { type: 'string', description: 'Location name' },
          status: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['active', 'canceled', 'completed'], default: 'active' },
              isAcceptingRegistrations: { type: 'boolean', default: true },
            },
          },
          capacity: {
            type: 'object',
            required: ['maxParticipants'],
            properties: {
              maxParticipants: { type: 'number', minimum: 1 },
              currentParticipants: { type: 'number', default: 0 },
            },
          },
          shuttlecockPrice: { type: 'number', description: 'Shuttlecock price' },
          courtHourlyRate: { type: 'number', description: 'Court hourly rate' },
          courts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['courtNumber', 'startTime', 'endTime'],
              properties: {
                courtNumber: { type: 'number', description: 'Court number' },
                startTime: { type: 'string', description: 'Start time (HH:MM)' },
                endTime: { type: 'string', description: 'End time (HH:MM)' },
              },
            },
          },
        },
        example: {
          id: 'evt_20250920_001',
          eventName: 'Weekly Badminton Session',
          eventDate: '2025-09-20',
          location: 'TCC Badminton Complex',
          status: { state: 'active', isAcceptingRegistrations: true },
          capacity: { maxParticipants: 16, currentParticipants: 12 },
          shuttlecockPrice: 20,
          courtHourlyRate: 150,
          courts: [
            { courtNumber: 1, startTime: '20:00', endTime: '22:00' },
            { courtNumber: 2, startTime: '20:00', endTime: '22:00' }
          ]
        }
      },
      EventUpdate: {
        type: 'object',
        properties: {
          eventName: { type: 'string', description: 'Event name' },
          eventDate: { type: 'string', format: 'date', description: 'Event date' },
          location: { type: 'string', description: 'Location name' },
          status: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['active', 'canceled', 'completed'] },
              isAcceptingRegistrations: { type: 'boolean' },
            },
          },
          capacity: {
            type: 'object',
            properties: {
              maxParticipants: { type: 'number', minimum: 1 },
              currentParticipants: { type: 'number' },
            },
          },
          shuttlecockPrice: { type: 'number', description: 'Shuttlecock price' },
          courtHourlyRate: { type: 'number', description: 'Court hourly rate' },
          courts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                courtNumber: { type: 'number', description: 'Court number' },
                startTime: { type: 'string', description: 'Start time (HH:MM)' },
                endTime: { type: 'string', description: 'End time (HH:MM)' },
              },
            },
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
          id: {
            type: 'string',
            description: 'Event ID',
          },
          status: {
            type: 'string',
            enum: ['active', 'canceled', 'completed'],
            description: 'Event status (status.state)',
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
