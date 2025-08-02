const express = require("express")
const env = require('dotenv').config();
const path=require("path")
const session = require('express-session');
const passport = require('./config/passport');
const app= express()
const connectDB = require("./config/db");
const userRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const wishlistCountMiddleware = require('./middlewares/wishlistCount');
const cartItem = require('./middlewares/cartitems');
require('./utils/offerCron');


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


app.use(wishlistCountMiddleware);
app.use(cartItem);
app.use('/',userRouter)
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 3999;
app.listen(PORT, () => {
    console.log('Server is running on port http://localhost:3000');
})


module.exports = app;