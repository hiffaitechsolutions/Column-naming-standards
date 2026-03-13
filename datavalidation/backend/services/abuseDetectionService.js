import User from '../models/User.js';
import AbuseReport from '../models/AbuseReport.js';
import config from '../config/env.js';

class AbuseDetectionService {

  // ── Existing: check multiple accounts at SIGNUP ───────────────────────────
  async checkMultipleAccounts(ipAddress, userId) {
    const accountCount = await User.countByIP(ipAddress);
    const maxAccounts = config.abuse.maxAccountsPerIp;

    if (accountCount >= maxAccounts) {
      await this.reportSuspiciousActivity({
        ipAddress,
        abuseType: 'multiple_accounts',
        severity: 'high',
        description: `${accountCount} accounts detected from IP ${ipAddress}`,
        evidence: { accountCount, maxAllowed: maxAccounts },
        autoBlock: true
      });

      return {
        isAbuse: true,
        message: `Maximum ${maxAccounts} accounts per IP exceeded`,
        accountCount
      };
    }

    return { isAbuse: false, accountCount };
  }

  // ── NEW: check multiple different accounts logging in from same IP ─────────
  // Tracks how many DISTINCT emails have successfully logged in from this IP
  // within a sliding time window. If the count exceeds the threshold, block.
  async checkMultipleAccountLogins(ipAddress) {
    if (this.isPrivateNetwork(ipAddress)) {
      return { isAbuse: false };
    }

    const windowMs  = (config.abuse.loginWindowMinutes || 60) * 60 * 1000;
    const maxLogins = config.abuse.maxDistinctLoginsPerIp || 5;
    const windowStart = new Date(Date.now() - windowMs);

    // Count distinct users who logged in from this IP within the window.
    // Requires ipAddresses array field on User and lastLoginAt field.
    const distinctUsers = await User.countDocuments({
      ipAddresses:  ipAddress,
      lastLoginAt:  { $gte: windowStart },
    });

    if (distinctUsers >= maxLogins) {
      await this.reportSuspiciousActivity({
        ipAddress,
        abuseType:   'multiple_account_logins',
        severity:    'high',
        description: `${distinctUsers} distinct accounts logged in from IP ${ipAddress} within ${config.abuse.loginWindowMinutes || 60} minutes`,
        evidence: {
          distinctUsers,
          maxAllowed:   maxLogins,
          windowMinutes: config.abuse.loginWindowMinutes || 60,
        },
        autoBlock: true,
      });

      return {
        isAbuse: true,
        message:  `Too many different accounts logging in from your IP address. Access has been temporarily blocked.`,
        distinctUsers,
      };
    }

    return { isAbuse: false, distinctUsers };
  }

  // ── Existing: check rapid signups ─────────────────────────────────────────
  async checkRapidSignups(ipAddress) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentSignups = await User.countDocuments({
      ipAddresses: ipAddress,
      createdAt:   { $gte: oneDayAgo }
    });

    const maxSignupsPerDay = 5;

    if (recentSignups >= maxSignupsPerDay) {
      await this.reportSuspiciousActivity({
        ipAddress,
        abuseType:   'rapid_signups',
        severity:    'medium',
        description: `${recentSignups} signups in 24 hours from IP ${ipAddress}`,
        evidence:    { signupCount: recentSignups, timeWindow: '24 hours' }
      });

      return {
        isAbuse:     true,
        message:     'Too many signups from this IP in 24 hours',
        signupCount: recentSignups
      };
    }

    return { isAbuse: false, signupCount: recentSignups };
  }

  // ── NEW: record a successful login so IP tracking works ───────────────────
  // Call this from your auth route AFTER a successful login.
  async recordLogin(ipAddress, userId) {
    if (!ipAddress || !userId || this.isPrivateNetwork(ipAddress)) return;

    try {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { ipAddresses: ipAddress },  // store IP on user
        $set:      { lastLoginAt: new Date() },
      });
    } catch (err) {
      console.error('abuseDetectionService.recordLogin error:', err.message);
    }
  }

  // ── Existing ──────────────────────────────────────────────────────────────
  async isIPBlocked(ipAddress) {
    const activeBlock = await AbuseReport.getActiveBlock(ipAddress);

    if (activeBlock) {
      return {
        isBlocked: true,
        reason:    activeBlock.description,
        expiresAt: activeBlock.blockExpiresAt
      };
    }

    return { isBlocked: false };
  }

  async reportSuspiciousActivity({
    ipAddress,
    abuseType,
    severity,
    description,
    evidence = {},
    autoBlock = false,
    relatedUserIds = [],
    relatedEmails = []
  }) {
    const report = await AbuseReport.create({
      ipAddress,
      abuseType,
      severity,
      description,
      evidence,
      autoBlockEnabled:  autoBlock,
      relatedUserIds,
      relatedEmails,
      detectionMethod:   'automatic',
      detectorSource:    'abuse_detection_service'
    });

    if (autoBlock && severity === 'high') {
      await this.blockIP(ipAddress, description, config.abuse.blockDurationHours);
    }

    return report;
  }

  async blockIP(ipAddress, reason, durationHours = 24, adminId = null) {
    const existing = await AbuseReport.getActiveBlock(ipAddress);
    if (existing) {
      return { message: 'IP is already blocked', expiresAt: existing.blockExpiresAt };
    }

    let report = await AbuseReport.findOne({
      ipAddress,
      isResolved: false
    }).sort({ createdAt: -1 });

    if (!report) {
      report = await AbuseReport.create({
        ipAddress,
        abuseType:       'other',
        severity:        'high',
        description:     reason || 'Blocked by admin',
        detectionMethod: adminId ? 'manual' : 'automatic'
      });
    }

    await report.blockIP(durationHours);
    return { message: 'IP blocked successfully', expiresAt: report.blockExpiresAt };
  }

  async unblockIP(ipAddress, adminId) {
    const activeBlock = await AbuseReport.getActiveBlock(ipAddress);
    if (!activeBlock) return { message: 'IP is not blocked' };

    await activeBlock.unblockIP();
    await activeBlock.resolve('unblocked', 'Unblocked by admin', adminId);
    return { message: 'IP unblocked successfully' };
  }

  async getIPReports(ipAddress) {
    return await AbuseReport.findByIP(ipAddress);
  }

  async getUnresolvedReports(options = {}) {
    return await AbuseReport.findUnresolved(options);
  }

  async resolveReport(reportId, action, notes, adminId) {
    const report = await AbuseReport.findById(reportId);
    if (!report) throw new Error('Report not found');
    await report.resolve(action, notes, adminId);
    return { message: 'Report resolved successfully' };
  }

  async markFalsePositive(reportId, reason, adminId) {
    const report = await AbuseReport.findById(reportId);
    if (!report) throw new Error('Report not found');

    await report.markAsFalsePositive(reason);
    await report.resolve('false_positive', reason, adminId);
    if (report.isBlocked) await report.unblockIP();

    return { message: 'Marked as false positive' };
  }

  async getStatistics(startDate, endDate) {
    return await AbuseReport.getStatistics(startDate, endDate);
  }

  async cleanupExpiredBlocks() {
    return await AbuseReport.cleanupExpiredBlocks();
  }

  async findSuspiciousIPs() {
    return await AbuseReport.find({
      isResolved: false,
      severity:   { $in: ['high', 'critical'] }
    }).select('ipAddress abuseType severity createdAt');
  }

  isLocalhost(ipAddress) {
    return ['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1'].includes(ipAddress);
  }

  isPrivateNetwork(ipAddress) {
    if (this.isLocalhost(ipAddress)) return true;
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./
    ];
    return privateRanges.some(range => range.test(ipAddress));
  }
}

export default new AbuseDetectionService();