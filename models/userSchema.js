const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    phone:{
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId:{
        type: String,
        unique: true,
    },
    password:{
        type: String,
        required: false,
    },
    username: {
        type:String,
        required:false
    },
    isBlocked:{
        type: Boolean,
        default: false     
    },
    isAdmin:{
        type: Boolean,
        default: false     
    },
    profilePicture:{
        type:String,
        required:false
    },
    wishlist:[{
        type: Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
   
    wallet:{
        type: Number,
        default: 0
    },
    walletTransactions: [
        {
            date: {type: Date, default: Date.now},
            status: String, // e.g., "Added", "Refund", "Used for Order"
            amount: Number,
            method: {type: String, enum: ['razorpay', 'order', 'refund', 'admin', 'reward'], default: 'order'},
            description: {type: String}
        }
        ],
    history: [
        {
            amount: Number,
            status: String,
            date: Date
        }
        ],
    referalCode: {
            type: String,
            unique: true,
            sparse: true
          },
    redeemed: {
            type: Boolean,
            default: false
          },
    redeemedUsers: [{
            type: Schema.Types.ObjectId,
            ref: "User"
        }],
    referredBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
          },    
    
    orderHistory:[{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    createdOn:{
        type: Date,
        default: Date.now
    },

    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
      },
   
    searchHistory:[{
        category:{
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },
        brand:{
            type: String
        },
        searchOn:{
            type: Date,
            default: Date.now
        }
    }]

})

const User = mongoose.model('User',userSchema);

module.exports = User;