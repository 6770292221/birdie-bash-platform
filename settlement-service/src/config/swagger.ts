import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Birdie Settlement Service API",
    version: "1.0.0",
    description: "Settlement management microservice for Birdie Bash Platform - HTTP-to-gRPC bridge for Payment Service",
  },
  servers: [
    { url: "http://localhost:3006", description: "Settlement Service (local)" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["success", "code", "message"],
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string" },
          message: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
        example: {
          success: false,
          code: "SETTLEMENT_CHARGE_FAILED",
          message: "Failed to issue settlement charge",
          details: { error: "Payment Service unavailable" },
        },
      },
      SettlementChargeRequest: {
        type: "object",
        required: ["player_id", "amount"],
        properties: {
          event_id: { type: "string", description: "Event ID (optional)" },
          player_id: { type: "string", description: "Player ID" },
          amount: { type: "number", description: "Amount to charge", minimum: 0.01 },
          currency: { type: "string", description: "Currency code", default: "THB" },
          description: { type: "string", description: "Settlement description" },
          payment_method_id: { type: "string", description: "Payment method ID" },
          metadata: { type: "object", additionalProperties: { type: "string" }, description: "Additional metadata" },
        },
        example: {
          event_id: "event_123",
          player_id: "player_456",
          amount: 150.00,
          currency: "THB",
          description: "Event registration settlement",
          payment_method_id: "pm_card_visa"
        }
      },
      SettlementResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              settlement_id: { type: "string" },
              payment_id: { type: "string" },
              status: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"] },
              amount: { type: "number" },
              currency: { type: "string" },
              client_secret: { type: "string", description: "Base64 encoded payment data for QR code" },
              payment_intent_id: { type: "string" },
              created_at: { type: "integer", format: "int64" },
              updated_at: { type: "integer", format: "int64" },
            }
          },
          message: { type: "string" },
        },
        example: {
          success: true,
          data: {
            settlement_id: "pay_1234567890",
            payment_id: "pay_1234567890",
            status: "PENDING",
            amount: 150.00,
            currency: "THB",
            client_secret: "eyJhbW91bnQiOjE1MC4wLCJjdXJyZW5jeSI6IlRIQiJ9",
            payment_intent_id: "pi_1234567890",
            created_at: 1726311000,
            updated_at: 1726311000
          },
          message: "Settlement charge issued successfully"
        }
      },
      ConfirmPaymentRequest: {
        type: "object",
        properties: {
          payment_method_id: { type: "string", description: "Payment method ID" },
          payment_intent_id: { type: "string", description: "Payment intent ID" },
        },
        example: {
          payment_method_id: "pm_card_visa",
          payment_intent_id: "pi_1234567890"
        }
      },
      RefundRequest: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to refund (optional - full refund if not specified)" },
          reason: { type: "string", description: "Refund reason" },
        },
        example: {
          amount: 75.00,
          reason: "Event cancelled"
        }
      },
      SettlementStatusResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              settlement_id: { type: "string" },
              payment_id: { type: "string" },
              status: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"] },
              amount: { type: "number" },
              currency: { type: "string" },
              refunded_amount: { type: "number" },
              event_id: { type: "string" },
              player_id: { type: "string" },
              created_at: { type: "integer", format: "int64" },
              updated_at: { type: "integer", format: "int64" },
              last_status_change: { type: "integer", format: "int64" },
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: ["CHARGE", "REFUND", "AUTHORIZATION"] },
                    amount: { type: "number" },
                    status: { type: "string" },
                    transaction_id: { type: "string" },
                    timestamp: { type: "integer", format: "int64" },
                    metadata: { type: "object", additionalProperties: { type: "string" } }
                  }
                }
              }
            }
          },
          message: { type: "string" },
        }
      },
      PlayerSettlementsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              player_id: { type: "string" },
              settlements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    settlement_id: { type: "string" },
                    payment_id: { type: "string" },
                    status: { type: "string" },
                    amount: { type: "number" },
                    currency: { type: "string" },
                    refunded_amount: { type: "number" },
                    event_id: { type: "string" },
                    created_at: { type: "integer", format: "int64" },
                    updated_at: { type: "integer", format: "int64" },
                  }
                }
              }
            }
          },
          message: { type: "string" },
        }
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