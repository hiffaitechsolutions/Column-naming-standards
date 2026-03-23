import mongoose from 'mongoose';

const standardSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename:         { type: String, required: true },
  originalFilename: { type: String, required: true },
  filepath:         { type: String, required: true },
  fileSize:         { type: Number, required: true },
  mimeType:         { type: String, required: true },
  standardsName:    { type: String, required: true },
  version:          { type: String, default: '1.0' },
  description:      String,

  
  columns: [{
    columnName:      { type: String, required: true },
    classword:       String,
    datatype:        String,
    length:          Number,
    minLength:       Number,
    maxLength:       Number,
    minValue:        mongoose.Schema.Types.Mixed,
    maxValue:        mongoose.Schema.Types.Mixed,
    nullable:        { type: Boolean, default: false },
    required:        { type: Boolean, default: true },
    unique:          { type: Boolean, default: false },
    allowedValues:   [String],
    pattern:         String,
    regex:           String,
    isClasswordRule: { type: Boolean, default: false },
    customRules:     { type: Map, of: mongoose.Schema.Types.Mixed },
    description:     String,
  }],

  totalColumns: { type: Number, default: 0 },
  sheetName:    String,
  sheetIndex:   Number,
  headerRow:    Number,
  isParsed:     { type: Boolean, default: false },
  parseError:   String,
  usageCount:   { type: Number, default: 0 },
  lastUsedAt:   Date,
  metadata:     { type: Map, of: mongoose.Schema.Types.Mixed },
  deletedAt:    Date,
}, { timestamps: true });

standardSchema.index({ userId: 1, createdAt: -1 });
standardSchema.index({ isParsed: 1 });
standardSchema.index({ deletedAt: 1 });
standardSchema.index({ 'columns.columnName': 1 });

standardSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
  next();
});

standardSchema.methods.getColumnRule    = function (n) { return this.columns.find(c => c.columnName.toLowerCase() === n.toLowerCase()); };
standardSchema.methods.hasColumn        = function (n) { return this.columns.some(c => c.columnName.toLowerCase() === n.toLowerCase()); };
standardSchema.methods.getColumnNames   = function ()  { return this.columns.map(c => c.columnName); };
standardSchema.methods.getClasswordRules= function ()  { return this.columns.filter(c => c.isClasswordRule); };
standardSchema.methods.recordUsage      = function ()  { this.usageCount++; this.lastUsedAt = new Date(); return this.save(); };
standardSchema.methods.markAsParsed     = function ()  { this.isParsed = true; this.parseError = undefined; return this.save(); };
standardSchema.methods.markParseError   = function (e) { this.isParsed = false; this.parseError = e; return this.save(); };
standardSchema.methods.softDelete       = function ()  { this.deletedAt = new Date(); return this.save(); };
standardSchema.methods.restore          = function ()  { this.deletedAt = undefined; return this.save(); };
standardSchema.methods.getSummary       = function ()  {
  return { id: this._id, standardsName: this.standardsName, version: this.version,
           totalColumns: this.totalColumns, isParsed: this.isParsed,
           usageCount: this.usageCount, createdAt: this.createdAt };
};

standardSchema.statics.findByUser  = function (userId) { return this.find({ userId }).sort({ createdAt: -1 }); };
standardSchema.statics.findParsed  = function (userId) { return this.find({ userId, isParsed: true }).sort({ createdAt: -1 }); };

const Standard = mongoose.model('Standard', standardSchema);
export default Standard;