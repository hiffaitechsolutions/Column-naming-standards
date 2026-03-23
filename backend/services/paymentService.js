import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import config from '../config/env.js';
import { isFeatureEnabled } from '../config/features.js';
import { AppError } from '../middleware/errorHandler.js';

class PaymentService {
  constructor() {
    if (config.features.payments) {
      this.razorpay = new Razorpay({
        key_id: config.payment.razorpay.keyId,
        key_secret: config.payment.razorpay.keySecret
      });
    }
  }

  
  isEnabled() {
    return config.features.payments;
  }


  async createOrder(userId, validationId, ipAddress) {
    if (!this.isEnabled()) {
      throw new AppError('Payment feature is disabled', 503, 'PAYMENTS_DISABLED');
    }

    const amount = config.payment.validationPrice;

    const order = await this.razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `validation_${validationId}`,
      notes: {
        userId,
        validationId
      }
    });

    const payment = await Payment.create({
      userId,
      validationId,
      razorpayOrderId: order.id,
      amount: amount,
      currency: 'INR',
      status: 'pending',
      ipAddress
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.payment.razorpay.keyId,
      paymentId: payment._id
    };
  }

 
  async verifyPayment(paymentData, ipAddress) {
    if (!this.isEnabled()) {
      throw new AppError('Payment feature is disabled', 503, 'PAYMENTS_DISABLED');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

   
    const payment = await Payment.findByOrderId(razorpay_order_id);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

   
    const isValid = this.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (isValid) {
      await payment.verify(razorpay_signature);
      await payment.authorize(razorpay_payment_id);
      await payment.capture({ razorpay_payment_id });

      return {
        success: true,
        message: 'Payment verified successfully',
        payment: payment.getSummary()
      };
    } else {
      await payment.fail({
        code: 'SIGNATURE_VERIFICATION_FAILED',
        description: 'Payment signature verification failed'
      });

      throw new AppError('Payment verification failed', 400, 'PAYMENT_VERIFICATION_FAILED');
    }
  }


  verifySignature(orderId, paymentId, signature) {
    const text = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.razorpay.keySecret)
      .update(text)
      .digest('hex');

    return expectedSignature === signature;
  }

 
  async handleWebhook(webhookData, signature, ipAddress) {
    if (!this.isEnabled()) {
      throw new AppError('Payment feature is disabled', 503, 'PAYMENTS_DISABLED');
    }

   
    const isValid = this.verifyWebhookSignature(webhookData, signature);
    if (!isValid) {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const { event, payload } = webhookData;

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payment.entity, ipAddress);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(payload.payment.entity, ipAddress);
        break;

      case 'order.paid':
        await this.handleOrderPaid(payload.order.entity, ipAddress);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return { success: true };
  }

 
  verifyWebhookSignature(webhookData, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.razorpay.webhookSecret)
      .update(JSON.stringify(webhookData))
      .digest('hex');

    return expectedSignature === signature;
  }

 
  async handlePaymentCaptured(paymentEntity, ipAddress) {
    const payment = await Payment.findByPaymentId(paymentEntity.id);
    if (payment) {
      await payment.capture({
        razorpay_payment_id: paymentEntity.id,
        paymentMethod: paymentEntity.method
      });
      await payment.recordWebhook({ event: 'payment.captured', data: paymentEntity });
    }
  }

  
  async handlePaymentFailed(paymentEntity, ipAddress) {
    const payment = await Payment.findByOrderId(paymentEntity.order_id);
    if (payment) {
      await payment.fail({
        code: paymentEntity.error_code,
        description: paymentEntity.error_description
      });
      await payment.recordWebhook({ event: 'payment.failed', data: paymentEntity });
    }
  }

 
  async handleOrderPaid(orderEntity, ipAddress) {
    const payment = await Payment.findByOrderId(orderEntity.id);
    if (payment) {
      await payment.recordWebhook({ event: 'order.paid', data: orderEntity });
    }
  }

 
  async getPayment(paymentId, userId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.userId.toString() !== userId) {
      throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    }

    return payment;
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
      .limit(limit);

    const total = await Payment.countDocuments(query);

    return {
      payments: payments.map(p => p.getSummary()),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

 
  async refundPayment(paymentId, reason, adminId) {
    if (!this.isEnabled()) {
      throw new AppError('Payment feature is disabled', 503, 'PAYMENTS_DISABLED');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'captured') {
      throw new AppError('Payment cannot be refunded', 400, 'PAYMENT_NOT_CAPTURED');
    }

  
    const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: payment.amount,
      notes: {
        reason,
        refundedBy: adminId
      }
    });

   
    await payment.refund({
      refundAmount: refund.amount,
      refundReason: reason,
      refundId: refund.id
    });

    return {
      success: true,
      message: 'Payment refunded successfully',
      refund: refund
    };
  }
}

export default new PaymentService();