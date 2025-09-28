import express from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './config/swagger';
import authRoutes from './authRoutes';

// Ensure service-specific .env is loaded regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
// Raw OpenAPI JSON for aggregation
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpecs as any);
});

// MongoDB connection
const connectDB = async () => {
  try {
    const DB_URI = process.env.USER_DB_URI || 'mongodb://localhost:27017/birdie_auth';
    await mongoose.connect(DB_URI);
    console.log('Auth Service - MongoDB Connected');
    if (!process.env.USER_DB_URI) {
      console.warn('Auth Service - Using default local MongoDB URI; set USER_DB_URI in auth-service/.env to use Atlas');
    }
  } catch (error) {
    console.error('Auth Service - Database connection failed:', error);
    // Don't exit - let service start without DB for health checks
  }
};

connectDB();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

// Routes
app.use('/api/auth', authRoutes);

function startAuthService(port: number, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`🔐 Auth Service running on port ${port}`);
    console.log(`📘 Auth API docs: http://localhost:${port}/api-docs`);
  });

  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE' && attempt < 10) {
      const nextPort = port + 1;
      console.warn(`[Auth] Port ${port} in use. Retrying on ${nextPort} (attempt ${attempt + 1}/10)...`);
      setTimeout(() => startAuthService(nextPort, attempt + 1), 200);
    } else {
      console.error('[Auth] Failed to bind port:', err);
      process.exit(1);
    }
  });
}

startAuthService(BASE_PORT);
