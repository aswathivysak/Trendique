const express = require("express")
const router = express.Router();
const passport = require('passport');
const userController=require("../controllers/user/userController")
const profileController = require("../controllers/user/profileController")
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

//Profile management
router.get("/forgot-password",profileController.getForgotPassPage )
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);



module.exports=router