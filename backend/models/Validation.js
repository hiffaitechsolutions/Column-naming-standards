import mongoose from 'mongoose';

const validationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  standardsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: true
  },
  classwordsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classword'
  },
  dataFilename: {
    type: String,
    required: true
  },
  dataFilepath: String,
  dataFileSize: Number,
  sheetName: String,
  sheetIndex: Number,
  selectedColumns: [String],
  totalColumns: Number,
  totalRows: Number,
  headerRow: Number,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  isValid: Boolean,
  validRowsCount: {
    type: Number,
    default: 0
  },
  invalidRowsCount: {
    type: Number,
    default: 0
  },
  totalErrorsCount: {
    type: Number,
    default: 0
  },
  validationRate: Number,
  errors: [{
    rowNumber: Number,
    columnName: String,
    cellValue: mongoose.Schema.Types.Mixed,
    errorType: String,
    errorMessage: String,
    severity: {
      type: String,
      enum: ['error', 'warning', 'info']
    },
    ruleViolated: String
  }],
  columnSummaries: [{
    columnName: String,
    totalRows: Number,
    validRows: Number,
    invalidRows: Number,
    errorCount: Number,
    validationRate: Number,
    mostCommonErrors: [{
      errorType: String,
      count: Number
    }]
  }],
  startedAt: Date,
  completedAt: Date,
  processingTimeMs: Number,
  errorMessage: String,
  errorStack: String,
  isPaid: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: false
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  amountPaid: Number,
  ipAddress: String,
  userAgent: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  deletedAt: Date
}, {
  timestamps: true
});


validationSchema.index({ userId: 1, createdAt: -1 });
validationSchema.index({ status: 1 });
validationSchema.index({ isPaid: 1, isFree: 1 });
validationSchema.index({ deletedAt: 1 });
validationSchema.index({ standardsId: 1, classwordsId: 1 });


validationSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});


validationSchema.methods.start = function() {
  this.status = 'processing';
  this.startedAt = new Date();
  return this.save();
};

validationSchema.methods.complete = function(results) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.processingTimeMs = this.completedAt - this.startedAt;
  
  this.isValid = results.isValid;
  this.validRowsCount = results.validRowsCount;
  this.invalidRowsCount = results.invalidRowsCount;
  this.totalErrorsCount = results.totalErrorsCount;
  this.errors = results.errors;
  this.columnSummaries = results.columnSummaries;
  
  if (this.totalRows > 0) {
    this.validationRate = (this.validRowsCount / this.totalRows) * 100;
  }
  
  return this.save();
};

validationSchema.methods.fail = function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = error.message;
  this.errorStack = error.stack;
  return this.save();
};

validationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.completedAt = new Date();
  return this.save();
};

validationSchema.methods.markAsPaid = function(paymentId, amount) {
  this.isPaid = true;
  this.isFree = false;
  this.paymentId = paymentId;
  this.amountPaid = amount;
  return this.save();
};

validationSchema.methods.markAsFree = function() {
  this.isFree = true;
  this.isPaid = false;
  return this.save();
};

validationSchema.methods.addErrors = function(newErrors) {
  this.errors.push(...newErrors);
  this.totalErrorsCount = this.errors.length;
  return this.save();
};

validationSchema.methods.getErrorsByColumn = function(columnName) {
  return this.errors.filter(err => err.columnName === columnName);
};

validationSchema.methods.getErrorsBySeverity = function(severity) {
  return this.errors.filter(err => err.severity === severity);
};

validationSchema.methods.getColumnSummary = function(columnName) {
  return this.columnSummaries.find(sum => sum.columnName === columnName);
};

validationSchema.methods.getCriticalErrors = function() {
  return this.errors.filter(err => err.severity === 'error');
};

validationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    status: this.status,
    isValid: this.isValid,
    totalRows: this.totalRows,
    validRowsCount: this.validRowsCount,
    invalidRowsCount: this.invalidRowsCount,
    totalErrorsCount: this.totalErrorsCount,
    validationRate: this.validationRate,
    processingTime: this.processingTimeMs ? `${this.processingTimeMs}ms` : null,
    isPaid: this.isPaid,
    isFree: this.isFree,
    createdAt: this.createdAt,
    completedAt: this.completedAt
  };
};

validationSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

validationSchema.methods.restore = function() {
  this.deletedAt = undefined;
  return this.save();
};


validationSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 10);
};

validationSchema.statics.findCompleted = function(userId) {
  return this.find({ userId, status: 'completed' })
    .sort({ createdAt: -1 });
};

validationSchema.statics.findPending = function(userId) {
  return this.find({ userId, status: { $in: ['pending', 'processing'] } })
    .sort({ createdAt: -1 });
};

validationSchema.statics.getStatistics = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        valid: { $sum: { $cond: ['$isValid', 1, 0] } },
        totalRows: { $sum: '$totalRows' },
        totalErrors: { $sum: '$totalErrorsCount' },
        avgValidationRate: { $avg: '$validationRate' },
        freeValidations: { $sum: { $cond: ['$isFree', 1, 0] } },
        paidValidations: { $sum: { $cond: ['$isPaid', 1, 0] } }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    completed: 0,
    failed: 0,
    valid: 0,
    totalRows: 0,
    totalErrors: 0,
    avgValidationRate: 0,
    freeValidations: 0,
    paidValidations: 0
  };
};

const Validation = mongoose.model('Validation', validationSchema);

export default Validation;