const express = require("express")
const router = express.Router();
const passport = require('passport');
const userController=require("../controllers/user/userController")
const profileController = require("../controllers/user/profileController")
const cartController = require("../controllers/user/cartController")
const productController = require("../controllers/user/productController")
const orderController = require("../controllers/user/orderController")
const wishlistController = require("../controllers/user/wishlistController")
const walletController = require("../controllers/user/walletController")
const {userAuth} = require("../middlewares/auth")

const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/profile");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});

const uploads = multer({ storage: storage });
//Error management
router.get('/pagenotfound', userController.pageNotFound);

//Signup management
router.get('/signup', userController.loadSignUpPage);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async (req, res) => {
    try {
        req.session.user = req.user._id;
        res.redirect('/');
    } catch (error) {
        console.log("Google login error:", error);
        res.redirect('/signup');
    }
});

//Login Management
router.get('/login',userController.loadLoginPage);
router.post('/login',userController.login);
router.get('/logout', userController.logout);

//Home management
router.get('/', userController.loadHomePage);
router.get('/about', userController.about);
router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userController.filterProduct);
router.get("/productDetails",productController.productDetails);

//Profile management
router.get("/forgot-password",profileController.getForgotPassPage )
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);
router.get('/userProfile',userAuth,profileController.userProfile);
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.post('/updateProfile', userAuth,profileController.updateProfile);
router.get("/change-password", userAuth, profileController.getChangePassword);
router.post("/change-password", userAuth, profileController.changePassword);
router.post("/upload-profile-pic",userAuth,uploads.single("profileImage"), profileController.changeProfilePic)

//Address Management
router.get("/addAddress", userAuth, profileController.getAddAddress);
router.post('/add-address', userAuth, profileController.addAddress)
router.get("/editAddress", userAuth, profileController.getEditAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

//Cart Management
router.get("/cart", userAuth, cartController.getCartPage);
router.post("/addToCart",userAuth, cartController.addToCart)
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
router.post("/removeCartItem", userAuth, cartController.deleteProduct);

//Order management
router.get("/checkout", userAuth, orderController.getCheckoutPage)
router.post('/placeOrder',userAuth, orderController.placeOrder)
router.get('/order-success/:orderId', userAuth, orderController.getOrderSuccessPage);
router.get('/viewOrderDetails/:orderId', userAuth, orderController.viewOrderDetails)
 router.post("/verifyPayment", userAuth, orderController.verifyPayment);
router.post('/paymentConfirm',userAuth, orderController.paymentConfirm);

router.post("/cancelOrder",userAuth,orderController.cancelOrder);
router.post('/orders/return-request', userAuth, orderController.returnRequest);
// router.get('/orders/download-invoice/:orderId', userAuth, orderController.getInvoice)
router.get('/orders/download-invoice', userAuth,orderController.generateInvoice);
router.get('/available-coupons', userAuth, orderController.getAvailableCoupons)
router.post('/apply-coupon', userAuth, orderController.applyCoupon)
router.get('/cancel-coupon', userAuth, orderController.deleteCoupon)

//Wishlist management
router.get("/wishlist", userAuth,wishlistController.loadWishlist);
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);
router.get("/removeFromWishlist", userAuth, wishlistController.removeProduct);
router.post("/wishlist/addToCart", userAuth, wishlistController.addToCartWish);

//Wallet management
router.post("/createWalletOrder", userAuth, walletController.addMoneyToWallet);
router.post("/verifyWalletPayment", userAuth, walletController.verify_payment)


module.exports=router