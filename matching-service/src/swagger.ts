// src/swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Badminton Matching Service',
      version: '1.0.0',
      description: 'REST API for badminton matchmaking (events, seeding, advancing, status).'
    },
    components: {
      schemas: {
        SkillRank: {
          type: 'integer',
          enum: [1, 2, 3, 4],
          description: '1=N, 2=S, 3=BG, 4=P'
        },
        PlayerState: {
          type: 'string',
          enum: ['Idle', 'Waiting', 'Playing']
        },
        Player: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            skill: { $ref: '#/components/schemas/SkillRank' },
            availableStart: { type: 'string', format: 'date-time' },
            availableEnd: { type: 'string', format: 'date-time' },
            gamesPlayed: { type: 'integer' },
            lastPlayedAt: { type: 'string', format: 'date-time', nullable: true },
            state: { $ref: '#/components/schemas/PlayerState' },
            waitingSince: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'name', 'skill', 'availableStart', 'availableEnd', 'gamesPlayed', 'state']
        },
        Court: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            currentGameId: { type: 'string', nullable: true }
          },
          required: ['id']
        },
        Game: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            courtId: { type: 'string' },
            playerIds: { type: 'array', items: { type: 'string' } },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'courtId', 'playerIds', 'startTime']
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            courts: { type: 'array', items: { $ref: '#/components/schemas/Court' } },
            createdAt: { type: 'string', format: 'date-time' },
            queue: { type: 'array', items: { type: 'string' } },
            games: { type: 'array', items: { $ref: '#/components/schemas/Game' } },
            players: { type: 'array', items: { $ref: '#/components/schemas/Player' } }
          },
          required: ['id', 'courts', 'createdAt', 'queue', 'games', 'players']
        },
        EventCreate: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ev1' },
            courts: { type: 'integer', example: 2 },
            useMock: { type: 'boolean', example: true },
            players: { type: 'array', items: { $ref: '#/components/schemas/Player' } }
          }
        },
        SeedBody: {
          type: 'object',
          properties: {
            eventId: { type: 'string', example: 'ev1' },
            at: { type: 'string', format: 'date-time', example: '2025-09-16T20:00:00+07:00' }
          },
          required: ['eventId']
        },
        AdvanceBody: {
          type: 'object',
          properties: {
            eventId: { type: 'string', example: 'ev1' },
            courtId: { type: 'string', example: 'c1' },
            at: { type: 'string', format: 'date-time', example: '2025-09-16T20:25:00+07:00' }
          },
          required: ['eventId', 'courtId']
        },
        EventResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            event: { $ref: '#/components/schemas/Event' }
          }
        },
        StatusResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            status: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                courts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      currentGame: { $ref: '#/components/schemas/Game', nullable: true }
                    }
                  }
                },
                queue: { type: 'array', items: { $ref: '#/components/schemas/Player' } },
                players: { type: 'array', items: { $ref: '#/components/schemas/Player' } }
              }
            }
          }
        },
        AdvanceAllBody: {
          type: 'object',
          properties: {
            eventId: { type: 'string', example: 'ev1' },
            at: { type: 'string', format: 'date-time', example: '2025-09-16T20:25:00+07:00' }
          },
          required: ['eventId']
        }
      }
    },
    tags: [
      { name: 'Matchings', description: 'Badminton event matchmaking' }
    ],
  },
  apis: ['./src/routes/*.ts'],
});
