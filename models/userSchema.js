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
   
    wallet:{
        type: Number,
        default: 0
    },
    // wishlist:[{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Product'
    // }],
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