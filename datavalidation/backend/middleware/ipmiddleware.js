import { asyncHandler } from './errorHandler.js';
import abuseDetectionService from '../services/abuseDetectionService.js';


const extractIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0];
  }

  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }

  if (req.ip) {
    return req.ip.replace('::ffff:', '');
  }

  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress.replace('::ffff:', '');
  }

  return 'unknown';
};


// ── Runs on every request: extracts IP and checks if it's blocked ─────────────
export const trackIP = asyncHandler(async (req, res, next) => {
  const ipAddress = extractIP(req);

  req.userIp    = ipAddress;
  req.ipAddress = ipAddress;

  const blockCheck = await abuseDetectionService.isIPBlocked(ipAddress);

  if (blockCheck.isBlocked) {
    return res.status(403).json({
      success:   false,
      error:     'IP_BLOCKED',
      message:   blockCheck.reason || 'Your IP address has been blocked',
      expiresAt: blockCheck.expiresAt
    });
  }

  next();
});


// ── Applied to SIGNUP routes ───────────────────────────────────────────────────
export const trackSignupAttempts = asyncHandler(async (req, res, next) => {
  const ipAddress = req.userIp || extractIP(req);

  const multipleAccountsCheck = await abuseDetectionService.checkMultipleAccounts(
    ipAddress,
    req.user?.userId
  );

  if (multipleAccountsCheck.isAbuse) {
    return res.status(403).json({
      success:      false,
      error:        'TOO_MANY_ACCOUNTS',
      message:      multipleAccountsCheck.message,
      accountCount: multipleAccountsCheck.accountCount
    });
  }

  const rapidSignupCheck = await abuseDetectionService.checkRapidSignups(ipAddress);

  if (rapidSignupCheck.isAbuse) {
    return res.status(429).json({
      success:     false,
      error:       'RAPID_SIGNUPS',
      message:     rapidSignupCheck.message,
      signupCount: rapidSignupCheck.signupCount
    });
  }

  next();
});


// ── NEW: Applied to LOGIN routes ───────────────────────────────────────────────
// Blocks an IP that has logged in with too many different accounts
// within the configured time window (default: 5 distinct accounts / 60 minutes).
export const trackLoginAttempts = asyncHandler(async (req, res, next) => {
  const ipAddress = req.userIp || extractIP(req);

  // Skip check for private/local IPs (dev environment)
  if (abuseDetectionService.isPrivateNetwork(ipAddress)) {
    return next();
  }

  const loginCheck = await abuseDetectionService.checkMultipleAccountLogins(ipAddress);

  if (loginCheck.isAbuse) {
    return res.status(403).json({
      success:      false,
      error:        'TOO_MANY_ACCOUNT_LOGINS',
      message:      loginCheck.message,
      distinctUsers: loginCheck.distinctUsers
    });
  }

  next();
});


export const getIPInfo = (req) => {
  return {
    ip:        req.userIp || extractIP(req),
    userAgent: req.headers['user-agent'],
    origin:    req.headers.origin,
    referer:   req.headers.referer
  };
};

export default {
  trackIP,
  trackSignupAttempts,
  trackLoginAttempts,
  getIPInfo,
  extractIP
};