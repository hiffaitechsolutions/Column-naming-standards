import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import config from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

console.log('🔌 Connecting to database...');
await connectDB();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

app.use(cors({
  origin: ['https://app2.hiffaitechsolutions.com', 'https://hiffaitechsolutions.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Handle preflight requests
app.options('*', cors());

if (config.app.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.app.cookieSecret));

app.set('trust proxy', 1);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (config.features.rateLimiting) {
  console.log('🔒 Rate limiting ENABLED');
  app.use(globalRateLimiter);
} else {
  console.log('⚠️  Rate limiting DISABLED');
}

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Data Validation Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/v1/docs'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const dbStatus = mongoose.default.connection.readyState;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus === 1 ? 'connected' : 'disconnected',
      environment: config.app.env
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message
    });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.app.port;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DATA VALIDATION PLATFORM - BACKEND');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${config.app.env}`);
  console.log(`🗄️  Database: ${config.db.type === 'atlas' ? 'MongoDB Atlas' : 'MongoDB'}`);
  console.log(`💳 Payments: ${config.features.payments ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  console.log(`🔒 Rate Limiting: ${config.features.rateLimiting ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  console.log(`🌐 CORS: ENABLED for all origins (development)`);
  console.log('='.repeat(60) + '\n');
});

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      const mongoose = await import('mongoose');
      await mongoose.default.connection.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  setTimeout(() => {
    console.error('⚠️  Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  if (!config.app.isDevelopment) {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;