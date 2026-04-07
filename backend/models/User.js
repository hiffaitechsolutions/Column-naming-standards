import mongoose from 'mongoose';
import { USER_ROLES } from '../utils/constants.js';
import config from '../config/env.js';



const userSchema = new mongoose.Schema({
 
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false 
  },

  
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },

  
  freeValidationsLimit: {
    type: Number,
    default: config.validation.freeValidationsPerUser

  },

  freeValidationsUsed: {
    type: Number,
    default: 0,
    min: 0
  },

  
  paidValidationsCount: {
    type: Number,
    default: 0,
    min: 0
  },

  totalValidationsCount: {
    type: Number,
    default: 0,
    min: 0
  },


  isActive: {
    type: Boolean,
    default: true
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  isVerified: {
    type: Boolean,
    default: false 
  },

  
  ipAddresses: [{
    type: String,
    trim: true
  }],

  lastIP: {
    type: String,
    trim: true
  },

  
  lastLoginAt: {
    type: Date,
    default: null
  },

  loginCount: {
    type: Number,
    default: 0
  },

 
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },

  lastPaymentAt: {
    type: Date,
    default: null
  },

  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'users'
});


userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ ipAddresses: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1 });
userSchema.index({ isBlocked: 1 });
userSchema.index({ deletedAt: 1 });


userSchema.virtual('freeValidationsRemaining').get(function() {
  return Math.max(0, this.freeValidationsLimit - this.freeValidationsUsed);
});


userSchema.virtual('hasFreeValidations').get(function() {
  return this.freeValidationsUsed < this.freeValidationsLimit;
});


userSchema.virtual('fullName').get(function() {
  return this.name;
});


userSchema.pre('save', function(next) {
  
  this.updatedAt = new Date();

  
  if (this.freeValidationsUsed > this.freeValidationsLimit) {
    this.freeValidationsUsed = this.freeValidationsLimit;
  }

 
  if (this.paidValidationsCount < 0) this.paidValidationsCount = 0;
  if (this.totalValidationsCount < 0) this.totalValidationsCount = 0;
  if (this.totalSpent < 0) this.totalSpent = 0;

  next();
});


userSchema.methods.useFreeValidation = async function() {
  if (this.freeValidationsUsed >= this.freeValidationsLimit) {
    throw new Error('No free validations remaining');
  }

  this.freeValidationsUsed += 1;
  this.totalValidationsCount += 1;
  await this.save();

  return this;
};


userSchema.methods.addPaidValidation = async function(amount) {
  this.paidValidationsCount += 1;
  this.totalValidationsCount += 1;
  this.totalSpent += amount;
  this.lastPaymentAt = new Date();
  await this.save();

  return this;
};


userSchema.methods.addIPAddress = async function(ip) {
  if (!this.ipAddresses.includes(ip)) {
    this.ipAddresses.push(ip);
    this.lastIP = ip;
    await this.save();
  }

  return this;
};


userSchema.methods.recordLogin = async function(ip) {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  
  if (ip) {
    this.lastIP = ip;
    if (!this.ipAddresses.includes(ip)) {
      this.ipAddresses.push(ip);
    }
  }

  await this.save();
  return this;
};


userSchema.methods.block = async function(reason = 'Manual block') {
  this.isBlocked = true;
  this.isActive = false;
  
  if (!this.metadata) {
    this.metadata = new Map();
  }
  
  this.metadata.set('blockReason', reason);
  this.metadata.set('blockedAt', new Date().toISOString());
  
  await this.save();
  return this;
};


userSchema.methods.unblock = async function() {
  this.isBlocked = false;
  this.isActive = true;
  
  if (this.metadata) {
    this.metadata.delete('blockReason');
    this.metadata.set('unblockedAt', new Date().toISOString());
  }
  
  await this.save();
  return this;
};


userSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  this.isActive = false;
  await this.save();
  return this;
};


userSchema.methods.restore = async function() {
  this.deletedAt = null;
  this.isActive = true;
  await this.save();
  return this;
};


userSchema.methods.isAdmin = function() {
  return this.role === USER_ROLES.ADMIN || this.role === USER_ROLES.SUPER_ADMIN;
};


userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    freeValidationsRemaining: this.freeValidationsRemaining,
    freeValidationsUsed: this.freeValidationsUsed,
    paidValidationsCount: this.paidValidationsCount,
    totalValidationsCount: this.totalValidationsCount,
    isActive: this.isActive,
    isBlocked: this.isBlocked,
    isVerified: this.isVerified,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt
  };
};


userSchema.statics.findActive = function() {
  return this.find({ 
    isActive: true, 
    isBlocked: false,
    deletedAt: null 
  });
};


userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase().trim(),
    deletedAt: null
  });
};


userSchema.statics.findByIP = function(ip) {
  return this.find({ 
    ipAddresses: ip,
    deletedAt: null 
  });
};


userSchema.statics.countByIP = function(ip) {
  return this.countDocuments({ 
    ipAddresses: ip,
    deletedAt: null
  });
};


userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { deletedAt: null }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        blockedUsers: {
          $sum: { $cond: [{ $eq: ['$isBlocked', true] }, 1, 0] }
        },
        totalValidations: { $sum: '$totalValidationsCount' },
        totalRevenue: { $sum: '$totalSpent' }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    totalValidations: 0,
    totalRevenue: 0
  };
};


userSchema.statics.findSuspiciousAccounts = async function(minAccountsPerIP = 3) {
  const pipeline = [
    { $match: { deletedAt: null } },
    { $unwind: '$ipAddresses' },
    {
      $group: {
        _id: '$ipAddresses',
        users: { $push: { id: '$_id', email: '$email', name: '$name' } },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gte: minAccountsPerIP } } },
    { $sort: { count: -1 } }
  ];

  return this.aggregate(pipeline);
};


userSchema.pre(/^find/, function(next) {
  
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});


userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});


userSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

export default User;