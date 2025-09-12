import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Birdie Event Service API",
    version: "1.0.0",
    description: "Event management microservice for Birdie Bash Platform",
  },
  servers: [
    { url: "http://localhost:3002", description: "Event Service (local)" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
        example: {
          code: "VALIDATION_ERROR",
          message: "maxParticipants must be >= 1",
          details: { field: "capacity.maxParticipants", min: 1 },
        },
      },
      Event: {
        type: "object",
        required: [
          "eventName",
          "eventDate",
          "location",
          "status",
          "capacity",
          "shuttlecockPrice",
          "courtHourlyRate",
        ],
        properties: {
          id: { type: "string", description: "Event ID (Mongo ObjectId)", readOnly: true },
          eventName: { type: "string", description: "Event name" },
          eventDate: { type: "string", description: "Event date (YYYY-MM-DD)" },
          location: { type: "string", description: "Location name" },
          createdBy: { type: "string", description: "User ID who created the event", readOnly: true },
          status: {
            type: "object",
            properties: {
              state: {
                type: "string",
                enum: ["active", "canceled", "completed"],
              },
              isAcceptingRegistrations: { type: "boolean" },
            },
          },
          capacity: {
            type: "object",
            required: ["maxParticipants"],
            properties: {
              maxParticipants: { type: "number", minimum: 1 },
              currentParticipants: { type: "number" },
              availableSlots: { type: "number" },
              waitlistEnabled: { type: "boolean" },
            },
          },
          shuttlecockPrice: { type: "number" },
          courtHourlyRate: { type: "number" },
          courts: {
            type: "array",
            items: {
              type: "object",
              required: ["courtNumber", "startTime", "endTime"],
              properties: {
                courtNumber: { type: "number" },
                startTime: { type: "string" },
                endTime: { type: "string" },
              },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      EventCreate: {
        type: "object",
        required: [
          "eventName",
          "eventDate",
          "location",
          "capacity",
          "shuttlecockPrice",
          "courtHourlyRate",
        ],
        properties: {
          eventName: { type: "string" },
          eventDate: { type: "string" },
          location: { type: "string" },
          status: { $ref: "#/components/schemas/Event/properties/status" },
          capacity: { $ref: "#/components/schemas/Event/properties/capacity" },
          shuttlecockPrice: { type: "number" },
          courtHourlyRate: { type: "number" },
          courts: { $ref: "#/components/schemas/Event/properties/courts" },
        },
      },
      EventUpdate: {
        type: "object",
        properties: {
          eventName: { type: "string" },
          eventDate: { type: "string" },
          location: { type: "string" },
          status: { $ref: "#/components/schemas/Event/properties/status" },
          capacity: { $ref: "#/components/schemas/Event/properties/capacity" },
          shuttlecockPrice: { type: "number" },
          courtHourlyRate: { type: "number" },
          courts: { $ref: "#/components/schemas/Event/properties/courts" },
        },
      },
      EventStatus: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["active", "canceled", "completed"] },
          maxParticipants: { type: "number" },
          currentParticipants: { type: "number" },
          availableSlots: { type: "number" },
          isAcceptingRegistrations: { type: "boolean" },
          waitlistEnabled: { type: "boolean" },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ["src/routes/*.ts", "src/controllers/*.ts"],
};

const specs = swaggerJSDoc(options);
export default specs;
