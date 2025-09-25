# Notification Microservice

Consumes **events.notification** from RabbitMQ and sends notifications via **email**, **sms**, **line**, then writes a history log to MongoDB. Includes Swagger UI.

## 1) Install libs

```bash
npm init -y
npm i amqplib dotenv express mongoose swagger-jsdoc swagger-ui-express nodemailer twilio axios pino pino-pretty
npm i -D typescript ts-node nodemon @types/node @types/express @types/nodemailer @types/swagger-jsdoc @types/swagger-ui-express
npx tsc --init
```

## 2) Infra (dev)

```bash
docker compose up -d   # starts MongoDB, RabbitMQ, MailHog
# RabbitMQ UI: http://localhost:15672 (guest/guest)
# MailHog UI (email inbox): http://localhost:8025
```

## 3) Configure env

Duplicate `.env.example` to `.env` and fill in credentials. For dev email, create Ethereal SMTP (or use any SMTP).

## 4) Run HTTP API (Swagger) & Worker

Terminal A (API):
<<<<<<< HEAD

=======
>>>>>>> origin/main
```bash
npm run dev
```

Terminal B (Worker):
<<<<<<< HEAD

=======
>>>>>>> origin/main
```bash
npm run worker
```

## 5) Test via Swagger or curl

Open Swagger UI: `http://localhost:8080/docs`

### Publish a test event
<<<<<<< HEAD

=======
>>>>>>> origin/main
```bash
curl -X POST http://localhost:8080/test/publish \
  -H 'Content-Type: application/json' \
  -d '{
    "channels": ["email", "sms", "line"],
    "payload": {
      "to": { "email": "someone@example.com", "phone": "+66961234567" },
      "message": "สวัสดี นี่คือข้อความทดสอบ",
      "source": "find-badminton-buddy"
    },
    "meta": { "correlationId": "abc-123" }
  }'
```

The worker will consume the message and write a document in `NotificationLog` collection.

### Query RabbitMQ bindings (optional)
<<<<<<< HEAD

=======
>>>>>>> origin/main
Routing key used: `events.notification` on exchange `events`, queue `notification.events`.

## 6) Validate logs in MongoDB

```bash
docker exec -it $(docker ps -qf name=mongo) mongosh notification_db --eval 'db.notificationlogs.find().sort({ _id: -1 }).limit(1).pretty()'
```

## 7) Notes & Hardening
<<<<<<< HEAD

=======
>>>>>>> origin/main
- Add retry & dead-letter exchange for failed deliveries.
- Per-channel rate limiting & backoff.
- Schema validation (e.g., zod or Joi) before publishing/consuming.
- For LINE Messaging API by userId, swap provider to use push message endpoint (requires channel access token + user consent).
- Protect `/test/publish` in production (authN/Z).
- Store user types (anonymous vs member) as structured fields if you need analytics.
