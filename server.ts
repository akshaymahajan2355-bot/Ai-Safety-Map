import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import locationRoutes from './src/routes/locationRoutes';
import routeRoutes from './src/routes/routeRoutes';
import hazardRoutes from './src/routes/hazardRoutes';
import aiRoutes from './src/routes/aiRoutes';
import authRoutes from './src/routes/authRoutes';
import { syncInitialPotholesToFirestore } from './src/services/firebase/firebaseAdmin';
import { ALL_INITIAL_POTHOLES } from './src/database/seedPotholes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Sync initial dataset with Firestore in background if configured
  syncInitialPotholesToFirestore(ALL_INITIAL_POTHOLES).catch((err) => {
    console.warn('Background Firestore pothole sync skipped or failed:', err?.message || err);
  });

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Road Safety Assistant Backend',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  app.use('/api/location', locationRoutes);
  app.use('/api/routes', routeRoutes);
  app.use('/api/hazards', hazardRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/auth', authRoutes);

  // Vite middleware for development & static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Road Safety Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
