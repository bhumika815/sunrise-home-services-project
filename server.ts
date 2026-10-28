import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db';
import authRoutes from './server/routes/authRoutes';
import serviceRoutes from './server/routes/serviceRoutes';
import bookingRoutes from './server/routes/bookingRoutes';
import professionalRoutes from './server/routes/professionalRoutes';
import reviewRoutes from './server/routes/reviewRoutes';
import enquiryRoutes from './server/routes/enquiryRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import reportRoutes from './server/routes/reportRoutes';
import auditRoutes from './server/routes/auditRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
}

// In AI Studio environment, CLI arguments (--port 3000) take precedence.
// When behind reverse proxy Nginx (listening on container PORT=8080), the app must bind to port 3000.
// In direct/standalone deployments, custom PORT or APP_PORT is respected.
const cliPort = getArg('--port') || getArg('-p');
const PORT = Number(cliPort || process.env.APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));
const HOST = getArg('--host') || process.env.HOST || '0.0.0.0';

// Initialize SQLite database schema and initial data
initDatabase();

// Middleware
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Sunrise Home Services API',
    timestamp: new Date().toISOString(),
  });
});

export { app };

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

async function startServer() {
  if (isTest) {
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    // Serve static files from production build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Mount Vite middleware in development mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Sunrise Home Services] Full-Stack server running at http://${HOST}:${PORT}`);
  });
}

if (!isTest) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
