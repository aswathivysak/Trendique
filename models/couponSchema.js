const mongoose = require('mongoose');
const {Schema} = mongoose;

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
       
     },
    code:{
        type: String,
        required: true,
        unique: true,
      
    },
    startingDate:{
        type: Date,
        default: Date.now,
        required: true
    },
    expiryDate:{
        type: Date,
        required: true
    },
    offerPrice:{
        type: Number,
        required: true
    },
    minimumPrice:{
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed'
      },
      
    status:{
        type: Boolean,
        default: true
    },
    usageLimit: { type: Number, default: 1 },
    usagePerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 }, 
    usedUsers: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          count: { type: Number, default: 0 } // How many times this user used it
        }
      ],
        
})

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;