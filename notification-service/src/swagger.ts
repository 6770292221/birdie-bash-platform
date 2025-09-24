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
      NotificationEvent: {
        type: 'object',
        properties: {
          channels: { type: 'array', items: { type: 'string', enum: ['email', 'sms', 'line'] } },
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
              message: { type: 'string' },
              source: { type: 'string' }
            },
            required: ['message', 'source']
          },
          meta: { type: 'object' }
        },
        required: ['channels', 'payload']
      }
    }
  }
};
