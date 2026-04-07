import express from 'express';
import Payment from '../models/Payment.js';
import paymentService from '../services/paymentService.js';
import { authenticate } from '../middleware/auth.js';
import { paymentRateLimiter, webhookRateLimiter } from '../middleware/rateLimiter.js';
import { trackIP } from '../middleware/ipTracker.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateMongoId } from '../middleware/validator.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { requirePayments } from '../config/features.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();


router.post(
  '/create-order',
  authenticate,
  paymentRateLimiter,
  trackIP,
  asyncHandler(async (req, res) => {
    requirePayments();

    const { validationId } = req.body;

    const order = await paymentService.createOrder(
      req.user.userId,
      validationId,
      req.userIp
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Payment order created successfully',
      data: order
    });
  })
);


router.post(
  '/verify',
  authenticate,
  paymentRateLimiter,
  trackIP,
  asyncHandler(async (req, res) => {
    requirePayments();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    const result = await paymentService.verifyPayment(
      {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      },
      req.userIp
    );

    res.status(HTTP_STATUS.OK).json(result);
  })
);


router.post(
  '/webhook',
  webhookRateLimiter,
  asyncHandler(async (req, res) => {
    requirePayments();

    const signature = req.headers['x-razorpay-signature'];
    const webhookData = req.body;

    if (!signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'MISSING_SIGNATURE',
        message: 'Webhook signature missing'
      });
    }

    await paymentService.handleWebhook(
      webhookData,
      signature,
      req.ip
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Webhook processed'
    });
  })
);


router.get(
  '/:id',
  authenticate,
  validateMongoId('id'),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.getPayment(
      req.params.id,
      req.user.userId
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        payment
      }
    });
  })
);


router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status
    };

    const result = await paymentService.getPaymentHistory(
      req.user.userId,
      options
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  })
);


router.post(
  '/:id/refund',
  authenticate,
  validateMongoId('id'),
  asyncHandler(async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only admins can process refunds'
      });
    }

    const { reason } = req.body;

    const result = await paymentService.refundPayment(
      req.params.id,
      reason || 'Admin refund',
      req.user.userId
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment refunded successfully',
      data: result
    });
  })
);


router.get(
  '/check/status',
  asyncHandler(async (req, res) => {
    const isEnabled = paymentService.isEnabled();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        paymentsEnabled: isEnabled,
        message: isEnabled 
          ? 'Payment processing is available' 
          : 'Payment processing is currently disabled'
      }
    });
  })
);

export default router;