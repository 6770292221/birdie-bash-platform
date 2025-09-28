import { SwaggerDefinition } from 'swagger-jsdoc';

export const swaggerDef: SwaggerDefinition = {
  openapi: '3.0.1',
  info: {
    title: 'Notification Microservice API',
    version: '1.0.0',
    description: 'Publish test events and view health. Worker consumes events.notification and writes history logs.'
  },
  components: {
    schemas: {
      TemplateSpec: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'event.created' },
          data: { type: 'object', additionalProperties: true }
        },
        required: ['id', 'data']
      },
      NotificationEvent: {
        type: 'object',
        properties: {
          channels: {
            type: 'array',
            items: { type: 'string', enum: ['email', 'sms', 'line', 'webPush'] }
          },
          template: { $ref: '#/components/schemas/TemplateSpec' },
          payload: {
            type: 'object',
            properties: {
              to: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  lineUserId: { type: 'string' }
                }
              },
              member: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  lineUserId: { type: 'string' }
                }
              },
              message: { type: 'string', description: 'fallback/override ถ้าไม่ใช้ template' },
              source: { type: 'string' }
            },
            required: ['source']
          },
          meta: { type: 'object', additionalProperties: true }
        },
        required: ['channels', 'payload'],
        example: {
          channels: ['email', 'sms', 'line'],
          template: {
            id: 'event.created',
            data: { eventName: 'Birdie Bash #2', eventDate: '2025-10-05', location: 'CU Stadium' }
          },
          payload: { to: { email: 'test@example.com', phone: '+66961234567' }, source: 'birdie-bash' },
          meta: { correlationId: 'tmpl-001' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/test/publish': {
      post: {
        summary: 'Publish a test notification event',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotificationEvent' }
            }
          }
        },
        responses: { '202': { description: 'Published' } }
      }
    },
    '/debug/rabbit': {
      get: {
        summary: 'Inspect Rabbit queue/consumer count',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object' } } }
          }
        }
      }
    }
  }
};
