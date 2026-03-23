require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');

const { generalLimiter }                    = require('./middleware/rateLimit.middleware');
const { errorMiddleware, notFoundHandler }  = require('./middleware/error.middleware');
const logger                                = require('./config/logger');

// Route modules
const authRoutes         = require('./modules/auth/auth.routes');
const validationRoutes   = require('./modules/validation/validation.routes');
const subscriptionRoutes = require('./modules/subscription/subscription.routes');
const dashboardRoutes    = require('./modules/dashboard/dashboard.routes');

const app = express();

// ── Trust proxy (required when behind Nginx / load balancer) ──────────────────
// Enables req.ip to reflect the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy:            { policy: 'no-referrer' },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) in development
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`CORS: Origin "${origin}" is not allowed`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
//
// IMPORTANT: The webhook route at POST /api/subscription/webhook needs express.raw()
// rather than express.json() so that we get the raw Buffer for HMAC verification.
// We skip the global JSON parser for that specific path here.
//
app.use((req, res, next) => {
  if (req.path === '/api/subscription/webhook') {
    return next(); // Handled by express.raw() at the route level
  }
  express.json({ limit: '2mb' })(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success:     true,
    status:      'healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString(),
    uptime:      `${Math.floor(process.uptime())}s`,
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/validate',     validationRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/dashboard',    dashboardRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Centralized error handler ─────────────────────────────────────────────────
// Must be last — 4 parameters required by Express to treat as error middleware
app.use(errorMiddleware);

module.exports = app;