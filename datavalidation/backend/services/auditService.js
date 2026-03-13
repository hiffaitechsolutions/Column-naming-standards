import AuditLog from '../models/AuditLog.js';
import config from '../config/env.js';


export const logAudit = async ({ userId, action, resource, resourceId, details, ipAddress, userAgent }) => {
 
  if (!config.features.auditLogs) {
    return;
  }

  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });
  } catch (error) {
    
    console.error('Audit log error:', error);
  }
};


export const getUserAuditLogs = async (userId, options = {}) => {
  const { limit = 50, skip = 0, action } = options;

  const query = { userId };
  if (action) {
    query.action = action;
  }

  return await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

export default {
  logAudit,
  getUserAuditLogs
};