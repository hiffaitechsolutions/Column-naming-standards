import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true,
    enum: [
      'USER_REGISTERED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'LOGIN_FAILED',
      'PASSWORD_CHANGED',
      'PASSWORD_CHANGE_FAILED',
      'PROFILE_UPDATED',
      'ACCOUNT_DELETED',
      'USER_BLOCKED',
      'USER_UNBLOCKED',
      'STANDARDS_UPLOADED',
      'STANDARDS_DELETED',
      'CLASSWORDS_UPLOADED',
      'CLASSWORDS_DELETED',
      'VALIDATION_CREATED',
      'VALIDATION_COMPLETED',
      'VALIDATION_FAILED',
      'PAYMENT_INITIATED',
      'PAYMENT_COMPLETED',
      'PAYMENT_FAILED',
      'PAYMENT_REFUNDED',
      'ABUSE_REPORTED',
      'IP_BLOCKED',
      'IP_UNBLOCKED',
      'FILE_UPLOADED',
      'FILE_DELETED',
      'ADMIN_ACTION',
      'SYSTEM_ERROR',
      'OTHER'
    ]
  },
  actionDescription: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: String,
  userName: String,
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  requestMethod: String,
  requestUrl: String,
  requestPath: String,
  statusCode: Number,
  responseTime: Number,
  resourceType: {
    type: String,
    enum: ['user', 'standard', 'classword', 'validation', 'payment', 'abuse_report', 'other']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  resourceName: String,
  changes: {
    before: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    after: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  errorMessage: String,
  errorCode: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  tags: [String],
  sessionId: String,
  location: {
    country: String,
    city: String,
    region: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown']
    },
    os: String,
    browser: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, timestamp: -1 });


auditLogSchema.methods.markAsFailed = function(error) {
  this.success = false;
  this.errorMessage = error.message || error;
  this.errorCode = error.code || error.name;
  if (error.severity) {
    this.severity = error.severity;
  }
  return this.save();
};

auditLogSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

auditLogSchema.methods.addMetadata = function(key, value) {
  if (!this.metadata) {
    this.metadata = new Map();
  }
  this.metadata.set(key, value);
  return this.save();
};


auditLogSchema.statics.logAction = async function(actionData) {
  try {
    const log = await this.create({
      action: actionData.action,
      actionDescription: actionData.actionDescription,
      userId: actionData.userId,
      userEmail: actionData.userEmail,
      userName: actionData.userName,
      ipAddress: actionData.ipAddress,
      userAgent: actionData.userAgent,
      requestMethod: actionData.requestMethod,
      requestUrl: actionData.requestUrl,
      requestPath: actionData.requestPath,
      statusCode: actionData.statusCode,
      responseTime: actionData.responseTime,
      resourceType: actionData.resourceType,
      resourceId: actionData.resourceId,
      resourceName: actionData.resourceName,
      changes: actionData.changes,
      success: actionData.success !== undefined ? actionData.success : true,
      errorMessage: actionData.errorMessage,
      errorCode: actionData.errorCode,
      severity: actionData.severity || 'low',
      metadata: actionData.metadata,
      tags: actionData.tags,
      sessionId: actionData.sessionId,
      location: actionData.location,
      device: actionData.device,
      timestamp: actionData.timestamp || new Date()
    });

    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
   
    return null;
  }
};


auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.action) {
    query.action = options.action;
  }
  if (options.success !== undefined) {
    query.success = options.success;
  }
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};


auditLogSchema.statics.findByIP = function(ipAddress, options = {}) {
  const query = { ipAddress };
  
  if (options.action) {
    query.action = options.action;
  }
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};


auditLogSchema.statics.findByAction = function(action, options = {}) {
  const query = { action };
  
  if (options.userId) {
    query.userId = options.userId;
  }
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};


auditLogSchema.statics.findFailed = function(options = {}) {
  const query = { success: false };
  
  if (options.userId) {
    query.userId = options.userId;
  }
  if (options.action) {
    query.action = options.action;
  }
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};


auditLogSchema.statics.findSecurityEvents = function(options = {}) {
  const securityActions = [
    'LOGIN_FAILED',
    'PASSWORD_CHANGE_FAILED',
    'USER_BLOCKED',
    'IP_BLOCKED',
    'ABUSE_REPORTED'
  ];

  const query = {
    $or: [
      { action: { $in: securityActions } },
      { severity: { $in: ['high', 'critical'] } }
    ]
  };

  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};


auditLogSchema.statics.getStatistics = async function(userId, startDate, endDate) {
  const match = {};
  
  if (userId) {
    match.userId = mongoose.Types.ObjectId(userId);
  }
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = startDate;
    if (endDate) match.timestamp.$lte = endDate;
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        successful: { $sum: { $cond: ['$success', 1, 0] } },
        failed: { $sum: { $cond: ['$success', 0, 1] } },
        criticalEvents: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueIPs: { $addToSet: '$ipAddress' }
      }
    },
    {
      $project: {
        total: 1,
        successful: 1,
        failed: 1,
        criticalEvents: 1,
        highSeverity: 1,
        uniqueUserCount: { $size: { $ifNull: ['$uniqueUsers', []] } },
        uniqueIPCount: { $size: { $ifNull: ['$uniqueIPs', []] } }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    successful: 0,
    failed: 0,
    criticalEvents: 0,
    highSeverity: 0,
    uniqueUserCount: 0,
    uniqueIPCount: 0
  };
};


auditLogSchema.statics.getActionBreakdown = async function(startDate, endDate) {
  const match = {};
  
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = startDate;
    if (endDate) match.timestamp.$lte = endDate;
  }

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        failCount: { $sum: { $cond: ['$success', 0, 1] } }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        successCount: 1,
        failCount: 1,
        successRate: {
          $cond: [
            { $gt: ['$count', 0] },
            { $multiply: [{ $divide: ['$successCount', '$count'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

auditLogSchema.statics.cleanupOldLogs = async function(daysOld = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate },
    severity: { $nin: ['high', 'critical'] } 
  });

  return result.deletedCount;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;