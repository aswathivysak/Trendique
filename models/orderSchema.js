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
        finalPrice: {
            type: Number,
            required: true,
          },
        size: {
            type: String,
            
            required: true,
          },
        color: {
            type: String,
            required: true,
          },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returning', 'returned','failed'],
            default: 'pending'
        }, 
        cancellationReason: {
            type: String,
            default: "",
          },
        returnReason: {   
            type: String,
            default: "",
          },
        deliveredOn: {
            type: Date
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
        default: 0
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
        enum: ["cod", "wallet", "razorpay"],
        default: "cod",
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      invoiceDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returning', 'returned','failed'],
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
    appliedCoupon: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    
},{
    timestamps: true 
  });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;