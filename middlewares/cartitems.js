const Cart = require('../models/cartSchema');       
const Product = require('../models/productSchema');
const User = require('../models/userSchema');

const cartItem=async (req, res, next) => {
    if (req.session.user) {
      try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).lean();
  
        let cartItems = [];
        let cartTotal = 0;
        let cartCount = 0;
  
        if (cart && cart.items.length > 0) {
          // Fetch product details for each cart item
          cartItems = await Promise.all(cart.items.map(async item => {
            const product = await Product.findById(item.productId).lean();
            if (!product || product.isBlocked) return null;
  
            cartTotal += product.finalPrice * item.quantity;
            cartCount += item.quantity;
  
            return {
              name: product.name,
              image: product.images[0],
              quantity: item.quantity,
              price: product.finalPrice,
              totalPrice: product.finalPrice * item.quantity,
              _id: product._id,
              size: item.size,
              color: item.color
            };
          }));
  
          cartItems = cartItems.filter(i => i !== null); // remove missing products
        }
  
        res.locals.cartItems = cartItems;
        res.locals.cartTotal = cartTotal;
        res.locals.cartCount = cartCount;
  
      } catch (error) {
        console.error('Error loading cart middleware:', error);
        res.locals.cartItems = [];
        res.locals.cartTotal = 0;
        res.locals.cartCount = 0;
      }
    } else {
      // No user logged in, empty cart data
      res.locals.cartItems = [];
      res.locals.cartTotal = 0;
      res.locals.cartCount = 0;
    }
    next();
  }


module.exports=cartItem

