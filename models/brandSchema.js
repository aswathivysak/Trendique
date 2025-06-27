const mongoose = require('mongoose');
const { Schema } = mongoose;

const brandSchema = new Schema({
  brandName: {
    type: String,
    required: true,
    trim: true,
  },
  brandImage: {
    type: [String], // Use String if you want only one image
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  offer: {
    type: Number, // Discount percentage, e.g. 10 for 10% off
    default: null,
    min: 0,
    max: 100,
  },
  offerValidFrom: {
    type: Date,
    default:null,
  },
  offerValidUntil: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Optional: Index brandName for faster search
// brandSchema.index({ brandName: 1 });

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
