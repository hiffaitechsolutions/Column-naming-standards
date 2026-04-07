import mongoose from 'mongoose';

const classwordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  classwordsName: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0'
  },
  description: String,
 
  definitions: [{
    classword: { type: String, required: true },  
    description: String,
    baseDatatype: String,
    defaultLength: Number,
    defaultMinLength: Number,
    defaultMaxLength: Number,
    defaultMinValue: mongoose.Schema.Types.Mixed,
    defaultMaxValue: mongoose.Schema.Types.Mixed,
    defaultNullable: Boolean,
    defaultRequired: Boolean,
    defaultAllowedValues: [String],
    defaultPattern: String,
    defaultRegex: String,
    category: String,
    tags: [String],
    examples: [String],
    customProperties: { type: Map, of: mongoose.Schema.Types.Mixed }
  }],
  totalDefinitions: {
    type: Number,
    default: 0
  },
  sheetName: String,
  sheetIndex: Number,
  headerRow: Number,
  isParsed: {
    type: Boolean,
    default: false
  },
  parseError: String,
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  deletedAt: Date
}, {
  timestamps: true
});


classwordSchema.index({ userId: 1, createdAt: -1 });
classwordSchema.index({ isParsed: 1 });
classwordSchema.index({ deletedAt: 1 });
classwordSchema.index({ 'definitions.classword': 1 });


classwordSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});


classwordSchema.methods.getDefinition = function(classword) {
  return this.definitions.find(def =>
    def.classword.toLowerCase() === classword.toLowerCase()
  );
};

classwordSchema.methods.hasClassword = function(classword) {
  return this.definitions.some(def =>
    def.classword.toLowerCase() === classword.toLowerCase()
  );
};

classwordSchema.methods.getClasswordNames = function() {
  return this.definitions.map(def => def.classword);
};

classwordSchema.methods.getDefinitionsByCategory = function(category) {
  return this.definitions.filter(def => def.category === category);
};

classwordSchema.methods.getDefinitionsByDatatype = function(datatype) {
  return this.definitions.filter(def => def.baseDatatype === datatype);
};

classwordSchema.methods.searchDefinitions = function(searchTerm) {
  const term = searchTerm.toLowerCase();
  return this.definitions.filter(def =>
    def.classword.toLowerCase().includes(term) ||
    (def.description && def.description.toLowerCase().includes(term))
  );
};

classwordSchema.methods.recordUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

classwordSchema.methods.markAsParsed = function() {
  this.isParsed = true;
  this.parseError = undefined;
  return this.save();
};

classwordSchema.methods.markParseError = function(error) {
  this.isParsed = false;
  this.parseError = error;
  return this.save();
};

classwordSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

classwordSchema.methods.restore = function() {
  this.deletedAt = undefined;
  return this.save();
};

classwordSchema.methods.getSummary = function() {
  return {
    id: this._id,
    classwordsName: this.classwordsName,
    version: this.version,
    totalDefinitions: this.totalDefinitions,
    isParsed: this.isParsed,
    usageCount: this.usageCount,
    createdAt: this.createdAt
  };
};

classwordSchema.methods.validateDefinitions = function() {
  const errors = [];
  const seen = new Set();

  this.definitions.forEach((def, index) => {
    
    if (seen.has(def.classword.toLowerCase())) {
      errors.push(`Duplicate classword: ${def.classword}`);
    }
    seen.add(def.classword.toLowerCase());

    
    if (def.defaultMinLength && def.defaultMaxLength &&
        def.defaultMinLength > def.defaultMaxLength) {
      errors.push(`${def.classword}: minLength > maxLength`);
    }

    if (def.defaultMinValue !== null && def.defaultMaxValue !== null &&
        def.defaultMinValue > def.defaultMaxValue) {
      errors.push(`${def.classword}: minValue > maxValue`);
    }

 
    if (def.defaultRegex) {
      try {
        new RegExp(def.defaultRegex);
      } catch (e) {
        errors.push(`${def.classword}: Invalid regex`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

classwordSchema.methods.getCategories = function() {
  const categories = new Set();
  this.definitions.forEach(def => {
    if (def.category) categories.add(def.category);
  });
  return Array.from(categories);
};


classwordSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

classwordSchema.statics.findParsed = function(userId) {
  return this.find({ userId, isParsed: true }).sort({ createdAt: -1 });
};

classwordSchema.statics.searchClassword = function(classwordName, userId) {
  return this.find({
    userId,
    'definitions.classword': new RegExp(classwordName, 'i')
  });
};

classwordSchema.statics.getStatistics = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        parsed: { $sum: { $cond: ['$isParsed', 1, 0] } },
        totalDefinitions: { $sum: '$totalDefinitions' },
        avgDefinitions: { $avg: '$totalDefinitions' },
        totalUsage: { $sum: '$usageCount' }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    parsed: 0,
    totalDefinitions: 0,
    avgDefinitions: 0,
    totalUsage: 0
  };
};

const Classword = mongoose.model('Classword', classwordSchema);

export default Classword;