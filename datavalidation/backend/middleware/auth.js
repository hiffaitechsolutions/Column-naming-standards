import { verifyToken, extractToken } from '../utils/jwt.js';
import { AuthenticationError, AuthorizationError, asyncHandler } from './errorHandler.js';
import User from '../models/User.js';


export const authenticate = asyncHandler(async (req, res, next) => {
  
  const token = extractToken(req);

  if (!token) {
    throw new AuthenticationError('No authentication token provided');
  }

  try {
   
    const decoded = verifyToken(token);

    
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    
    if (user.isBlocked) {
      throw new AuthenticationError('Account is blocked');
    }

    
    if (user.deletedAt) {
      throw new AuthenticationError('Account is deleted');
    }

   
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: user.role === 'admin' || user.role === 'super_admin'
    };

    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      throw new AuthenticationError('Token has expired. Please login again.');
    }
    if (error.message === 'Invalid token') {
      throw new AuthenticationError('Invalid authentication token');
    }
    throw error;
  }
});


export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && !user.isBlocked && !user.deletedAt) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          isAdmin: user.role === 'admin' || user.role === 'super_admin'
        };
      }
    } catch (error) {
      
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
});


export const adminOnly = (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (!req.user.isAdmin) {
    throw new AuthorizationError('Admin access required');
  }

  next();
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(`Required role: ${roles.join(' or ')}`);
    }

    next();
  };
};


export const requireOwnership = (userIdField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    
    if (req.user.isAdmin) {
      return next();
    }

    
    const resourceOwnerId = req.params[userIdField] || req.body[userIdField];

    if (!resourceOwnerId) {
      throw new AuthorizationError('Resource owner not specified');
    }

    if (resourceOwnerId !== req.user.userId) {
      throw new AuthorizationError('You do not own this resource');
    }

    next();
  });
};

export default {
  authenticate,
  optionalAuth,
  adminOnly,
  requireRole,
  requireOwnership
};