import User from '../models/User.js';
import Validation from '../models/Validation.js';
import Payment from '../models/Payment.js';
import config from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

class UserService {
 
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user.toSafeObject();
  }


  async getUserByEmail(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user.toSafeObject();
  }


  async getDashboard(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const recentValidations = await Validation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('status isValid totalRows validRowsCount invalidRowsCount createdAt');

    const stats = await Validation.getStatistics(userId);

    return {
      user: user.toSafeObject(),
      freeValidationsRemaining: user.freeValidationsRemaining,
      totalValidationsCount: user.totalValidationsCount,
      paidValidationsCount: user.paidValidationsCount,
      totalSpent: user.totalSpent,
      recentValidations,
      statistics: stats
    };
  }


  async getUsageSummary(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      freeValidationsLimit: user.freeValidationsLimit,
      freeValidationsUsed: user.freeValidationsUsed,
      freeValidationsRemaining: user.freeValidationsRemaining,
      paidValidationsCount: user.paidValidationsCount,
      totalValidationsCount: user.totalValidationsCount,
      totalSpent: user.totalSpent
    };
  }

 
  async canValidate(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const hasFreeValidations = user.hasFreeValidations;
    const requiresPayment = !hasFreeValidations;

    return {
      canValidate: true,
      hasFreeValidations,
      requiresPayment,
      freeValidationsRemaining: user.freeValidationsRemaining,
      paymentAmount: requiresPayment ? config.payment.validationPrice : 0
    };
  }

  
  async useFreeValidation(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.hasFreeValidations) {
      throw new AppError('No free validations remaining', 403, 'NO_FREE_VALIDATIONS');
    }

    await user.useFreeValidation();
    return { message: 'Free validation used', remaining: user.freeValidationsRemaining };
  }

 
  async recordPaidValidation(userId, paymentId, amount) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await user.addPaidValidation(amount);
    return { message: 'Paid validation recorded' };
  }

 
  async getValidationHistory(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const validations = await Validation.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('status isValid totalRows validRowsCount invalidRowsCount createdAt completedAt');

    const total = await Validation.countDocuments(query);

    return {
      validations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }


  async getPaymentHistory(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('amount status createdAt capturedAt');

    const total = await Payment.countDocuments(query);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

 
  async getUserIPs(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      currentIP: user.lastIP,
      ipHistory: user.ipAddresses
    };
  }

 
  async blockUser(userId, reason) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await user.block(reason);
    return { message: 'User blocked successfully' };
  }

 
  async unblockUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await user.unblock();
    return { message: 'User unblocked successfully' };
  }

 
  async getAllUsers(options = {}) {
    const { page = 1, limit = 20, isBlocked, role, search } = options;

    const query = {};
    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email role isBlocked freeValidationsUsed totalValidationsCount createdAt');

    const total = await User.countDocuments(query);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  
  async getUserStatistics() {
    return await User.getStatistics();
  }

 
  async findSuspiciousAccounts() {
    return await User.findSuspiciousAccounts(3);
  }
}

export default new UserService();