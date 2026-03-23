import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  validationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Validation'
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: String,
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: String,
  paymentMethodDetails: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  customerEmail: String,
  customerName: String,
  customerPhone: String,
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  authorizedAt: Date,
  capturedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  refundAmount: Number,
  refundReason: String,
  refundId: String,
  errorCode: String,
  errorDescription: String,
  errorSource: String,
  errorStep: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  ipAddress: String,
  userAgent: String,
  webhookReceived: {
    type: Boolean,
    default: false
  },
  webhookData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  webhookReceivedAt: Date,
  razorpayResponse: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  notes: {
    type: Map,
    of: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  deletedAt: Date
}, {
  timestamps: true
});


paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
paymentSchema.index({ deletedAt: 1 });
paymentSchema.index({ isVerified: 1 });


paymentSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});


paymentSchema.methods.authorize = function(paymentId) {
  this.status = 'authorized';
  this.razorpayPaymentId = paymentId;
  this.authorizedAt = new Date();
  return this.save();
};

paymentSchema.methods.capture = function(paymentData) {
  this.status = 'captured';
  this.capturedAt = new Date();
  
  if (paymentData.razorpay_payment_id) {
    this.razorpayPaymentId = paymentData.razorpay_payment_id;
  }
  if (paymentData.paymentMethod) {
    this.paymentMethod = paymentData.paymentMethod;
  }
  if (paymentData.paymentMethodDetails) {
    this.paymentMethodDetails = paymentData.paymentMethodDetails;
  }
  
  return this.save();
};

paymentSchema.methods.fail = function(error) {
  this.status = 'failed';
  this.failedAt = new Date();
  
  if (error.code) this.errorCode = error.code;
  if (error.description) this.errorDescription = error.description;
  if (error.source) this.errorSource = error.source;
  if (error.step) this.errorStep = error.step;
  
  return this.save();
};

paymentSchema.methods.refund = function(refundData) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundAmount = refundData.refundAmount || this.amount;
  this.refundReason = refundData.refundReason;
  this.refundId = refundData.refundId;
  return this.save();
};

paymentSchema.methods.verify = function(signature) {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.razorpaySignature = signature;
  return this.save();
};

paymentSchema.methods.recordWebhook = function(webhookData) {
  this.webhookReceived = true;
  this.webhookReceivedAt = new Date();
  this.webhookData = webhookData;
  return this.save();
};

paymentSchema.methods.linkToValidation = function(validationId) {
  this.validationId = validationId;
  return this.save();
};

paymentSchema.methods.getSummary = function() {
  return {
    id: this._id,
    orderId: this.razorpayOrderId,
    paymentId: this.razorpayPaymentId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    isVerified: this.isVerified,
    paymentMethod: this.paymentMethod,
    createdAt: this.createdAt,
    capturedAt: this.capturedAt
  };
};

paymentSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

paymentSchema.methods.restore = function() {
  this.deletedAt = undefined;
  return this.save();
};


paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'captured';
});

paymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  if (options.status) query.status = options.status;
  
  return this.find(query).sort({ createdAt: -1 });
};

paymentSchema.statics.findByOrderId = function(orderId) {
  return this.findOne({ razorpayOrderId: orderId });
};

paymentSchema.statics.findByPaymentId = function(paymentId) {
  return this.findOne({ razorpayPaymentId: paymentId });
};

paymentSchema.statics.findSuccessful = function(userId) {
  return this.find({ userId, status: 'captured' }).sort({ createdAt: -1 });
};

paymentSchema.statics.findFailed = function(userId) {
  return this.find({ userId, status: 'failed' }).sort({ createdAt: -1 });
};

paymentSchema.statics.getStatistics = async function(userId) {
  const match = userId ? { userId: mongoose.Types.ObjectId(userId) } : {};
  match.deletedAt = null;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        captured: { $sum: { $cond: [{ $eq: ['$status', 'captured'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
        totalAmount: { $sum: { $cond: [{ $eq: ['$status', 'captured'] }, '$amount', 0] } },
        refundedAmount: { $sum: '$refundAmount' }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    captured: 0,
    failed: 0,
    pending: 0,
    refunded: 0,
    totalAmount: 0,
    refundedAmount: 0
  };
};

paymentSchema.statics.getRevenueByDateRange = async function(startDate, endDate, userId) {
  const match = {
    status: 'captured',
    capturedAt: { $gte: startDate, $lte: endDate },
    deletedAt: null
  };
  
  if (userId) {
    match.userId = mongoose.Types.ObjectId(userId);
  }

  const revenue = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 }
      }
    }
  ]);

  return revenue[0] || { totalRevenue: 0, totalTransactions: 0 };
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;