const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: { 
            type: String,
            required: true
        },
        productImages: [{ 
            type: String
        }],
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        regularPrice: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returning', 'returned'],
            default: 'pending'
        },
      
    }],
    subTotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    deliveryCharge: {
        type: Number,
        default: 50
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: Schema.Types.Mixed,
        required: true
      },
      
    paymentMethod: {
        type: String,
        enum: ['cod', 'online', 'wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returning', 'returned'],
        default: 'pending'
    },
    
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    updatedOn: {
        type: Date,
    },
    deliveredOn: {
        type: Date
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponCode: { type: String }


},{
    timestamps: true 
  });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;