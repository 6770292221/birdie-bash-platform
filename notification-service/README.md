# Badminton Notification Service

Event-driven notification service (Email/SMS) for BBP. It listens to **RabbitMQ** events, fetches event details, selects recipients, and sends notifications. It uses **MongoDB** for idempotency and throttling. A **Swagger** UI is included for quick testing.

- Supported events: `created`, `updated`, `deleted`
- Channels: **Email** (SMTP/MailHog) and **SMS** (SMSOK)
- Duplicate protection: **Idempotent lock (TTL)** + **Throttle**
- Recipient selection:
  - `created`, `updated` → all users (role = `user`)
  - `deleted` → only players who joined the event **+ the event creator**

---

## Architecture (overview)

```
Event Service ──► RabbitMQ (topic: events)
                      │
                      ▼
         notification-service
            ├─ fetch Event detail (EVENTS_API_BASE)
            ├─ select recipients (Users DB / Registration API)
            ├─ dedupe (ProcessedEvent) + throttle (EventThrottle)
            ├─ send Email (SMTP/MailHog)
            └─ send SMS (SMSOK)
```

---

## Requirements

- Node.js 20+ (if running locally without Docker)
- MongoDB (Atlas or local)
- RabbitMQ 3.12+ (management UI at 15672 is convenient)
- MailHog for dev (SMTP: 1025, Web UI: 8025)

---

## Environment Variables

| KEY | Example / Recommended | Purpose |
|---|---|---|
| `PORT` | `3007` | HTTP port |
| `NODE_ENV` | `development` | Node environment |
| `DRY_RUN` | `false` | `true` = simulate; do not actually send |
| `BROADCAST_CHANNELS` | `email,sms` | Enable channels |
| `MONGODB_URI` | `.../registration?...` | Main DB for this service (stores locks/throttles) |
| `USERS_DB_URI` | `.../user?...` | If Users are stored in a separate DB, set this |
| `RABBIT_URL` | `amqp://admin:password123@rabbitmq:5672` | AMQP URL |
| `RABBIT_EXCHANGE` | `events` | Topic exchange name |
| `RABBIT_QUEUE` | `events.notification` | Queue name |
| `RABBIT_BIND_KEY` | `event.#` | Binding key |
| `CONSUMER_RETRY_MS` | `5000` | Reconnect delay (ms) |
| `DEDUP_TTL_SECONDS` | `604800` | Lock TTL (7d default) |
| `CONSUME_MIN_INTERVAL_MS` | `60000` | Throttle window per `<type>:<eventId>` (ms) |
| `THROTTLE_TTL_SECONDS` | `2592000` | TTL to garbage-collect throttle docs |
| `SMTP_HOST` | `mailhog` | In Docker use **service name**, not `localhost` |
| `SMTP_PORT` | `1025` | SMTP port |
| `EMAIL_FROM` | `BBP Notify <no-reply@bbp.local>` | From header |
| `SMSOK_BASE` | `https://api.smsok.co` | SMS OK base URL |
| `SMSOK_AUTH` | `Basic …` | Authorization header for SMSOK |
| `SMS_SENDER` | `SMSOK` | Sender (must be approved by provider) |
| `FORCE_NO_SENDER` | `false` | `true` = do not send `sender` field (workaround for error 114) |
| `SMS_CALLBACK_URL` | `https://…/sms/callback` | Provider callback URL |
| `EVENTS_API_BASE` | `http://event-service:3003` | Event API base (do **not** use `localhost` in container) |
| `EVENTS_API_PATH` | `/api/events/:id` | Event detail path template |
| `REG_API_BASE` | `http://registration-service:3005` | Registration API base |
| `REG_API_PLAYERS_PATH` | `/api/registration/events/:id/players?limit=1000&offset=0` | Players path template |

> In Docker, **never** call other services via `localhost`. Use **service names**: `event-service`, `mailhog`, `rabbitmq`, etc.

---

## Quick Start (Docker recommended)

Example service block in `docker-compose.yml`:

```yaml
notification-service:
  build: ./notification-service
  container_name: birdie-notification-service
  restart: unless-stopped
  ports: ["3007:3007"]
  environment:
    - PORT=3007
    - NODE_ENV=development
    - DRY_RUN=false
    - BROADCAST_CHANNELS=email,sms
    - MONGODB_URI=mongodb+srv://.../registration?...
    # - USERS_DB_URI=mongodb+srv://.../user?...
    - RABBIT_URL=amqp://admin:password123@rabbitmq:5672
    - RABBIT_EXCHANGE=events
    - RABBIT_QUEUE=events.notification
    - RABBIT_BIND_KEY=event.#
    - DEDUP_TTL_SECONDS=604800
    - CONSUME_MIN_INTERVAL_MS=60000
    - THROTTLE_TTL_SECONDS=2592000
    - SMTP_HOST=mailhog
    - SMTP_PORT=1025
    - EMAIL_FROM=BBP Notify <no-reply@bbp.local>
    - SMSOK_BASE=https://api.smsok.co
    - SMSOK_AUTH=Basic XXXXX
    - SMS_SENDER=SMSOK
    - SMS_CALLBACK_URL=https://your-callback-url.com/sms/callback
    - FORCE_NO_SENDER=false
    - EVENTS_API_BASE=http://event-service:3003
    - EVENTS_API_PATH=/api/events/:id
    - REG_API_BASE=http://registration-service:3005
    - REG_API_PLAYERS_PATH=/api/registration/events/:id/players?limit=1000&offset=0
  depends_on:
    - rabbitmq
    - mailhog
```

Run:
```bash
docker compose build --no-cache notification-service
docker compose up -d notification-service
docker compose logs -f notification-service
```

You should see:
```
[rabbit] connected ...
[rabbit] bound queue=events.notification → exchange=events key=event.#
notification-consumer ready.
```

Check runtime ENV:
```bash
docker compose exec notification-service sh -lc 'echo DRY_RUN=$DRY_RUN SMTP_HOST=$SMTP_HOST EVENTS_API_BASE=$EVENTS_API_BASE'
```

---

## API & Swagger

Open: `http://localhost:3007/api-docs`

### `POST /test/publish`
Publish a test event to RabbitMQ (routing key: `event.created`).

```json
{
  "eventType": "created",
  "data": {
    "eventId": "68e0b551313553447ad5d360",
    "eventName": "WBM 3",
    "eventDate": "2025-10-29",
    "location": "71 Sport Club",
    "venue": "71 Sport Club",
    "createdBy": "68dfaa4ce7e2ded0efa24fad"
  },
  "timestamp": "2025-10-04T05:49:05.664Z",
  "service": "event-service"
}
```

### `POST /test/broadcast/{eventId}/{type}`
Trigger broadcast directly (bypass queue) for testing.  
`type ∈ { created, updated, deleted }`

### `GET /health`
Service health check.

---

## Message Schema

```ts
type EventType = "created" | "updated" | "deleted";

interface EventBase<T extends EventType> {
  eventType: T;
  timestamp: string;            // ISO date-time
  service: "event-service";
}

interface EventCreated extends EventBase<"created"> {
  data: { eventId: string; eventName?: string; eventDate?: string; location?: string; venue?: string; createdBy?: string; };
}
interface EventUpdated extends EventBase<"updated"> {
  data: { eventId: string; updatedBy?: string; eventName?: string; eventDate?: string; location?: string; venue?: string; };
}
interface EventDeleted extends EventBase<"deleted"> {
  data: { eventId: string; deletedBy?: string; eventName?: string; eventDate?: string; location?: string; venue?: string; status?: string; };
}
```

Example `deleted` message:
```json
{
  "eventType": "deleted",
  "data": {
    "eventId": "68dfd1e3df959c525a83319e",
    "deletedBy": "68dfaa4ce7e2ded0efa24fad",
    "eventName": "Weekend Badminton Meetup",
    "eventDate": "2025-10-21",
    "location": "Bangkok Sports Complex",
    "venue": "Bangkok Sports Complex",
    "status": "canceled"
  },
  "timestamp": "2025-10-04T05:30:56.456Z",
  "service": "event-service"
}
```

---

## Recipient Logic

| Event | Recipients |
|---|---|
| `created`, `updated` | All users (role = `user`) from Users DB |
| `deleted` | Players who joined the event (Registration API) **+ the creator** (`createdBy`) |

> Recipients are deduplicated by `email|phone` to avoid double sends.

---

## Idempotency & Throttle

- **Idempotent lock (`ProcessedEvent`)**  
  Key = `<type>:<eventId>`, persisted with `expireAt` TTL (from `DEDUP_TTL_SECONDS`).  
  - First insert wins → that consumer owns the send.  
  - Duplicate key (E11000) → already processed → skip.  
  - If sending fails → remove the key and `nack(requeue)` so it can be retried.

- **Throttle (`EventThrottle`)**  
  Rate-limit per `<type>:<eventId>` using `CONSUME_MIN_INTERVAL_MS`.  
  Messages within the window are skipped to avoid bursts.

> Want to allow “re-send sooner”? Decrease `DEDUP_TTL_SECONDS`, or set it very low and rely mainly on throttle.

---

## Email & SMS

- **Email (SMTP/MailHog)**  
  - In Docker: `SMTP_HOST=mailhog`, `SMTP_PORT=1025`  
  - UI: `http://localhost:8025` (use the **HTML** tab)

- **SMS (SMSOK)**  
  - If you get `ERROR_FORM_SENDER_FAILURE (114)`, temporarily set `FORCE_NO_SENDER=true`  
  - Direct provider test:
    ```bash
    curl -X POST https://api.smsok.co/s       -H 'Content-Type: application/json'       -H 'Authorization: Basic <YOUR_TOKEN>'       -d '{
        "sender": "SMSOK",
        "text": "Test Message. From BBP !!!",
        "destinations": [{ "destination": "+669XXXXXXXX" }],
        "callback_url": "https://your-callback-url.com/sms/callback",
        "callback_method": "POST"
      }'
    ```

---

## Testing Checklist

1) Ensure `DRY_RUN=false` (to actually send to MailHog/SMSOK):
```bash
docker compose exec notification-service sh -lc 'echo DRY_RUN=$DRY_RUN'
```

2) Verify consumer is bound to the queue:
- RabbitMQ UI (15672) → Queue `events.notification` shows **Consumers = 1**

3) Trigger events:
- Swagger `/test/publish` or `/test/broadcast/{eventId}/{type}`

4) Validate results:
- MailHog UI shows HTML emails
- Service logs: `broadcast result: { emails: X, sms: Y, people: K }`

5) Re-send to test dedupe/throttle:
- Rapid repeats → `[throttle] skip burst`
- After 60s but still within TTL → `[idempotent] already processed, skip`

> To re-test the same event immediately, remove the dedupe key:
```js
// In mongosh (DB referred by MONGODB_URI)
db.ProcessedEvents.deleteMany({ key: { $in: [
  "created:<eventId>", "updated:<eventId>", "deleted:<eventId>"
]}});
```

---

## Troubleshooting

- **Container name conflict**  
  `docker rm -f birdie-notification-service && docker compose up -d notification-service`

- **SMTP `ECONNREFUSED 127.0.0.1:1025` (in Docker)**  
  Use `SMTP_HOST=mailhog` (not `localhost`).

- **MailHog `452 Unable to store message` (Windows + maildir)**  
  Use in-memory storage (remove `-storage=maildir` and related volumes).

- **Users list is empty**  
  Notification service connects to DB `registration` while Users are in DB `user`. Set `USERS_DB_URI` correctly (or point `MONGODB_URI` to `user`).

- **EVENTS_API refused (`http://localhost:3003`) in container**  
  Use `http://event-service:3003` or `http://host.docker.internal:3003`.

- **API returns `{ emails: 0, sms: 0, people: 0, dryRun: true }`**  
  `DRY_RUN` is still `true`, or you’re calling a different instance.

---

## Security

- Keep secrets in `.env` or a secret manager.
- Service logs avoid dumping full email/SMS payloads to reduce PII leakage.

---

## License

Internal / Project use only.
