const User = require('../models/userSchema')

const wishlistCountMiddleware = async (req, res, next) => {
  const userId = req.session.user;
  console.log("User:",userId)
  let wishlistCount = 0;

  if (userId) {
    try {
      const user = await User.findById(userId).select('wishlist').lean();
      wishlistCount = user ? user.wishlist.length : 0;
    } catch (err) {
      console.error('Error fetching wishlist count:', err);
    }
  }
  console.log("Wish list count:",wishlistCount)
  res.locals.wishlistCount = wishlistCount;
//   res.locals.wishlistCount = "Hi"
  next();
};

module.exports = wishlistCountMiddleware;
