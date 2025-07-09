const mongoose = require('mongoose');
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items:[{
        productId:{
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity:{
            type: Number,
            default: 1
        },
        price:{
            type: Number,
            required: true
        },
        totalPrice:{
            type: Number,
            required: true
        },  
        size: {
            type: String,
            required: false
        },
        color: {
            type: String,
            required: false
        },
        status:{
            type:String,
            default:'placed'
        },
        cancellationReason:{
            type:String,
            default:"none"
        }

      
    }], createdAt: {
        type: Date,
        default: Date.now
      }
})

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;