const mongoose = require('mongoose');
const { Schema } = mongoose;
const subcategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // store filename or full image path
    required: false,
    trim: true
  },
  offer: {
    type: Number, // percentage (e.g., 10 for 10% off)
    min: 0,
    max: 100,
    default: 0
  },
  isListed: {
    type: Boolean,
    default: true
  },
  offerValidUntil: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Women'], // Change to ['Women', 'Men'] if needed
    required: true
  },
 
  categoryImage: {
    type: String,
    required: true, // ensures image is uploaded
    trim: true
  },
  subcategories: [subcategorySchema],
  isListed: {
    type: Boolean,
    default: true
  },
  categoryOffer: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  offerValidUntil: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

categorySchema.index({ createdAt: -1 }); // indexing for fast sort

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
