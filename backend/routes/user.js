import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Validation from '../models/Validation.js';
import Payment from '../models/Payment.js';

const router = express.Router();


router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  
  const user = await User.findById(userId).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  
  const role = user.role?.toLowerCase();
const isAdmin = role === 'admin' || role === 'super_admin' || role === 'project owner';

 
  const [totalValidations, completedValidations, failedValidations] = await Promise.all([
    Validation.countDocuments({ userId }),
    Validation.countDocuments({ userId, status: 'completed' }),
    Validation.countDocuments({ userId, status: 'failed' })
  ]);

 
  const totalPayments = await Payment.countDocuments({ 
    userId, 
    status: 'captured' 
  });

  
  const freeValidationsRemaining = isAdmin 
    ? 999
    : Math.max(0, user.freeValidationsLimit - user.freeValidationsUsed);

  const dashboardData = {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    validations: {
      total: totalValidations,
      completed: completedValidations,
      failed: failedValidations,
      processing: totalValidations - completedValidations - failedValidations
    },
    usage: {
      freeValidationsLimit: isAdmin ? 999 : user.freeValidationsLimit,
      freeValidationsUsed: isAdmin ? 0 : user.freeValidationsUsed,
      freeValidationsRemaining: freeValidationsRemaining,
      paidValidationsCount: user.paidValidationsCount || 0,
      totalPayments: totalPayments
    },
   
    freeValidationsRemaining,
    totalValidationsCount: totalValidations,
    paidValidationsCount: user.paidValidationsCount || 0
  };

  res.status(200).json({
    success: true,
    data: dashboardData
  });
}));


router.get('/usage', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await User.findById(userId).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }


  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'Project Owner';

  const usage = {
    freeValidationsLimit: isAdmin ? 999 : user.freeValidationsLimit,
    freeValidationsUsed: isAdmin ? 0 : user.freeValidationsUsed,
    freeValidationsRemaining: isAdmin 
      ? 999 
      : Math.max(0, user.freeValidationsLimit - user.freeValidationsUsed),
    paidValidationsCount: user.paidValidationsCount || 0,
    totalValidationsCount: await Validation.countDocuments({ userId })
  };

  res.status(200).json({
    success: true,
    data: { usage }
  });
}));


router.get('/can-validate', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'Project Owner';
  
  if (isAdmin) {
    return res.status(200).json({
      success: true,
      data: {
        canValidate: true,
        requiresPayment: false,
        freeValidationsRemaining: 999,
        freeValidationsLimit: 999,
        paymentAmount: 0
      }
    });
  }


  const freeValidationsRemaining = Math.max(
    0, 
    user.freeValidationsLimit - user.freeValidationsUsed
  );

  const canValidate = freeValidationsRemaining > 0;
  const requiresPayment = !canValidate;

  res.status(200).json({
    success: true,
    data: {
      canValidate,
      requiresPayment,
      freeValidationsRemaining,
      freeValidationsLimit: user.freeValidationsLimit,
      paymentAmount: requiresPayment ? 10000 : 0 
    }
  });
}));


router.get('/validations', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [validations, total] = await Promise.all([
    Validation.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-errors'), 
    Validation.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      validations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));


router.get('/payments', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip),
    Payment.countDocuments({ userId })
  ]);

  res.status(200).json({
    success: true,
    data: {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));


router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
}));

export default router;