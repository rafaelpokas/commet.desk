import 'dotenv/config';
import brandAssetsRouter from './server/routes/brandAssets.js';
import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import authRouter from './server/routes/auth.js';
import usersRouter from './server/routes/users.js';
import clientsRouter from './server/routes/clients.js';
import channelAssigneesRouter from './server/routes/channelAssignees.js';
import deliveriesRouter from './server/routes/deliveries.js';
import tasksRouter from './server/routes/tasks.js';
import plansRouter from './server/routes/plans.js';
import requestsRouter from './server/routes/requests.js';
import commentsRouter from './server/routes/comments.js';
import notificationsRouter from './server/routes/notifications.js';
import metricsRouter from './server/routes/metrics.js';
import { requireAuth, AuthenticatedRequest } from './server/auth.js';
import { db } from './server/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '20mb' }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/brand', brandAssetsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/channel-assignees', channelAssigneesRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/plans', plansRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/metrics', metricsRouter);

// Audit logs endpoint (AC01: filtered by client for client users)
app.get('/api/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { deliveryId, clientId } = req.query;
  let logs = db.getAuditLogs();

  if (deliveryId) {
    logs = logs.filter(l => l.deliveryId === String(deliveryId));
  }

  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    // Client sees only their client's public logs (AC01, RF23)
    logs = logs.filter(l => l.clientId === currentUser.clientId && l.isPublicForClient);
  } else if (clientId) {
    logs = logs.filter(l => l.clientId === String(clientId));
  }

  // Sort newest first
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ logs });
});

async function startServer() {
  if (isProd) throw new Error('Autenticação ainda é de piloto. Configure autenticação real antes de expor em produção.');
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Commet Ecosystem Server running on http://127.0.0.1:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
