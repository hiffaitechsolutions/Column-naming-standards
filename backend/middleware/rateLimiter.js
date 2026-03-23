import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import config from '../config/env.js';
import { isFeatureEnabled } from '../config/features.js';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants.js';


const rateLimitHandler = (req, res) => {
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many requests from this IP. Please try again later',
    retryAfter: res.getHeader('Retry-After')
  });
};


// ── IPv6-safe IP extractor ─────────────────────────────────────────────────────
// express-rate-limit requires this pattern to avoid ERR_ERL_KEY_GEN_IPV6
const normalizeIP = (req) => {
  const raw =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';

  // Convert IPv4-mapped IPv6 (::ffff:1.2.3.4) to plain IPv4
  return raw.replace(/^::ffff:/i, '');
};


const keyGenerator = (req) => {
  if (req.user?.userId) {
    return `${normalizeIP(req)}-${req.user.userId}`;
  }
  return normalizeIP(req);
};


const skipRateLimiting = (req) => {
  if (!isFeatureEnabled('RATE_LIMITING')) return true;
  if (req.user?.role === 'admin' || req.user?.role === 'super_admin') return true;
  return false;
};


export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many requests. Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimiting,
  keyGenerator,
  handler: rateLimitHandler
});


export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: {
    success: false,
    error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many authentication attempts. Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => !isFeatureEnabled('RATE_LIMITING'),
  keyGenerator,
  handler: (req, res) => {
    console.warn(`⚠️  SECURITY ALERT: Rate limit exceeded for auth - IP: ${normalizeIP(req)}`);
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many authentication attempts. Your IP has been temporarily blocked',
      retryAfter: res.getHeader('Retry-After'),
      blockedUntil: new Date(Date.now() + config.rateLimit.windowMs).toISOString()
    });
  }
});


export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many file uploads. Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimiting,
  keyGenerator,
  handler: rateLimitHandler
});


export const validationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many validation requests. Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimiting,
  keyGenerator,
  handler: rateLimitHandler
});


export const paymentRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many payment attempts. Please try again in a few minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isFeatureEnabled('RATE_LIMITING'),
  keyGenerator,
  handler: (req, res) => {
    console.warn(`⚠️  SECURITY ALERT: Excessive payment attempts - IP: ${normalizeIP(req)}, User: ${req.user?.userId}`);
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many payment attempts. Please contact support if you are experiencing issues',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});


export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
    message: 'Too many webhook requests'
  },
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => !isFeatureEnabled('RATE_LIMITING'),
  keyGenerator,   // ← was: (req) => req.ip  (IPv6 unsafe)
  handler: (req, res) => {
    console.error(`❌ Webhook rate limit exceeded - IP: ${normalizeIP(req)}`);
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
    });
  }
});


export const createCustomRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipRateLimiting,
    keyGenerator,
    handler: rateLimitHandler
  };

  return rateLimit({ ...defaults, ...options });
};


export const addRateLimitInfo = (req, res, next) => {
  if (!isFeatureEnabled('RATE_LIMITING')) return next();

  const rateLimitInfo = {
    limit:     res.getHeader('RateLimit-Limit'),
    remaining: res.getHeader('RateLimit-Remaining'),
    reset:     res.getHeader('RateLimit-Reset')
  };

  res.locals.rateLimit = rateLimitInfo;
  next();
};


export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => hits * 100,
  maxDelayMs: 5000,
  skipSuccessfulRequests: false,
  skip: skipRateLimiting,
  keyGenerator,   // ← was: (req) => req.ip  (IPv6 unsafe)
});


export const progressiveRateLimiter = [
  speedLimiter,
  globalRateLimiter
];


export const rateLimiters = {
  global:      globalRateLimiter,
  auth:        authRateLimiter,
  upload:      uploadRateLimiter,
  validation:  validationRateLimiter,
  payment:     paymentRateLimiter,
  webhook:     webhookRateLimiter,
  progressive: progressiveRateLimiter
};

export default {
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  validationRateLimiter,
  paymentRateLimiter,
  webhookRateLimiter,
  speedLimiter,
  progressiveRateLimiter,
  createCustomRateLimiter,
  addRateLimitInfo,
  rateLimiters
};