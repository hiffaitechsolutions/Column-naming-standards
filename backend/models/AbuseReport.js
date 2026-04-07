import mongoose from 'mongoose';

const abuseReportSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  abuseType: {
    type: String,
    enum: [
      'multiple_accounts',
      'rapid_signups',
      'brute_force',
      'rate_limit_exceeded',
      'suspicious_activity',
      'payment_fraud',
      'validation_spam',
      'vpn_detected',
      'bot_detected',
      'other'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  relatedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  relatedEmails: [String],
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  detectionMethod: {
    type: String,
    enum: ['automatic', 'manual', 'reported'],
    default: 'automatic'
  },
  detectorSource: String,
  evidence: {
    accountCount: Number,
    requestCount: Number,
    timeWindow: String,
    userAgents: [String],
    requestPatterns: [String],
    otherEvidence: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedAt: Date,
  blockDuration: Number,
  blockExpiresAt: {
    type: Date,
    index: true
  },
  autoBlockEnabled: {
    type: Boolean,
    default: false
  },
  isResolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: String,
  resolutionAction: {
    type: String,
    enum: ['ignored', 'warned', 'blocked', 'unblocked', 'banned', 'false_positive']
  },
  isFalsePositive: {
    type: Boolean,
    default: false
  },
  falsePositiveReason: String,
  isRepeatOffender: {
    type: Boolean,
    default: false
  },
  previousReportCount: {
    type: Number,
    default: 0
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  location: {
    country: String,
    city: String,
    region: String
  }
}, {
  timestamps: true
});

// Indexes
abuseReportSchema.index({ ipAddress: 1, createdAt: -1 });
abuseReportSchema.index({ abuseType: 1, severity: 1 });
abuseReportSchema.index({ isBlocked: 1, blockExpiresAt: 1 });
abuseReportSchema.index({ isResolved: 1 });
abuseReportSchema.index({ detectedAt: -1 });

// Instance methods
abuseReportSchema.methods.blockIP = function(durationHours = 24) {
  this.isBlocked = true;
  this.blockedAt = new Date();
  this.blockDuration = durationHours;
  this.blockExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  return this.save();
};

abuseReportSchema.methods.unblockIP = function() {
  this.isBlocked = false;
  this.blockExpiresAt = undefined;
  return this.save();
};

abuseReportSchema.methods.resolve = function(action, notes, resolvedBy) {
  this.isResolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionAction = action;
  this.resolutionNotes = notes;
  return this.save();
};

abuseReportSchema.methods.markAsFalsePositive = function(reason) {
  this.isFalsePositive = true;
  this.falsePositiveReason = reason;
  return this.save();
};

abuseReportSchema.methods.markNotificationSent = function() {
  this.notificationSent = true;
  this.notificationSentAt = new Date();
  return this.save();
};

abuseReportSchema.methods.checkBlockExpiration = function() {
  if (this.isBlocked && this.blockExpiresAt && new Date() > this.blockExpiresAt) {
    return this.unblockIP();
  }
  return Promise.resolve(this);
};

// Static methods
abuseReportSchema.statics.findActiveBlocks = function() {
  return this.find({
    isBlocked: true,
    blockExpiresAt: { $gt: new Date() }
  });
};

abuseReportSchema.statics.findByIP = function(ipAddress) {
  return this.find({ ipAddress }).sort({ createdAt: -1 });
};

abuseReportSchema.statics.isIPBlocked = async function(ipAddress) {
  const block = await this.findOne({
    ipAddress,
    isBlocked: true,
    blockExpiresAt: { $gt: new Date() }
  });
  return !!block;
};

abuseReportSchema.statics.getActiveBlock = function(ipAddress) {
  return this.findOne({
    ipAddress,
    isBlocked: true,
    blockExpiresAt: { $gt: new Date() }
  });
};

abuseReportSchema.statics.findUnresolved = function(options = {}) {
  const query = { isResolved: false };
  
  if (options.severity) {
    query.severity = options.severity;
  }
  if (options.abuseType) {
    query.abuseType = options.abuseType;
  }
  
  return this.find(query).sort({ severity: -1, createdAt: -1 });
};

abuseReportSchema.statics.findBySeverity = function(severity) {
  return this.find({ severity, isResolved: false }).sort({ createdAt: -1 });
};

abuseReportSchema.statics.findRepeatOffenders = function() {
  return this.find({ isRepeatOffender: true, isResolved: false });
};

abuseReportSchema.statics.getStatistics = async function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.detectedAt = { $gte: startDate, $lte: endDate };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
        resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
        falsePositives: { $sum: { $cond: ['$isFalsePositive', 1, 0] } },
        criticalSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    blocked: 0,
    resolved: 0,
    falsePositives: 0,
    criticalSeverity: 0,
    highSeverity: 0
  };
};

abuseReportSchema.statics.getAbuseTypeBreakdown = async function() {
  return await this.aggregate([
    { $match: { isResolved: false } },
    {
      $group: {
        _id: '$abuseType',
        count: { $sum: 1 },
        avgSeverity: { $avg: { 
          $switch: {
            branches: [
              { case: { $eq: ['$severity', 'low'] }, then: 1 },
              { case: { $eq: ['$severity', 'medium'] }, then: 2 },
              { case: { $eq: ['$severity', 'high'] }, then: 3 },
              { case: { $eq: ['$severity', 'critical'] }, then: 4 }
            ],
            default: 0
          }
        }}
      }
    },
    { $sort: { count: -1 } }
  ]);
};

abuseReportSchema.statics.cleanupExpiredBlocks = async function() {
  const result = await this.updateMany(
    {
      isBlocked: true,
      blockExpiresAt: { $lte: new Date() }
    },
    {
      $set: { isBlocked: false }
    }
  );

  return result.modifiedCount;
};

abuseReportSchema.statics.updateRepeatOffenders = async function(ipAddress) {
  const count = await this.countDocuments({ ipAddress });
  
  if (count > 1) {
    await this.updateMany(
      { ipAddress, isRepeatOffender: false },
      { 
        $set: { 
          isRepeatOffender: true,
          previousReportCount: count - 1
        }
      }
    );
  }
};

const AbuseReport = mongoose.model('AbuseReport', abuseReportSchema);

export default AbuseReport;