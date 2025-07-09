const express = require("express")
const env = require('dotenv').config();
const path=require("path")
const session = require('express-session');
const passport = require('./config/passport');
const app= express()
const connectDB = require("./config/db");
const userRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const Cart = require('./models/cartSchema');       
const Product = require('./models/productSchema');
connectDB()

app.use(express.json())
app.use(express.urlencoded({extended:true}))


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false, httpOnly: true, maxAge: 72 * 60 * 60 * 1000 },
      }),
    )
    
app.use((req,res,next) => {
    res.set('Cache-Control','no-store')
    next();
})
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to add cart data to res.locals
app.use(async (req, res, next) => {
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
            if (!product) return null;
  
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
  });


app.use('/',userRouter)
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 3999;
app.listen(PORT, () => {
    console.log('Server is running on port http://localhost:3000');
})


module.exports = app;