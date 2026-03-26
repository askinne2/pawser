import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import animalsRouter from './routes/animals';
import organizationsRouter from './routes/organizations';
import syncRouter from './routes/sync';
import authRouter from './routes/auth';
import tenantsRouter from './routes/tenants';
import subdomainRouter from './routes/subdomain';
import billingRouter from './routes/billing';
import usersRouter from './routes/users';
import membersRouter from './routes/members';
import settingsRouter from './routes/settings';

// Import sync worker to start it (it auto-starts on import)
import { syncWorker } from './jobs/sync-animals';

// Load environment variables from root .env file
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const app: Express = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pawser-api',
  });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/tenants', tenantsRouter);
app.use('/api/v1/subdomain', subdomainRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/animals', animalsRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/organizations/:orgId', membersRouter); // Members routes for each org
app.use('/api/v1/organizations/:orgId/settings', settingsRouter); // Settings routes for each org
app.use('/api/v1/sync', syncRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api/v1`);
  console.log(`🔄 Sync worker: ${syncWorker.isRunning() ? 'running' : 'starting...'}`);
});

export default app;

