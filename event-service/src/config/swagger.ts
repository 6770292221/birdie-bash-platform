import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Birdie Event Service API",
    version: "1.0.0",
    description: "Event management microservice for Birdie Bash Platform",
  },
  servers: [
    { url: "http://localhost:3003", description: "Event Service (local)" },
  ],
  tags: [
    { name: "Events", description: "Event management" },
    { name: "Venues", description: "Badminton venue information" }
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
          updatedBy: { type: "string", description: "User ID who last updated the event", readOnly: true },
          status: {
            type: "string",
            enum: [
              "upcoming",
              "in_progress",
              "calculating",
              "awaiting_payment",
              "completed",
              "canceled"
            ],
            description: "Current event status",
          },
          capacity: {
            type: "object",
            required: ["maxParticipants", "currentParticipants", "availableSlots"],
            properties: {
              maxParticipants: { type: "number", minimum: 1 },
              currentParticipants: { type: "number", minimum: 0 },
              availableSlots: { type: "number", minimum: 0 },
              waitlistEnabled: { type: "boolean" },
            },
          },
          shuttlecockPrice: { type: "number" },
          courtHourlyRate: { type: "number" },
          penaltyFee: { type: "number", minimum: 0, description: "Penalty fee amount" },
          shuttlecockCount: { type: "number", minimum: 0, description: "Number of shuttlecocks" },
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
          capacity: {
            type: "object",
            required: ["maxParticipants"],
            properties: {
              maxParticipants: { type: "number", minimum: 1 },
              waitlistEnabled: { type: "boolean" },
            },
          },
          shuttlecockPrice: { type: "number" },
          courtHourlyRate: { type: "number" },
          penaltyFee: { type: "number", minimum: 0, description: "Penalty fee amount (optional)" },
          shuttlecockCount: { type: "number", minimum: 0, description: "Number of shuttlecocks (optional)" },
          courts: { $ref: "#/components/schemas/Event/properties/courts" },
        },
        example: {
          eventName: "Weekend Badminton Meetup",
          eventDate: "2025-09-21",
          location: "Bangkok Sports Complex",
          capacity: {
            maxParticipants: 20,
            waitlistEnabled: true
          },
          shuttlecockPrice: 25,
          courtHourlyRate: 200,
          penaltyFee: 50,
          shuttlecockCount: 10,
          courts: [
            {
              courtNumber: 1,
              startTime: "18:00",
              endTime: "20:00"
            },
            {
              courtNumber: 2,
              startTime: "20:00",
              endTime: "22:00"
            }
          ]
        }
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
          penaltyFee: { type: "number", minimum: 0, description: "Penalty fee amount" },
          shuttlecockCount: { type: "number", minimum: 0, description: "Number of shuttlecocks" },
          courts: { $ref: "#/components/schemas/Event/properties/courts" },
        },
      },
      EventStatus: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { 
            type: "string", 
            enum: [
              "upcoming",
              "in_progress",
              "calculating",
              "awaiting_payment",
              "completed",
              "canceled"
            ] 
          },
          maxParticipants: { type: "number" },
          currentParticipants: { type: "number" },
          availableSlots: { type: "number" },
          isAcceptingRegistrations: { type: "boolean" },
          waitlistEnabled: { type: "boolean" },
        },
      },
      RegisterByUser: {
        type: "object",
        properties: {
          startTime: { type: "string", description: "Start time (HH:mm)" },
          endTime: { type: "string", description: "End time (HH:mm)" },
        },
        example: {
          startTime: "20:00",
          endTime: "22:00"
        }
      },
      RegisterByGuest: {
        type: "object",
        required: ["name", "phoneNumber"],
        properties: {
          name: { type: "string", description: "Guest name" },
          phoneNumber: { type: "string", description: "Phone number (required)" },
          startTime: { type: "string", description: "Start time (HH:mm)" },
          endTime: { type: "string", description: "End time (HH:mm)" },
        },
        example: {
          name: "John Guest",
          phoneNumber: "+66812345678",
          startTime: "18:00",
          endTime: "20:00"
        }
      },
      Player: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event ID" },
          playerId: { type: "string", description: "Player ID" },
          userId: { type: "string", nullable: true, description: "User ID (null for guests)" },
          name: { type: "string", nullable: true, description: "Player name" },
          email: { type: "string", nullable: true, description: "Player email" },
          phoneNumber: { type: "string", description: "Player phone number (required)" },
          startTime: { type: "string", nullable: true, description: "Preferred start time" },
          endTime: { type: "string", nullable: true, description: "Preferred end time" },
          registrationTime: { type: "string", format: "date-time", description: "Registration timestamp" },
          status: { type: "string", enum: ["registered", "waitlist", "cancelled"], description: "Registration status" },
          createdBy: { type: "string", nullable: true, description: "Admin user ID who created this guest registration (null for user registrations)" },
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
