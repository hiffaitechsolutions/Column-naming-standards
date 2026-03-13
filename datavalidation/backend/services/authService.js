import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/bcrypt.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { AppError, AuthenticationError } from '../middleware/errorHandler.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

class AuthService {

  async register(userData, ipAddress) {
    const { name, email, password } = userData;

   
    if (!validatePasswordStrength(password)) {
      throw new AppError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400,
        'WEAK_PASSWORD'
      );
    }

    
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

  
    const hashedPassword = await hashPassword(password);

   
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      lastIP: ipAddress,
      ipAddresses: [ipAddress]
    });

    
    await user.addIPAddress(ipAddress);

   
    const token = generateToken({ userId: user._id, email: user.email, role: user.role });

    
    await AuditLog.logAction({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      userId: user._id,
      userEmail: user.email,
      ipAddress,
      success: true
    });

    return {
      user: user.toSafeObject(),
      token
    };
  }

 
  async login(credentials, ipAddress, userAgent) {
    const { email, password } = credentials;

   
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    
    if (user.isBlocked) {
      await AuditLog.logAction({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        userId: user._id,
        userEmail: user.email,
        ipAddress,
        success: false,
        errorMessage: 'Account is blocked'
      });
      throw new AppError('Account is blocked', 403, 'ACCOUNT_BLOCKED');
    }

 
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      await AuditLog.logAction({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        userId: user._id,
        userEmail: user.email,
        ipAddress,
        success: false,
        errorMessage: 'Invalid password'
      });
      throw new AuthenticationError('Invalid credentials');
    }

    
    await user.recordLogin(ipAddress);

   
    const token = generateToken({ userId: user._id, email: user.email, role: user.role });

    
    await AuditLog.logAction({
      action: AUDIT_ACTIONS.USER_LOGIN,
      userId: user._id,
      userEmail: user.email,
      ipAddress,
      userAgent,
      success: true
    });

    return {
      user: user.toSafeObject(),
      token
    };
  }


  async logout(userId, ipAddress) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await AuditLog.logAction({
      action: AUDIT_ACTIONS.USER_LOGOUT,
      userId: user._id,
      userEmail: user.email,
      ipAddress,
      success: true
    });

    return { message: 'Logged out successfully' };
  }


  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user.toSafeObject();
  }

  
  async refreshAccessToken(refreshToken) {
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.isBlocked) {
      throw new AppError('Account is blocked', 403, 'ACCOUNT_BLOCKED');
    }

    const token = generateToken({ userId: user._id, email: user.email, role: user.role });

    return {
      user: user.toSafeObject(),
      token
    };
  }


  async changePassword(userId, currentPassword, newPassword, ipAddress) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

  
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      await AuditLog.logAction({
        action: AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
        userId: user._id,
        userEmail: user.email,
        ipAddress,
        success: false,
        errorMessage: 'Invalid current password'
      });
      throw new AuthenticationError('Current password is incorrect');
    }


    if (!validatePasswordStrength(newPassword)) {
      throw new AppError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400,
        'WEAK_PASSWORD'
      );
    }

    
    user.password = await hashPassword(newPassword);
    await user.save();

    await AuditLog.logAction({
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      userId: user._id,
      userEmail: user.email,
      ipAddress,
      success: true
    });

    return { message: 'Password changed successfully' };
  }

  
  async updateProfile(userId, updates) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const allowedUpdates = ['name', 'email'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        user[key] = updates[key];
      }
    });

    await user.save();
    return user.toSafeObject();
  }

  
  async deleteAccount(userId, password, ipAddress) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

  
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new AuthenticationError('Invalid password');
    }

    await user.softDelete();

    await AuditLog.logAction({
      action: AUDIT_ACTIONS.ACCOUNT_DELETED,
      userId: user._id,
      userEmail: user.email,
      ipAddress,
      success: true
    });

    return { message: 'Account deleted successfully' };
  }
}

export default new AuthService();