import dotenv from 'dotenv';

dotenv.config();

const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    cookieSecret: process.env.COOKIE_SECRET || 'default-cookie-secret-change-this',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/datavalidation',
    type: process.env.DB_TYPE || 'self-hosted'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-change-this-immediately',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  features: {
    payments: process.env.ENABLE_PAYMENTS === 'true',
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    rateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    auditLogs: process.env.ENABLE_AUDIT_LOGS !== 'false'
  },

  rateLimit: {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
},


  payment: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    },
    validationPrice: parseInt(process.env.VALIDATION_PRICE) || 1000
  },
  validation: {
    freeValidationsPerUser: parseInt(process.env.FREE_VALIDATIONS_PER_USER) || 3
  },
  abuse: {
    maxAccountsPerIp: parseInt(process.env.MAX_ACCOUNTS_PER_IP) || 3,
    blockDurationHours: parseInt(process.env.IP_BLOCK_DURATION_HOURS) || 24
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, 
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || '.xlsx,.xls,.csv').split(',')
  }
};

if (config.app.isDevelopment) {
  if (config.jwt.secret.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters!');
  }
  
  if (config.jwt.secret.includes('default') || config.jwt.secret.includes('change')) {
    console.warn('⚠️  WARNING: Please change JWT_SECRET in .env file!');
  }

  if (config.db.uri.includes('username:password')) {
    console.warn('⚠️  WARNING: Please update MONGODB_URI in .env file!');
  }
}

export default config;