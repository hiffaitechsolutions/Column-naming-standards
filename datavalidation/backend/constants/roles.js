const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const SUBSCRIPTION_STATUS = Object.freeze({
  FREE: 'free',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

const FREE_VALIDATION_LIMIT = parseInt(process.env.FREE_VALIDATION_LIMIT, 10) || 3;

module.exports = {
  ROLES,
  SUBSCRIPTION_STATUS,
  FREE_VALIDATION_LIMIT,
};