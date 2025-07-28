const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
  },

  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },

  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },

  subcategory: {
    type: String, 
    required: true,
     
  },

  isFeatured: {
    type: Boolean,
    default: false,
  },

  isBlocked: {
    type: Boolean,
    default: false,
  },

  offer: {
    type: String,
    default: '',
  },

  offerValidUntil: {
    type: Date,
  },

  status: {
    type: String,
    enum: ['available', 'out of stock', 'discontinued'],
    default: 'available',
    required: true,
  },

}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const productVariantSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  color: {
    type: String,
    required: true,
  },

  size: {
    type: String,
    required: true,
  },

  fit: {
    type: String,
    default: 'Regular',
  },

  material: {
    type: String,
    default: 'Cotton',
  },

  price: {
    type: Number,
    required: true,
  },

  discount: {
    type: Number,
    default: 0,
  },

  finalPrice: {
    type: Number,
    required: true,
  },

  stock: {
    type: Number,
    required: true,
    min: 0,
  },

  images: [{
    type: String,  // filenames or URLs
    required: true,
  }],

  ratings: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: String,
    createdOn: {
      type: Date,
      default: Date.now,
    },
  }],

  isBlocked: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

}, { timestamps: true });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

module.exports = {
  Product,
  ProductVariant,
};

