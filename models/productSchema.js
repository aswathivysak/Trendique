const mongoose = require('mongoose');
const { Schema } = mongoose;

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

  discount: {
    type: Number, // Product-level discount (%)
    default: 0
  },

  finalPrice: {
    type: Number,
    required: true, // Final price after discount (can be calculated or saved)
  },

  stock: {
    type: Number,
    required: true,
    min: 0
  },
  color: {
    type: [String],// example: ["Red", "Black"]
    required:true,
    default: []
  },

  size: {
    type: [String], // example: ["S", "M", "L", "XL"]
    required:true,
    default: []
  },

  fit: {
    type: String, // example: "Regular", "Slim", "Loose"
    default: "Regular"
  },

  material: {
    type: String, // example: "Cotton", "Denim"
    
    default: "Cotton"
  },
  gender: {
    type: String,
    enum: ['Men', 'Women'],
    required: true
  },

  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },

  // salePrice: {
  //   type: Number,
  //   required: true
  // },
  
  brand: {
    type: String,
    required: true,

  },

  images: [{
    type: String ,// Image filenames or URLs
    required :true,

  }],

  isFeatured: {
    type: Boolean,
    default: false
  },

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
    type: String,
    default : 0 // Optional: '20% Off', 'BOGO', 'Flat ₹200 Off'
  },

  offerValidUntil: {
    type: Date
  },
  status:{
    type: String,
    enum:['available','out of stock','Discontinued'],
    required: true,
    default: 'available'
},

  createdAt: {
    type: Date,
    default: Date.now
  }
},{timestamps: true});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
