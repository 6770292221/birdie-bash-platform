import express from 'express';
import { env } from './config/env';
import { connectMongo } from './config/mongo';
import health from './routes/health';
import docs from './routes/docs';
import testPublisher from './routes/testPublisher';
import pino from 'pino';

const log = pino({ transport: { target: 'pino-pretty' } });

async function bootstrap() {
  await connectMongo();
  const app = express();
  app.use(express.json());

  app.use('/health', health);
  app.use('/api-docs', docs); // Swagger UI
  app.use('/test', testPublisher); // helper endpoint to push events

  app.listen(env.port, () => log.info(`HTTP listening on :${env.port}`));
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
