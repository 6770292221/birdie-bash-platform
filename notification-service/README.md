# Notification Microservice

Consumes `events` from **RabbitMQ** and delivers notifications via **email**, **sms**, and **line**, then writes a delivery history to **MongoDB**. Ships with **Swagger UI** for testing.

> The repo contains two processes:
> - **HTTP API (Express)** → `/docs`, `/health`, `/test/publish` (+ `/debug/rabbit` if present)
> - **Worker** → consumes from the queue and calls providers; persists results in MongoDB

---

## Architecture (at a glance)

- **Exchange**: `RABBIT_EXCHANGE` (default: `events`, type **topic**)
- **Queue**: `RABBIT_NOTIFY_QUEUE` (default: `events.notification`)
- **Binding key**: `RABBIT_NOTIFY_BIND_KEY` (default: `event.#`)
- **MongoDB**: collection `NotificationLog`
- **Providers**: Nodemailer (SMTP), Twilio (SMS), LINE Notify (Line)
- **Templates**: lightweight `{{var}}` rendering in `src/templates/templates.ts`

```
[publisher] -- event.created --> [RabbitMQ exchange: events(topic)]
                                   |-> (bind: event.#) -> [queue: events.notification] -> [worker]
                                                              |-> email / sms / line -> [NotificationLog (Mongo)]
```

---

## Requirements

- Node.js 18+
- Docker (for local MongoDB, RabbitMQ, MailHog)
- TypeScript

---

## Install dependencies

```bash
npm init -y
npm i amqplib dotenv express mongoose swagger-jsdoc swagger-ui-express nodemailer twilio axios pino pino-pretty
npm i -D typescript ts-node nodemon @types/node @types/express @types/nodemailer @types/swagger-jsdoc @types/swagger-ui-express
npx tsc --init
```

> **TypeScript + amqplib**
> - Use `import * as amqp from 'amqplib'`.
> - If your environment fails to load types, install `npm i -D @types/amqplib` or add a shim at `src/types/amqplib-shim.d.ts`.

---

## Dev Infra (Docker)

```bash
docker compose up -d  # starts MongoDB, RabbitMQ (with UI), MailHog
# RabbitMQ UI: http://localhost:15672  (guest/guest)
# MailHog UI : http://localhost:8025   (captures dev emails)
```

If you run containers manually:
- rabbitmq:4.1.4-management → map `5672:5672`, `15672:15672`
- mongo:7 → map `27017:27017`
- mailhog:v1.0.1 → map `1025:1025`, `8025:8025`

---

## Configuration (.env)

Use the following keys (exact names expected by the code):

```ini
# Core
PORT=3009
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/notification_db

# RabbitMQ
RABBIT_URL=amqp://guest:guest@localhost:5672
RABBIT_EXCHANGE=events
RABBIT_NOTIFY_QUEUE=events.notification
RABBIT_NOTIFY_BIND_KEY="event.#"

# Providers
# Email (Nodemailer SMTP or Ethereal for dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Notifier <no-reply@example.com>"

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM=+15005550006

# LINE Notify or Messaging API (use Notify for simplicity)
LINE_NOTIFY_TOKEN=your_line_notify_token
```

**Notes**
- When Node runs **outside** Docker, keep hosts as `localhost` (don’t use container names).
- SMTP auth is **optional** for MailHog; leave `SMTP_USER/SMTP_PASS` blank.

---

## Run

`package.json` (scripts should look like this):
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "worker": "ts-node src/worker/notificationWorker.ts"
  }
}
```

Start both processes in separate terminals:
```bash
# A) HTTP API + Swagger
npm run dev

# B) Queue worker
npm run worker
```

Once running:
- Swagger → `http://localhost:3009/api-docs`
- Health  → `GET http://localhost:3009/health` → `{"status":"ok"}`
- Debug   → `GET http://localhost:3009/debug/rabbit` (if the route exists) shows `messageCount` / `consumerCount`

---

## Test the flow

### 1) Plain message (no template)
```bash
curl -X POST http://localhost:3009/test/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["email", "sms", "line"],
    "payload": {
      "to": { "email": "someone@example.com", "phone": "+66961234567" },
      "message": "Hello from queue",
      "source": "manual-test"
    },
    "meta": { "correlationId": "abc-123" }
  }'
```
> The API publishes to the exchange with a sample routing key like `event.created` (your binding `event.#` will match it). The worker processes the message and inserts a document into `NotificationLog`.

### 2) Using templates
We ship `messageTemplates` and a tiny `render()` that supports `{{var}}`. Example:
```bash
curl -X POST http://localhost:3009/test/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["email","sms","line"],
    "template": {
      "id": "event.created",
      "data": { "eventName": "Birdie Bash #2", "eventDate": "2025-10-05", "location": "CU Stadium" }
    },
    "payload": {
      "to": { "email": "someone@example.com", "phone": "+66961234567" },
      "source": "birdie-bash"
    },
    "meta": { "correlationId": "tmpl-001" }
  }'
```

**Where to see results**
- Email → MailHog UI at `http://localhost:8025`
- DB → `NotificationLog` in MongoDB
  ```bash
  docker exec -it $(docker ps -qf name=mongo) mongosh notification_db --eval 'db.notificationlogs.find().sort({_id:-1}).limit(5).pretty()'
  ```

---

## File layout (important for navigation)

```
src/
  config/
    env.ts           # loads .env (SMTP auth optional)
    rabbit.ts        # connect + assert (exchange/queue/bind) + publish/consume
    mongo.ts         # Mongo connection
  providers/
    emailProvider.ts # sendEmail(to, subject, message)
    smsProvider.ts   # Twilio (optional in dev)
    lineProvider.ts  # LINE Notify (optional)
  templates/
    templates.ts     # render {{var}}, messageTemplates, buildMessages()
  models/
    NotificationLog.ts
  routes/
    health.ts        # GET /health  (mounted with app.use('/health', ...))
    testPublisher.ts # POST /test/publish (mounted with app.use('/test', ...))
    docs.ts          # Swagger UI (mounted with app.use('/docs', ...))
    debug.ts         # (optional) GET /debug/rabbit
  worker/
    notificationWorker.ts  # consume -> dispatch -> log
  server.ts          # API bootstrap
```

> **Route prefix rule**: Inside routers, use local paths like `router.post('/publish', ...)`. Mount with `app.use('/test', router)` so the final path is `/test/publish` (avoid `/test/test/publish`).

---

## RabbitMQ topology

The worker asserts topology on startup, but the equivalent manual setup is:
- Exchange: `events` (topic, durable) — from `RABBIT_EXCHANGE`
- Queue: `events.notification` (durable) — from `RABBIT_NOTIFY_QUEUE`
- Binding: `event.#` — from `RABBIT_NOTIFY_BIND_KEY`

In the Rabbit UI, the `Consumers` count on the queue should be **> 0** while the worker is running.

---

## Troubleshooting

- **Swagger shows “No operations defined in spec!”**  
  Add `paths` directly in `swaggerDef`, or configure `swagger-jsdoc` with `definition:` and `apis: ['./src/**/*.ts']` so it scans route JSDoc.
- **`GET /health` → 404**  
  Ensure `health.ts` uses `router.get('/')` and `server.ts` mounts `app.use('/health', health)`.
- **Published but the worker doesn’t log**  
  Check `/debug/rabbit`: `consumerCount` must be > 0. Verify `.env` points to the correct broker and that exchange/queue/binding exist.
- **No email in MailHog**  
  When Node runs outside Docker, use `SMTP_HOST=localhost`; leave `SMTP_USER/PASS` empty for MailHog.
- **TypeScript errors with `amqplib`**  
  Use `import * as amqp from 'amqplib'` with `@types/amqplib` or add the shim.

---

## Hardening / Next steps

- DLX + retry for transient provider failures
- Schema validation (zod/Joi) on publish/consume
- Per-channel rate limiting + exponential backoff
- Move LINE to Messaging API (push by userId) when you have consent/tokens
- Protect `/test/publish` in production (AuthN/Z)
- Observability: metrics, tracing, readiness/liveness probes

---

## License

MIT (or choose your own)
