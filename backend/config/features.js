import config from './env.js';


export const isFeatureEnabled = (featureName) => {
  const feature = featureName.toLowerCase();
  return config.features[feature] === true;
};


export const requirePayments = () => {
  if (!config.features.payments) {
    throw new Error('Payment feature is currently disabled');
  }
};


export const requireAnalytics = () => {
  if (!config.features.analytics) {
    throw new Error('Analytics feature is currently disabled');
  }
};


export const getAllFeatures = () => {
  return {
    payments: config.features.payments,
    analytics: config.features.analytics,
    rateLimiting: config.features.rateLimiting,
    auditLogs: config.features.auditLogs
  };
};


export const isPrivateNetwork = () => {
  return !config.features.payments && !config.features.analytics;
};

export default {
  isFeatureEnabled,
  requirePayments,
  requireAnalytics,
  getAllFeatures,
  isPrivateNetwork
};