const mongoose = require('mongoose');
const { Schema } = mongoose;

const variantSchema = new Schema({
  color: { type: String, required: true },
  size: { type: String, required: true, default: 'M' },
  quantity: { type: Number, required: true, min: 0 }
});

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  finalPrice: {
    type: Number,
    required: true,
  },
  baseFinalPrice: {type: Number},
  discount: {
    type: Number, 
    default: 0
  },
  material: {
    type: String, // example: "Cotton", "Denim"
    
    default: "Cotton"
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: String, 
    required: true,
     
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  images: [{
    type: String ,
    required :true,

  }],
  isBlocked: {
    type: Boolean,
    default: false
  },

  ratings: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdOn: {
      type: Date,
      default: Date.now
    }
  }],

  offer: {
    type: Number,
    default : '' // Optional: '20% Off', 'BOGO', 'Flat ₹200 Off'
  },

  offerValidUntil: {
    type: Date
  },
  status:{
    type: String,
    required: true,
    default: 'available'
},
variants: [variantSchema] ,
 createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
},{timestamps: true});

const Product = mongoose.model('Product', productSchema);
module.exports = Product


