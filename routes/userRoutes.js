const express = require("express")
const router = express.Router();
const passport = require('passport');
const userController=require("../controllers/user/userController")

router.get('/pagenotfound', userController.pageNotFound);
router.get('/', userController.loadHomePage);

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
router.get('/login',userController.loadLoginPage);
router.post('/login',userController.login);
router.get('/logout', userController.logout);



module.exports=router