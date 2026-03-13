import mongoose from 'mongoose';

/**
 * Abbreviation Model
 * ──────────────────
 * Stores a parsed abbreviations file uploaded by the user.
 * Each document = one uploaded file with all its abbreviation entries.
 *
 * File placement: models/Abbreviation.js
 */

// ── Sub-schema for each abbreviation entry ────────────────────────────────────
const abbreviationDefinitionSchema = new mongoose.Schema({
  abbreviation: {
    type:     String,
    required: true,
    trim:     true,
  },
  fullWord: {
    type:     String,
    required: true,
    trim:     true,
  },
  category: {
    type:    String,
    trim:    true,
    default: 'General',
  },
  notes: {
    type:    String,
    trim:    true,
    default: '',
  },
}, { _id: false }); // no separate _id per definition — keeps docs lean

// ── Main schema ───────────────────────────────────────────────────────────────
const abbreviationSchema = new mongoose.Schema({

  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  filename: {
    type:     String,
    required: true,
    trim:     true,
  },

  filepath: {
    type:     String,
    required: true,
    trim:     true,
  },

  definitions: [abbreviationDefinitionSchema],

  totalCount: {
    type:    Number,
    default: 0,
    min:     0,
  },

}, {
  timestamps: true,   // adds createdAt, updatedAt automatically
  collection: 'abbreviations',
});

// ── Indexes ───────────────────────────────────────────────────────────────────
abbreviationSchema.index({ userId: 1, createdAt: -1 });

// ── Pre-save: sync totalCount with definitions length ─────────────────────────
abbreviationSchema.pre('save', function (next) {
  this.totalCount = this.definitions?.length || 0;
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Returns a Set of all approved abbreviation strings for fast O(1) lookup.
 * Includes original, lowercase, and uppercase variants.
 */
abbreviationSchema.methods.toAbbreviationSet = function () {
  const set = new Set();
  for (const def of this.definitions) {
    if (def.abbreviation) {
      set.add(def.abbreviation.trim());
      set.add(def.abbreviation.trim().toLowerCase());
      set.add(def.abbreviation.trim().toUpperCase());
    }
  }
  return set;
};

/**
 * Returns definitions filtered by category.
 */
abbreviationSchema.methods.getByCategory = function (category) {
  return this.definitions.filter(
    d => d.category?.toLowerCase() === category.toLowerCase()
  );
};

/**
 * Returns list of unique categories in this file.
 */
abbreviationSchema.methods.getCategories = function () {
  return [...new Set(this.definitions.map(d => d.category).filter(Boolean))];
};

// ── Static methods ────────────────────────────────────────────────────────────

/**
 * Get the most recently uploaded abbreviations file for a user.
 * Used by validation route as the automatic default.
 */
abbreviationSchema.statics.findLatestForUser = function (userId) {
  return this.findOne({ userId }).sort({ createdAt: -1 });
};

/**
 * Get summary list (no definitions array) for a user — for listing in UI.
 */
abbreviationSchema.statics.findAllForUser = function (userId) {
  return this.find({ userId })
    .select('-definitions')
    .sort({ createdAt: -1 });
};

// ── JSON transform ────────────────────────────────────────────────────────────
abbreviationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Abbreviation = mongoose.model('Abbreviation', abbreviationSchema);
export default Abbreviation;